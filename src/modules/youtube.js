const axios = require('axios');
const fetch = require('node-fetch');
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const fs = require('fs');
const { Console } = require('console');

const CONFIG = {
    API_URLS: {
        info: 'https://cdn51.savetube.me/info?url=',
        progress: 'https://p.oceansaver.in/ajax/progress.php?id=',
        download: 'https://p.oceansaver.in/ajax/download.php?format=',
        videoInfo: 'https://downloader.freemake.com/api/videoinfo/',
        ytDislikes: 'https://returnyoutubedislikeapi.com/votes?videoId=',
        ytSearch: 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
        ytDownload: 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json',
        browse: 'https://www.youtube.com/youtubei/v1/browse',
        ytUrlwatch: 'https://www.youtube.com/watch?v=',
        ytUrl: 'https://www.youtube.com'
    },
    FORMATS: ['360', 'mp3'], // '480', '720', '1080',
    ANY4K_FORMATS: ['360p', 'audio_m4a'], // '1080p', '720p', '480p',
    TIMEOUTS: {
        downloadProgress: 120000,
        apiRetry: 2000,
        maxRetries: 2
    }
};

async function isValidDownloadUrl(url) {
    try {
        const { status } = await axios.head(url, { timeout: 5000 });
        return status === 200;
    } catch {
        return false;
    }
}

async function checkProgress({ id, format, system, abortController, timeoutMs = CONFIG.TIMEOUTS.downloadProgress }) {
    const isConfig = system === 'config';
    const progressUrl = isConfig ? `${CONFIG.API_URLS.progress}${id}` : `https://api.any4k.com/v1/dlp/download_progress?id=${id}`;
    const downloadLink = isConfig ? null : `https://api.any4k.com/v1/file/o?i=${id}`;
    const startTime = Date.now();

    if (isConfig) {
        while (true) {
            if (abortController.signal.aborted) {
                return null;
            }

            try {
                const { data: { progress, success, download_url } } = await axios.get(progressUrl, { signal: abortController.signal });

                if (progress === 1000 && success === 1) {
                    if (download_url && await isValidDownloadUrl(download_url)) {
                        return download_url;
                    }
                    return null;
                }

                if (Date.now() - startTime > timeoutMs) {
                    return null;
                }

                await sleep(1000);
            } catch (error) {
                console.error(`Erro ao verificar progresso para ${format}:`, error.message);
                if (error.name === 'AbortError') return null;
                return null;
            }
        }
    } else {
        return new Promise((resolve, reject) => {
            if (abortController.signal.aborted) {
                return reject(new Error('Download cancelled'));
            }

            fetch(progressUrl, { signal: abortController.signal })
                .then(response => {
                    const stream = response.body;
                    let accumulatedData = '', lastProgress = 0;

                    stream.on('data', chunk => {
                        if (abortController.signal.aborted) {
                            stream.destroy();
                            reject(new Error('Download cancelled'));
                            return;
                        }

                        accumulatedData += chunk.toString();
                        const lines = accumulatedData.split('\n');
                        accumulatedData = lines.pop();

                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                lastProgress = parseFloat(line.replace('data:', '').trim());
                            }
                        }
                    });

                    stream.on('end', () => {
                        if (lastProgress === 100) {
                            resolve(downloadLink);
                        } else {
                            reject(new Error(`Stream ended with incomplete progress (${format}): ${lastProgress}%`));
                        }
                    });

                    stream.on('error', err => {
                        console.error(`Erro no stream para ${format}:`, err.message);
                        reject(err);
                    });
                })
                .catch(err => {
                    console.error(`Erro ao buscar progresso para ${format}:`, err.message);
                    if (err.name === 'AbortError') return reject(new Error('Download aborted'));
                    reject(err);
                });
        });
    }
}

async function processFormat({ format, videoUrl, system, abortController }) {
    const isConfig = system === 'config';
    const validFormats = isConfig ? CONFIG.FORMATS : CONFIG.ANY4K_FORMATS;
    if (!validFormats.includes(format)) {
        return { format, url: null };
    }

    const apiUrl = isConfig ? `${CONFIG.API_URLS.download}${format}&url=${videoUrl}` : 'https://api.any4k.com/v1/dlp/download';
    const any4kPayload = {
        appVer: "1.0", bundleId: "OK", country: "US", deviceId: "00000000000000000000000000000000",
        format: { '1080p': '137+140', '720p': '136+140', '480p': '135+140', '360p': '134+140', 'audio_m4a': '140' }[format],
        lang: "en", platform: "Web", sysVer: "1.0", url: videoUrl
    };

    for (let attempts = 0; attempts < CONFIG.TIMEOUTS.maxRetries; attempts++) {
        if (abortController.signal.aborted) {
            return { format, url: null };
        }

        try {
            const response = await (isConfig
                ? axios.get(apiUrl, { signal: abortController.signal })
                : axios.post(apiUrl, any4kPayload, { signal: abortController.signal }));
            const downloadId = response.data.id;

            if (!downloadId) {
                await sleep(CONFIG.TIMEOUTS.apiRetry);
                continue;
            }

            const downloadUrl = await checkProgress({ id: downloadId, format, system, abortController });
            if (downloadUrl) return { format, url: downloadUrl };
            return { format, url: null };
        } catch (error) {
            //console.error(`Erro ao processar ${format} (tentativa ${attempts + 1}):`, error.message);
            if (error.name === 'AbortError') return { format, url: null };
            if (attempts < CONFIG.TIMEOUTS.maxRetries - 1) await sleep(CONFIG.TIMEOUTS.apiRetry);
        }
    }

    return { format, url: null };
}

async function initCombinedDownload(videoUrl, isAudio = false) {
    const configAbort = new AbortController();
    const any4kAbort = new AbortController();
    const extractedUrl = extractVideoId(videoUrl);
    const results = { audio: { configResult: [], any4kResult: [] }, video: { configResult: [], any4kResult: [] } };
    const formatOptions = {
        configVideo: CONFIG.FORMATS.filter(f => f !== 'mp3'),
        any4kVideo: CONFIG.ANY4K_FORMATS.slice(0, -1),
        audio: { config: 'mp3', any4k: 'audio_m4a' }
    };

    try {
        const audioPromises = [
            processFormat({ format: formatOptions.audio.config, videoUrl: extractedUrl, system: 'config', abortController: configAbort })
                .then(r => (r.url ? [{ format: r.format, url: r.url }] : [])),
            processFormat({ format: formatOptions.audio.any4k, videoUrl: extractedUrl, system: 'any4k', abortController: any4kAbort })
                .then(r => (r.url ? [{ format: r.format, url: r.url }] : []))
        ];

        const configVideoPromises = formatOptions.configVideo.map(fmt =>
            processFormat({ format: fmt, videoUrl: extractedUrl, system: 'config', abortController: configAbort })
        );
        const any4kVideoPromises = formatOptions.any4kVideo.map(fmt =>
            processFormat({ format: fmt, videoUrl: extractedUrl, system: 'any4k', abortController: any4kAbort })
        );

        const [audioResults, configVideoResults, any4kVideoResults] = await Promise.all([
            Promise.all(audioPromises),
            Promise.all(configVideoPromises),
            Promise.all(any4kVideoPromises)
        ]);

        results.audio.configResult = audioResults[0];
        results.audio.any4kResult = audioResults[1];
        results.video.configResult = configVideoResults.filter(r => r.url);
        results.video.any4kResult = any4kVideoResults.filter(r => r.url);

        return results;
    } catch (error) {
        console.error('Erro em initCombinedDownload:', error.message);
        return results;
    } finally {
        configAbort.abort();
        any4kAbort.abort();
    }
}

function extractVideoId(query) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|embed|shorts|user|channel|c)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = query.match(youtubeRegex);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : query;
}

// Function 1: play
async function play(q, format = 'audio') {
    q = extractVideoId(q);
    try {
        const apiUrl = CONFIG.API_URLS.ytSearch;
        const payload = {
            context: {
                client: {
                    hl: "pt",
                    gl: "BR",
                    deviceMake: "",
                    deviceModel: "",
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36,gzip(gfe)",
                    clientName: "WEB",
                    clientVersion: "2.20240628.01.00",
                    osName: "Windows",
                    osVersion: "10.0",
                    browserName: "Chrome",
                    browserVersion: "126.0.0.0",
                    screenWidthPoints: 1366,
                    screenHeightPoints: 305,
                    screenPixelDensity: 1,
                    screenDensityFloat: 1,
                    utcOffsetMinutes: -180,
                    userInterfaceTheme: "USER_INTERFACE_THEME_DARK",
                    memoryTotalKbytes: "4000000",
                    mainAppWebInfo: { graftUrl: `/results?search_query=${q}` }
                },
                request: { useSsl: true, internalExperimentFlags: [], consistencyTokenJars: [] },
                user: { lockedSafetyMode: false }
            },
            adSignalsInfo: {
                params: [
                    { key: "dt", value: "1719795187382" }, { key: "flash", value: "0" }, { key: "frm", value: "0" }, { key: "u_tz", value: "-180" },
                    { key: "u_his", value: "4" }, { key: "u_h", value: "768" }, { key: "u_w", value: "1366" }, { key: "u_ah", value: "768" },
                    { key: "u_aw", value: "1366" }, { key: "u_cd", value: "24" }, { key: "bc", value: "31" }, { key: "bih", value: "305" },
                    { key: "biw", value: "1349" }, { key: "brdim", value: "0,0,0,0,1366,0,1366,768,1366,305" }, { key: "vis", value: "1" },
                    { key: "wgl", value: "true" }, { key: "ca_type", value: "image" }
                ]
            },
            query: `${q}`,
            webSearchboxStatsUrl: `/search?oq=${q}&gs_l=youtube.3..0i512k1l4j0i22i30k1l10.115906.115906.1.116742.4.3.1.0.0.0.471.471.4-1.1.0....0...1ac.1.64.youtube..2.2.706....0.E9XetO-t4X4`
        };

        const response = await axios.post(apiUrl, payload);
        const contents = response.data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents[0];

        if (!contents.videoRenderer) throw new Error('Nenhum vídeo encontrado');

        const informacoes = contents.videoRenderer;
        const teste = informacoes.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer;

        const browsePayload = { context: payload.context, browseId: teste.navigationEndpoint.browseEndpoint.browseId };
        const browseResponse = await axios.post(`https://www.youtube.com/youtubei/v1/browse`, browsePayload);
        const jdijdwi = browseResponse.data;
        const get_canal = jdijdwi.header.pageHeaderRenderer;

        const info_canal = {
            title: get_canal?.pageTitle || 'Canal desconhecido',
            avatar: get_canal?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources || [],
            subscribers: get_canal?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows[1]?.metadataParts[0]?.text?.content || 'Desconhecido',
            totalVideos: get_canal?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows[1]?.metadataParts[1]?.text?.content || 'Desconhecido',
            description: get_canal?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content || 'Sem descrição',
            banner: get_canal?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources || [],
            keywords: jdijdwi?.metadata?.channelMetadataRenderer?.keywords || 'Nenhum',
            ownerUrls: jdijdwi?.metadata?.channelMetadataRenderer?.ownerUrls || [],
            channelUrl: jdijdwi?.metadata?.channelMetadataRenderer?.channelUrl || null,
            isFamilySafe: jdijdwi?.metadata?.channelMetadataRenderer?.isFamilySafe || false,
            tags: jdijdwi?.microformat?.microformatDataRenderer?.tags || [],
            vanityChannelUrl: jdijdwi?.metadata?.channelMetadataRenderer?.vanityChannelUrl || null,
            externalId: jdijdwi?.metadata?.channelMetadataRenderer?.externalId || null
        };

        if (!informacoes.title?.runs?.[0]?.text || !informacoes.videoId || !informacoes.thumbnail?.thumbnails) {
            throw new Error('Vídeo inválido');
        }

        const id_video = informacoes.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${id_video}`;
        const video = {
            title: informacoes.title.runs[0].text,
            videoId: id_video,
            url: videoUrl,
            thumbnails: informacoes.thumbnail.thumbnails || [],
            channel: informacoes.longBylineText?.runs?.[0]?.text || 'Canal desconhecido',
            channelUrl: informacoes.longBylineText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?
                `https://www.youtube.com${informacoes.longBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}` : '',
            duration: informacoes.lengthText?.simpleText || 'Desconhecido',
            durationAccessible: informacoes.lengthText?.accessibility?.accessibilityData?.label || 'Desconhecido',
            published: informacoes.publishedTimeText?.simpleText || 'Desconhecido',
            views: informacoes.viewCountText?.simpleText || 'Desconhecido',
            description: informacoes.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(run => run.text).join('') || 'Sem descrição',
            badges: informacoes.badges?.map(badge => badge.metadataBadgeRenderer?.label) || [],
            ownerBadges: informacoes.ownerBadges?.map(badge => badge.metadataBadgeRenderer?.label) || [],
            shortViewCount: informacoes.shortViewCountText?.simpleText || 'Desconhecido'
        };

        const { data: dislikeData } = await axios.get(`${CONFIG.API_URLS.ytDislikes}${id_video}`);

        const initCombined = await initCombinedDownload(videoUrl, format === 'mp3' || format.includes('audio'));

        const organizedResult = {
            status: 'success',
            video: {
                title: video.title,
                videoId: video.videoId,
                url: video.url,
                thumbnails: video.thumbnails,
                duration: video.duration,
                durationAccessible: video.durationAccessible,
                views: video.views,
                shortViewCount: video.shortViewCount,
                published: video.published,
                description: video.description,
                badges: video.badges,
                ownerBadges: video.ownerBadges
            },
            channel: {
                name: info_canal.title,
                url: info_canal.channelUrl,
                vanityUrl: info_canal.vanityChannelUrl,
                externalId: info_canal.externalId,
                avatar: info_canal.avatar,
                banner: info_canal.banner,
                subscribers: info_canal.subscribers,
                totalVideos: info_canal.totalVideos,
                description: info_canal.description,
                keywords: info_canal.keywords,
                ownerUrls: info_canal.ownerUrls,
                tags: info_canal.tags,
                isFamilySafe: info_canal.isFamilySafe
            },
            downloads: {
                audio: {
                    config: initCombined.audio.configResult,
                    any4k: initCombined.audio.any4kResult
                },
                video: {
                    config: initCombined.video.configResult,
                    any4k: initCombined.video.any4kResult
                }
            },
            stats: {
                likes: dislikeData.likes || 0,
                dislikes: dislikeData.dislikes || 0,
                rating: dislikeData.rating || 0,
                viewCount: dislikeData.viewCount || video.views,
                date: dislikeData.date || 'Desconhecido'
            }
        };

        return { status: true, result: organizedResult };
    } catch (error) {
        console.error(error);
        return { status: false, message: 'Ocorreu um erro, contate o suporte', error: error.message };
    }
}

// Helper function for play2: downloads
async function downloads(id_video) {
    try {
        const payload = {
            "videoId": id_video,
            "racyCheckOk": false,
            "contentCheckOk": false,
            "context": {
                "client": {
                    "hl": "pt",
                    "gl": "US",
                    "screenDensityFloat": 1,
                    "screenHeightPoints": 1440,
                    "screenPixelDensity": 1,
                    "screenWidthPoints": 2560,
                    "clientName": "iOS",
                    "clientVersion": "20.11.6",
                    "osName": "iOS",
                    "osVersion": "16.7.7.20H330",
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
                    "platform": "MOBILE",
                    "timeZone": "America/Sao_Paulo",
                    "originalUrl": "https://www.youtube.com",
                    "deviceMake": "Apple",
                    "deviceModel": "iPhone10,4",
                    "utcOffsetMinutes": -180,
                    "memoryTotalKbytes": "8000000"
                }
            }
        }
        const response = await axios.post(CONFIG.API_URLS.ytDownload, payload);
        const resultados = response.data;

        const results = {
            streamingData: resultados?.streamingData || null,
            captions: resultados?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null
        };

        return resultados
    } catch (e) {
        console.error("Erro:", e);
    }
}

// Modified extractVideoId for play2 to use a different URL base
function extractVideoIdForPlay2(query) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|embed|shorts|user|channel|c)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = query.match(youtubeRegex);
    return match ? CONFIG.API_URLS.ytUrlwatch + match[1] : query;
}

// Function 2: play2
async function play2(q) {
    q = extractVideoIdForPlay2(q);
    try {
        const apiUrl = CONFIG.API_URLS.ytSearch;
        const payload = {
            context: {
                client: {
                    hl: "pt",
                    gl: "BR",
                    deviceMake: "",
                    deviceModel: "",
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36,gzip(gfe)",
                    clientName: "WEB",
                    clientVersion: "2.20240628.01.00",
                    osName: "Windows",
                    osVersion: "10.0",
                    browserName: "Chrome",
                    browserVersion: "126.0.0.0",
                    screenWidthPoints: 1366,
                    screenHeightPoints: 305,
                    screenPixelDensity: 1,
                    screenDensityFloat: 1,
                    utcOffsetMinutes: -180,
                    userInterfaceTheme: "USER_INTERFACE_THEME_DARK",
                    memoryTotalKbytes: "4000000",
                    mainAppWebInfo: { graftUrl: `/results?search_query=${q}` }
                },
                request: { useSsl: true, internalExperimentFlags: [], consistencyTokenJars: [] },
                user: { lockedSafetyMode: false }
            },
            adSignalsInfo: {
                params: [
                    { key: "dt", value: "1719795187382" }, { key: "flash", value: "0" }, { key: "frm", value: "0" }, { key: "u_tz", value: "-180" },
                    { key: "u_his", value: "4" }, { key: "u_h", value: "768" }, { key: "u_w", value: "1366" }, { key: "u_ah", value: "768" },
                    { key: "u_aw", value: "1366" }, { key: "u_cd", value: "24" }, { key: "bc", value: "31" }, { key: "bih", value: "305" },
                    { key: "biw", value: "1349" }, { key: "brdim", value: "0,0,0,0,1366,0,1366,768,1366,305" }, { key: "vis", value: "1" },
                    { key: "wgl", value: "true" }, { key: "ca_type", value: "image" }
                ]
            },
            query: `${q}`,
            webSearchboxStatsUrl: `/search?oq=${q}&gs_l=youtube.3..0i512k1l4j0i22i30k1l10.115906.115906.1.116742.4.3.1.0.0.0.471.471.4-1.1.0....0...1ac.1.64.youtube..2.2.706....0.E9XetO-t4X4`
        };

        const response = await axios.post(apiUrl, payload);
        const contents = response.data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents[0];

        if (!contents.videoRenderer) throw new Error('Nenhum vídeo encontrado');

        const informacoes = contents.videoRenderer;
        const teste = informacoes.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer;

        const browsePayload = { context: payload.context, browseId: teste.navigationEndpoint.browseEndpoint.browseId };
        const browseResponse = await axios.post(CONFIG.API_URLS.browse, browsePayload);
        const jdijdwi = browseResponse.data;
        const get_canal = jdijdwi.header.pageHeaderRenderer;

        const info_canal = {
            title: get_canal?.pageTitle || 'Canal desconhecido',
            avatar: get_canal?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources || [],
            subscribers: get_canal?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows[1]?.metadataParts[0]?.text?.content || 'Desconhecido',
            totalVideos: get_canal?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows[1]?.metadataParts[1]?.text?.content || 'Desconhecido',
            description: get_canal?.content?.pageHeaderViewModel?.description?.descriptionPreviewViewModel?.description?.content || 'Sem descrição',
            banner: get_canal?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources || [],
            keywords: jdijdwi?.metadata?.channelMetadataRenderer?.keywords || 'Nenhum',
            ownerUrls: jdijdwi?.metadata?.channelMetadataRenderer?.ownerUrls || [],
            channelUrl: jdijdwi?.metadata?.channelMetadataRenderer?.channelUrl || null,
            isFamilySafe: jdijdwi?.metadata?.channelMetadataRenderer?.isFamilySafe || false,
            tags: jdijdwi?.microformat?.microformatDataRenderer?.tags || [],
            vanityChannelUrl: jdijdwi?.metadata?.channelMetadataRenderer?.vanityChannelUrl || null,
            externalId: jdijdwi?.metadata?.channelMetadataRenderer?.externalId || null
        };

        if (!informacoes.title?.runs?.[0]?.text || !informacoes.videoId || !informacoes.thumbnail?.thumbnails) {
            throw new Error('Vídeo inválido');
        }

        const id_video = informacoes.videoId;
        const videoUrl = CONFIG.API_URLS.ytUrlwatch + id_video;
        const video = {
            title: informacoes.title.runs[0].text,
            videoId: id_video,
            url: videoUrl,
            thumbnails: informacoes.thumbnail.thumbnails || [],
            channel: informacoes.longBylineText?.runs?.[0]?.text || 'Canal desconhecido',
            channelUrl: informacoes.longBylineText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ?
                CONFIG.API_URLS.ytUrl + informacoes.longBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url : '',
            duration: informacoes.lengthText?.simpleText || 'Desconhecido',
            durationAccessible: informacoes.lengthText?.accessibility?.accessibilityData?.label || 'Desconhecido',
            published: informacoes.publishedTimeText?.simpleText || 'Desconhecido',
            views: informacoes.viewCountText?.simpleText || 'Desconhecido',
            description: informacoes.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(run => run.text).join('') || 'Sem descrição',
            badges: informacoes.badges?.map(badge => badge.metadataBadgeRenderer?.label) || [],
            ownerBadges: informacoes.ownerBadges?.map(badge => badge.metadataBadgeRenderer?.label) || [],
            shortViewCount: informacoes.shortViewCountText?.simpleText || 'Desconhecido'
        };

        const { data: dislikeData } = await axios.get(`${CONFIG.API_URLS.ytDislikes}${id_video}`);

        const downloadsData = await downloads(id_video);

        const organizedResult = {
            status: 'success',
            video: {
                title: video.title,
                videoId: video.videoId,
                url: video.url,
                thumbnails: video.thumbnails,
                duration: video.duration,
                durationAccessible: video.durationAccessible,
                views: video.views,
                shortViewCount: video.shortViewCount,
                published: video.published,
                description: video.description,
                badges: video.badges,
                ownerBadges: video.ownerBadges
            },
            channel: {
                name: info_canal.title,
                url: info_canal.channelUrl,
                vanityUrl: info_canal.vanityChannelUrl,
                externalId: info_canal.externalId,
                avatar: info_canal.avatar,
                banner: info_canal.banner,
                subscribers: info_canal.subscribers,
                totalVideos: info_canal.totalVideos,
                description: info_canal.description,
                keywords: info_canal.keywords,
                ownerUrls: info_canal.ownerUrls,
                tags: info_canal.tags,
                isFamilySafe: info_canal.isFamilySafe
            },
            downloads: {
                ...downloadsData
            },
            stats: {
                likes: dislikeData.likes || 0,
                dislikes: dislikeData.dislikes || 0,
                rating: dislikeData.rating || 0,
                viewCount: dislikeData.viewCount || video.views,
                date: dislikeData.date || 'Desconhecido'
            }
        };
        
        await fs.promises.writeFile('resultado.json', JSON.stringify(organizedResult, null, 2));

        return { status: true, result: organizedResult };
    } catch (error) {
        console.error(error);
        return { status: false, message: 'Ocorreu um erro, ou não teve um resultado adequado.', error: error.message };
    }
}


module.exports = {
    play,
    play2
};