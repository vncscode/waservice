const cheerio = require('cheerio');
const axios = require('axios');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function Threads(url) {
    const maxRetries = 10;
    let attempt = 1;

    let normalizedUrl = url;
    if (url.endsWith('/media')) {
        normalizedUrl = url.replace(/\/media$/, '');
    }

    const headers = {
        'accept-ch': 'viewport-width,dpr,Sec-CH-Prefers-Color-Scheme,Sec-CH-UA-Full-Version-List,Sec-CH-UA-Platform-Version,Sec-CH-UA-Model',
        'accept-ch-lifetime': '4838400',
        'alt-svc': 'h3=":443"; ma=86400',
        'cache-control': 'private, no-cache, no-store, must-revalidate',
        'vary': 'Accept-Encoding',
        'x-content-type-options': 'nosniff',
        'x-fb-connection-quality': 'GOOD; q=0.7, rtt=51, rtx=0, c=40, mss=1232, tbw=13732, tp=37, tpl=0, uplat=328, ullat=0',
        'x-frame-options': 'DENY',
        'x-stack': 'www',
        'x-xss-protection': '0',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'pt-BR,pt;q=0.6',
        'cache-control': 'max-age=0',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
        'sec-ch-ua-full-version-list': '"Chromium";v="136.0.0.0", "Brave";v="136.0.0.0", "Not.A/Brand";v="99.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"10.0.0"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    };

    while (attempt <= maxRetries) {
        try {
            const response = await axios.get(normalizedUrl, { headers });

            const $ = cheerio.load(response.data);
            const extractedData = [];

            const scripts = $('script[type="application/json"][data-sjs]');
            for (const script of scripts) {
                const content = $(script).html();
                if (content && content.includes('ScheduledServerJS')) {
                    try {
                        const jsonData = JSON.parse(content);
                        extractedData.push(jsonData);
                    } catch (parseError) {
                        console.log('Erro ao parsear JSON em um script:', parseError.message);
                    }
                }
            }

            let standardizedData = null;

            for (const data of extractedData) {
                const bbox = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data.data;
                if (bbox?.edges) {
                    const post = bbox.edges[0]?.node?.thread_items?.[0]?.post;
                    if (post) {
                        let carousel_items = [];
                        if (post.media_type === 8 && post.carousel_media) {
                            carousel_items = post.carousel_media.map(media => ({
                                image_urls: media.image_versions2?.candidates?.map(c => c.url) || [],
                                video_urls: media.video_versions?.map(v => v.url) || [],
                                original_height: media.original_height || null,
                                original_width: media.original_width || null,
                                accessibility_caption: media.accessibility_caption || null,
                                pk: media.pk || null,
                                id: media.id || null
                            }));
                        } else {
                            carousel_items = [{
                                image_urls: post.image_versions2?.candidates?.map(c => c.url) || [],
                                video_urls: post.video_versions?.map(v => v.url) || [],
                                original_height: post.original_height || null,
                                original_width: post.original_width || null,
                                accessibility_caption: post.accessibility_caption || null,
                                pk: post.pk || null,
                                id: post.id || null
                            }];
                        }
                    
                        standardizedData = {
                            post_id: post.pk || post.id || null,
                            username: post.user?.username || null,
                            profile_pic_url: post.user?.profile_pic_url || null,
                            is_verified: post.user?.is_verified || null,
                            caption: post.caption?.text || post.text_post_app_info?.text_fragments?.fragments?.[0]?.plaintext || null,
                            media_type: post.media_type || null,
                            carousel_items: carousel_items,
                            like_count: post.like_count || null,
                            reshare_count: post.text_post_app_info?.reshare_count || null,
                            direct_reply_count: post.text_post_app_info?.direct_reply_count || null,
                            repost_count: post.text_post_app_info?.repost_count || null,
                            quote_count: post.text_post_app_info?.quote_count || null,
                            taken_at: post.taken_at || null,
                            has_audio: post.has_audio || null,
                            accessibility_caption: post.accessibility_caption || null,
                            code: post.code || null,
                            is_reply: post.text_post_app_info?.is_reply || false,
                            thread_id: bbox.edges[0]?.node?.id || null,
                            has_translation: post.caption?.has_translation || false,
                            caption_is_edited: post.caption_is_edited || false
                        };
                        break;
                    }
                }
            }

            if (standardizedData) {
                //console.log(`Dados padronizados extraídos:`, JSON.stringify(standardizedData, null, 2));
                //fs.writeFileSync('extracted_data.json', JSON.stringify(standardizedData, null, 2), 'utf-8');
                return standardizedData
            } else {
                console.log('Nenhum dado com estrutura "edges" encontrado nos scripts com "ScheduledServerJS".');
            }

            return;
        } catch (e) {
            console.log(`Tentativa ${attempt} falhou. Erro:`, e.message);
            if (attempt === maxRetries) {
                console.log('Todas as tentativas falharam.');
                return;
            }
            attempt++;
            await delay(2500);
        }
    }
}

async function stalktheads(username) {
    const maxRetries = 10;
    let attempt = 1;

    const payload = {
        av: 0,
        __user: 0,
        __a: 1,
        __req: '1s',
        __hs: '20210.HYP:barcelona_web_pkg.2.1...0',
        dpr: 1,
        __ccg: 'GOOD',
        __rev: 1022439705,
        __s: '7iepjn:5o1mdp:0ysgh3',
        __hsi: 7499662602880799015,
        __dyn: '7xeUmwlEnwn8K2Wmh0no6u5U4e0yoW3q32360CEbo1nEhw2nVE4W0qa0FE2awgo9oO0n24oaEd82lwv89k2C1Fwc60D85m1mzXwae4UaEW0Loco5G0zK5o4q0HU1IEGdwtU2ewbS1LwTwKG0hq1Iwqo9EpwUwiQq3G58K2e2K7EmwMy9UjgbVE-1Ewuo5e8wooO1Hw',
        __csr: 'glTl8BiaAJ8ggiDOffimXFYxH8jIJpklu4pVUiCFeq5oxDzFpoKiiXGdiiUjU01pU9Q0ra09Kqxdgkw_U3SxbyEmx-qAu6i5y5Myh0de1Oxd1r84sh41a0yFUeo2wiG-q9g0QFBw7Pw2doc6awywjU25xi2S08swLwdu8k9G2qA2N8Yg323S2WP06nw8K1pUC0SUmU1uU5C6EtwH5i6wFCwQwRafwFmpN2xd3mryod834gLK05h1gK2BpRa6Uiw08Ll0',
        __comet_req: 29,
        hl: 'pt-br',
        lsd: 'AVqLuqepwxY',
        jazoest: 21111,
        __spin_r: 1022439705,
        __spin_b: 'trunk',
        __spin_t: 1746151271,
        __crn: 'comet.threads.BarcelonaLoggedOutFeedColumnRoute',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'BarcelonaUsernameHovercardImplDirectQuery',
        variables: JSON.stringify({
            username: username,
            __relay_internal__pv__BarcelonaIsInternalUserrelayprovider: false,
            __relay_internal__pv__BarcelonaIsLoggedInrelayprovider: false,
            __relay_internal__pv__BarcelonaHasSpoilerStylingInforelayprovider: false,
            __relay_internal__pv__BarcelonaShouldShowFediverseM075Featuresrelayprovider: false
        }),
        server_timestamps: true,
        doc_id: 9988118494543630
    };

    while (attempt <= maxRetries) {
        try {
            const response = await axios.post('https://www.threads.com/graphql/query', payload);

            return response.data.data;
        } catch (e) {
            //console.log(`Tentativa ${attempt} falhou. Erro:`, e.message);
            if (attempt === maxRetries) {
                console.log('Todas as tentativas falharam.');
                return;
            }
            attempt++;
            await delay(2500);
        }
    }
}

module.exports = {
    Threads,
    stalktheads
};
