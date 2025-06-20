const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const tiktokDL = require('@faouzkk/tiktok-dl');

module.exports = createCommand({
    name: "tiktok",
    params: "<url>",
    aliases: ["ttk", 'tiktoks'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do Tiktok",
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
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um vídeo do TikTok.`
                }, messageOptions);
                return;
            }

            await int.react(sock, from, info.key, "🤖");

            await int.recording();

            const tiktok = await tiktokDL(query);


            await sock.sendMessage(from, {
                video: { url: tiktok.video },
                caption: `*📌 Tiktok Download - ${Config.get("name")}*`
            }, messageOptions);

            await sock.sendMessage(from, {
                audio: { url: tiktok.audio },
                mimetype: "audio/mpeg"
            }, messageOptions);


            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error(e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não Encontrei Nenhuma midia para baixar.`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});