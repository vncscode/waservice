const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const shortenAll = require('../../modules/urlShort.js');

module.exports = createCommand({
    name: "shorturl",
    params: "<url>",
    aliases: ["encurtar", "urlshort", "link"],
    menu: "utilidades",
    desc: "Encurta URLs usando múltiplos serviços",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const url = args[0];
            const duration = await int.getEphemeralDuration(sock, from);

            if (!url) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Por favor, forneça uma URL para encurtar\nExemplo: *${Config.get("prefix")}shorturl https://exemplo.com/url-muito-longa*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            if (!url.match(/^https?:\/\//i)) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Por favor, forneça uma URL válida começando com http:// ou https://`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '⏳', key: info.key } });
            await int.recording();

            // Encurta a URL usando todos os serviços
            const shortened = await shortenAll(url);

            // Formata a resposta
            let resultText = `*📌 Encurtador de URLs - ${Config.get("name")}*\n`;

            shortened.forEach(service => {
                if (service.shortUrl) {
                    resultText += `\n*• ${service.service}:* ${service.shortUrl}`;
                } else if (service.error) {
                    resultText += `\n*• ${service.service}:* Erro (${service.error})`;
                }
            });

            await sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: resultText
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Ocorreu um erro ao encurtar a URL. Tente novamente mais tarde.`
            }, {
                quoted: info,
                ephemeralExpiration: await int.getEphemeralDuration(sock, from),
                disappearingMessagesInChat: true
            });
        }
    }
});