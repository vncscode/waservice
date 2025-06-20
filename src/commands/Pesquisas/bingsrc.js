const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const bingImageSearch = require("../../modules/bingimagesrc.js");


module.exports = createCommand({
    name: "bingimg",
    params: "<text>",
    aliases: ["bimgs", "bingsearch"],
    menu: "pesquisas",
    desc: "Busca imagens no Mundo Todo.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}Bingimg paisagens*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const bingImage = await bingImageSearch(query);

            await sock.sendMessage(
                from,
                {
                    image: { url: bingImage[0] },
                    caption: `*📌 Bing Search - ${Config.get("name")}*`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );


            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Bing command error:", error);
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