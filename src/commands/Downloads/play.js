const { createCommand } = require("../../loader.js");
const { musicCard } = require("musicard-quartz");
const { play } = require('../../modules/youtube.js');
const { Config } = require("../../constants.js");

module.exports = createCommand({
    name: "play",
    params: "<url> <text> [-mp4]",
    aliases: ["p", 'youtube'],
    menu: "downloads",
    desc: "Reproduz/Baixa Músicas do YouTube",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            let query = args.join(' ');
            let mediaType = 'audio';
            const duration = await int.getEphemeralDuration(sock, from);
            await int.react(sock, from, info.key, "🤖");

            if (query.endsWith('-mp4')) {
                mediaType = 'video';
                query = query.replace('-mp4', '').trim();
            }

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o nome ou o link de um vídeo do YouTube.`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
                return;
            }

            const p = await play(query);
            const video = p.result.video;
            const canal = p.result.channel;
            const stat = p.result.stats;

            const card = new musicCard()
                .setName(`${video.title}`)
                .setAuthor(`${canal.name}`)
                .setColor("auto")
                .setTheme("quartz+")
                .setBrightness(50)
                .setThumbnail(`${video.thumbnails[0].url || "https://storage.nexfuture.com.br/1/b908d13f77c64b2290e.jpeg"}`)
                .setProgress(33)
                .setStartTime("0:00")
                .setEndTime(`${video.duration}`);

            const cardBuffer = await card.build();

            await int.composing();

            const resultadoFinal = `*✦  𝐖𝐀  𝐒 𝐄 𝐑 𝐕 𝐈 𝐂 𝐄  𝐏 𝐋 𝐀 𝐘 𝐄 𝐑 ✦*

• Titulo: ${video.title}
• Duração: ${video.duration}
• Views: ${video.shortViewCount}

• Postado: ${video.published}
• Likes: ${stat.likes} / Deslikes ${stat.dislikes}
• Rating: ${stat.rating.toFixed(2)}/ 5.0
• Descrição: ${video.description.substring(0, 50)}...

• Canal: ${canal.name}
• Inscritos: ${canal.subscribers}
• Total de Videos: ${canal.totalVideos}
• CanalUrl: ${canal.ownerUrls[0]}`;

            await sock.sendMessage(from, {
                image: cardBuffer,
                caption: resultadoFinal
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            });

            const downloadOptions = p.result.downloads[mediaType].config;
            let mediaUrl;

            if (mediaType === 'audio' && downloadOptions.length > 0) {
                mediaUrl = downloadOptions.find(opt => opt.format === 'mp3')?.url;
            } else if (mediaType === 'video' && downloadOptions.length > 0) {
                mediaUrl = downloadOptions.find(opt => opt.format === '360')?.url || downloadOptions[0].url;
            }

            if (!mediaUrl) {
                throw new Error('Nenhuma URL de mídia válida encontrada');
            }

            await int.recording();

            await sock.sendMessage(from, {
                [mediaType]: { url: mediaUrl },
                mimetype: mediaType === 'video' ? "video/mp4" : "audio/mpeg"
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            });

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error(e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não Encontrei Nenhum resultado para essa pesquisa`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});