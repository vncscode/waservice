const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const twitterDl = require("../../modules/twitter.js");

module.exports = createCommand({
    name: "twitter",
    params: "<url>",
    aliases: ["x", 'twtt'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do Twitter",
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
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um vídeo do Twitter.`
                }, messageOptions);
                return;
            }

            await int.react(sock, from, info.key, "🤖");

            await int.recording();

            const twitterMedia = await twitterDl(query);

            if (twitterMedia.type === 'video') {
                const captionMsg = `*📌 Twitter Download - ${Config.get("name")}*\n\n• Titulo: ${twitterMedia.title || 'Sem título'} - ${twitterMedia.duration || 'Duração desconhecida'}`;

                await sock.sendMessage(from, {
                    video: { url: twitterMedia.download[0].link },
                    caption: captionMsg
                }, messageOptions);

                if (twitterMedia.download[0].link) {
                    await sock.sendMessage(from, {
                        audio: { url: twitterMedia.download[0].link },
                        mimetype: "audio/mpeg"
                    }, messageOptions);
                }
            } else if (twitterMedia.type === 'photo') {
                await sock.sendMessage(
                    from,
                    {
                        image: { url: twitterMedia.download },
                        caption: `*📌 Twitter Image - ${Config.get("name")}*`
                    },
                    messageOptions
                );
            }

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error('Twitter command error:', e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await sock.sendMessage(
                int.from,
                { react: { text: '❌', key: int.info.key } }
            );

            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: ${e.message || 'Não Encontrei Nenhuma midia para baixar.'}`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});