const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { instadl } = require('../../modules/instagram.js');

module.exports = createCommand({
    name: "instagram",
    params: "<url>",
    aliases: ["ig", 'insta'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do Instagram",
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
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um vídeo do instagram.`
                }, messageOptions);
                return;
            }

            const instagram = await instadl(query);

            await int.react(sock, from, info.key, "🤖");

            await int.recording();


            await sock.sendMessage(from, {
                video: { url: instagram.data[0].url },
                caption: `*📌 Instagram Download - ${Config.get("name")}*`
            }, messageOptions);

            await int.recording();

            await sock.sendMessage(from, {
                audio: { url: instagram.data[0].url },
                mimetype: "audio/mpeg"
            }, messageOptions);

            await int.react(sock, from, info.key, "🤖");

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