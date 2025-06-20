const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { instaSearch } = require('../../modules/instasearch.js');

module.exports = createCommand({
    name: "instasearch",
    params: "<texto>",
    aliases: ["instasrc", "reels"],
    menu: "pesquisas",
    desc: "Busca Reels/Edits no Instagram",
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
                    text: `${Config.get("name")}: Digite algo para buscar (ex: *${Config.get("prefix")}instasrc edits*)`
                }, messageOptions);
                return;
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const result = await instaSearch(query);

            if (!result.ok) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: ${result.msg}`
                }, messageOptions);
                return;
            }

            const video = result.videos[0];

            const caption = `• *Título:* ${video.titulo}\n` +
                `• *Autor:* @${video.autor}\n` +
                `• *Curtidas:* ${video.estatisticas.curtidas}\n` +
                `• *Comentários:* ${video.estatisticas.comentarios}\n` +
                `• *Reproduções:* ${video.estatisticas.reproducoes}\n` +
                `• *Duração:* ${video.midia.duracao}s`;

            await sock.sendMessage(from, {
                video: { url: video.midia.url_video },
                caption: caption,
                mimetype: 'video/mp4'
            }, messageOptions);

            await int.recording();

            await sock.sendMessage(from, {
                audio: { url: video.midia.url_video },
                mimetype: 'audio/mpeg'
            }, messageOptions);

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Erro no comando instasrc:", error);
            await sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Ocorreu um erro inesperado. Tente novamente mais tarde.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});