const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const getWeatherReport = require('../../modules/clima.js');


module.exports = createCommand({
    name: "clima",
    params: "<text>",
    aliases: ["climas", "meteorologia"],
    menu: "utilidades",
    desc: "Informações sobre o clima/tempo da cidade.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite o nome de uma cidade.`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '👀', key: info.key } });
            await int.recording();

            const clima = await getWeatherReport(query);

            await sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: `*📌 Meteorologia - ${Config.get("name")}*\n\n${clima}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
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