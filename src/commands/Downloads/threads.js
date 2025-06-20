const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { Threads } = require('../../modules/threads.js');

module.exports = createCommand({
    name: "threads",
    params: "<url>",
    aliases: ["th", 'thread'],
    menu: "downloads",
    desc: "Reproduz/Baixa Mídias do Threads (Instagram) e exibe informações detalhadas",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');

            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            };

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um post do Threads.`
                }, messageOptions);
                return;
            }

            const threadsMedia = await Threads(query);

            await int.react(sock, from, info.key, "🤖");
            await int.recording();

            let caption = `*📌Threads Download - ${Config.get("name")}*\n\n`;
            caption += `• *Usuário*: ${threadsMedia.username || 'Desconhecido'}\n`;
            caption += `• *Verificado*: ${threadsMedia.is_verified ? 'Sim' : 'Não'}\n`;
            caption += `• *Legenda*: ${threadsMedia.caption || 'Nenhuma'}\n`;
            caption += `• *Curtidas*: ${threadsMedia.like_count || 0}\n`;
            caption += `• *Compartilhamentos*: ${threadsMedia.reshare_count || 0}\n`;
            caption += `• *Respostas*: ${threadsMedia.direct_reply_count || 0}\n`;
            caption += `• *Reposts*: ${threadsMedia.repost_count || 0}\n`;
            caption += `• *Citações*: ${threadsMedia.quote_count || 0}\n`;
            if (threadsMedia.taken_at) {
                const date = new Date(threadsMedia.taken_at * 1000).toLocaleString('pt-BR');
                caption += `• *Publicado em*: ${date}\n`;
            }
            caption += `• *Áudio*: ${threadsMedia.has_audio ? 'Sim' : 'Não'}\n`;
            caption += `• *Tradução Disponível*: ${threadsMedia.has_translation ? 'Sim' : 'Não'}\n`;
            caption += `• *Tipo de Mídia*: ${threadsMedia.media_type === 1 ? 'Imagem' : threadsMedia.media_type === 2 ? 'Vídeo' : threadsMedia.media_type === 8 ? 'Carrossel' : 'Desconhecido'}\n`;

            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            if (threadsMedia.media_type === 1 && threadsMedia.carousel_items?.[0]?.image_urls?.length > 0) {
                await sock.sendMessage(from, {
                    image: { url: threadsMedia.carousel_items[0].image_urls[0] },
                    caption: caption + `\n• *Dimensões*: ${threadsMedia.carousel_items[0].original_width || 'N/A'}x${threadsMedia.carousel_items[0].original_height || 'N/A'}`
                }, messageOptions);
            }
            else if (threadsMedia.media_type === 2 && threadsMedia.carousel_items?.[0]?.video_urls?.length > 0) {
                const videoItem = threadsMedia.carousel_items[0];
                await sock.sendMessage(from, {
                    video: { url: videoItem.video_urls[0] },
                    caption: caption + `\n• *Dimensões*: ${videoItem.original_width || 'N/A'}x${videoItem.original_height || 'N/A'}`
                }, messageOptions);

                await delay(3000);
                await int.recording();
                await sock.sendMessage(from, {
                    audio: { url: videoItem.video_urls[0] },
                    mimetype: "audio/mpeg"
                }, messageOptions);
            }
            else if (threadsMedia.media_type === 8 && threadsMedia.carousel_items?.length > 0) {
                let sentItems = 0;
                const maxItemsToSend = 2;

                for (let i = 0; i < threadsMedia.carousel_items.length && sentItems < maxItemsToSend; i++) {
                    const item = threadsMedia.carousel_items[i];
                    const itemCaption = caption + `\n• *Item ${i + 1}* de ${Math.min(threadsMedia.carousel_items.length, maxItemsToSend)}\n• *Dimensões*: ${item.original_width || 'N/A'}x${item.original_height || 'N/A'}`;

                    if (item.image_urls?.length > 0 && sentItems < maxItemsToSend) {
                        await sock.sendMessage(from, {
                            image: { url: item.image_urls[0] },
                            caption: itemCaption
                        }, messageOptions);
                        sentItems++;
                        if (sentItems < maxItemsToSend) await delay(3000);
                    }
                    if (item.video_urls?.length > 0 && sentItems < maxItemsToSend) {
                        await sock.sendMessage(from, {
                            video: { url: item.video_urls[0] },
                            caption: itemCaption
                        }, messageOptions);
                        sentItems++;
                        if (sentItems < maxItemsToSend) await delay(3000);

                        await int.recording();
                        await sock.sendMessage(from, {
                            audio: { url: item.video_urls[0] },
                            mimetype: "audio/mpeg"
                        }, messageOptions);
                        if (sentItems < maxItemsToSend) await delay(3000);
                    }
                }

                if (threadsMedia.carousel_items.length > maxItemsToSend) {
                    await delay(5000);
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: O carrossel contém ${threadsMedia.carousel_items.length} itens, mas apenas ${maxItemsToSend} foram enviados devido ao limite.`
                    }, messageOptions);
                }
            }
            else {
                await sock.sendMessage(from, {
                    text: caption + `\n${Config.get("name")}: Nenhuma mídia válida encontrada para download.`
                }, messageOptions);
            }

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error(e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não foi possível baixar a mídia do Threads.\nErro: ${e.message}`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});