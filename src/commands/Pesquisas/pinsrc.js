const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { pinterestSearch } = require('../../modules/pinterestsearch.js');


module.exports = createCommand({
    name: "pinterestsearch",
    params: "<text>",
    aliases: ["pins", "pinsearch"],
    menu: "pesquisas",
    desc: "Busca imagens no Pinterest",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}pinterest paisagens*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const result = await pinterestSearch(query);
            
            await sock.sendMessage(
                from,
                {
                    image: { url: result.url },
                    caption: `*📌 Pinterest Search - ${Config.get("name")}*`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );


            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Pinterest command error:", error);
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