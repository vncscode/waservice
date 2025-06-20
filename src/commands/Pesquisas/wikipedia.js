const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { wikiSearch } = require('../../modules/wikipedia.js');


module.exports = createCommand({
    name: "wikipedia",
    params: "<text>",
    aliases: ["wikitext", "wiki"],
    menu: "pesquisas",
    desc: "Busca a Historia/vida de Tudo no Mundo",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}Wikipedia Gato*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const wikip = await wikiSearch(query);

            await sock.sendMessage(
                from,
                {
                    image: { url: wikip[0].imagem },
                    caption: `*📌 Wikipedia Search - ${wikip[0].nome}*\n\n• ${wikip[0].desc}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );


            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Wiki command error:", error);
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