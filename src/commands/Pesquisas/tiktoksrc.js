const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { tiktokSearch } = require('../../modules/tiktoksearch.js');

module.exports = createCommand({
    name: "tiktoksearch",
    params: "<texto>",
    aliases: ["ttksrc", "tiktokedits"],
    menu: "pesquisas",
    desc: "Busca vídeos/edits no TikTok.",
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
                    text: `${Config.get("name")}: Por favor, insira um termo de busca. Ex: *${Config.get("prefix")}tiktoksrc edits*`
                }, messageOptions);
                return;
            }

            // Reação indicando que a busca começou
            await sock.sendMessage(
                from,
                { react: { text: '🔍', key: info.key } }
            );

            await int.recording(); // Indicador de processamento

            const result = await tiktokSearch(query);

            if (!result.ok) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: ${result.msg}`
                }, messageOptions);
                return;
            }

            const caption = `• *Título:* ${result.titulo}`;

            await sock.sendMessage(from, {
                video: { url: result.video },
                caption: caption,
                mimetype: result.mime
            }, messageOptions);

            // Envia o áudio separadamente
            await sock.sendMessage(from, {
                audio: { url: result.audio },
                mimetype: "audio/mpeg"
            }, messageOptions);

            // Reação de sucesso
            await sock.sendMessage(
                from,
                { react: { text: '✅', key: info.key } }
            );

        } catch (error) {
            console.error("Erro no comando tiktoksrc:", error);
            await sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Ocorreu um erro ao processar sua solicitação.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});