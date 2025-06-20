const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { mediafire } = require('../../modules/mediafire.js');

module.exports = createCommand({
    name: "mediafire",
    params: "<url>",
    aliases: ["mediaf", 'mdfdl'],
    menu: "downloads",
    desc: "Baixa arquivos dos Servidores do Mediafire.",
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
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um arquivo do mediafire com final /file.`
                }, messageOptions);
                return;
            }

            const mediafirel = await mediafire(query);

            await int.react(sock, from, info.key, "🤖");

            await int.recording();

            console.log(mediafirel)

            sock.sendMessage(from, {
                document: { url: mediafirel.link },
                caption: `*📌 Mediafire Download - ${Config.get("name")}*\n\n• Peso: ${mediafirel.filesize}\n• Extensão: ${mediafirel.extension}`,
                mimetype: mediafirel.mimetype,
                fileName: mediafirel.filename
            }, messageOptions)


            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            console.log(e)
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não Encontrei Nenhuma file para baixar.`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});