const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { wikimedia } = require('../../modules/wikimediasearch.js');


module.exports = createCommand({
    name: "wikimedia",
    params: "<text>",
    aliases: ["wikiimage", "wikim"],
    menu: "pesquisas",
    desc: "Busca Imagens de Coisas, Eventos, Pessoas, Animais. pelo Mundo.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}Wikimedia Gato*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const wikip = await wikimedia(query);

            let title = `${wikip[0].title}`;
            title = title.replace('.jpg', '').replace('.jpeg', '').replace('.png', '');


            await sock.sendMessage(
                from,
                {
                    image: { url: wikip[0].image },
                    caption: `*📌 Wikimedia Search - ${title}*`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );


            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Wikimedia command error:", error);
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