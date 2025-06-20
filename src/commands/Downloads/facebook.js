const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { facebookdl } = require('../../modules/facebook.js');

module.exports = createCommand({
    name: "facebook",
    params: "<url>",
    aliases: ["fb", 'face'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do facebook",
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
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um vídeo do facebook.`
                }, messageOptions);
                return;
            }

            const facebook = await facebookdl(query);


            await int.react(sock, from, info.key, "🤖");

            await int.recording();


            await sock.sendMessage(from, {
                video: { url: facebook.video },
                caption: `*📌 Facebook Download - ${Config.get("name")}*`
            }, messageOptions);

            await int.recording();

            await sock.sendMessage(from, {
                audio: { url: facebook.video },
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