const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const wallpaper = require('../../modules/wallpaper.js');


module.exports = createCommand({
    name: "wallpaper",
    params: "<text>",
    aliases: ["wallp", "papeldeparede"],
    menu: "pesquisas",
    desc: "Busca Imagens Para utilizar como Papel de Parede",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}Wallpaper Gato*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const wallp = await wallpaper(query);

            await sock.sendMessage(
                from,
                {
                    image: { url: wallp[0].image },
                    caption: `*📌 Wallpaper Search - ${wallp[0].title}*`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );


            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Wallpaper command error:", error);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Ocorreu um erro inesperado. Tente novamente mais tarde.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});