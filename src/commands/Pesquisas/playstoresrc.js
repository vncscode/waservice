const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { playStoreSearch } = require('../../modules/playstoresearch.js');

module.exports = createCommand({
    name: "playstore",
    params: "<app name>",
    aliases: ["appsearch", "googleplay"],
    menu: "pesquisas",
    desc: "Pesquisa apps na Google Play Store",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Não entendi oque vc esta tentando fazer...\nExample: *${Config.get("prefix")}Playstore WhatsApp*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
                return;
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const result = await playStoreSearch(query);

            if (!result.ok) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: ${result.msg}`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
                return;
            }

            const appsToShow = result.data.slice(0, 3);

            let CapctionMsg = `*📱 Google Play Store Search - ${Config.get("name")}*\n`;
            CapctionMsg += `_Search for: "${query}"_\n\n`;

            appsToShow.forEach((app, index) => {
                CapctionMsg += `*${index + 1}. ${app.name}*\n`;
                CapctionMsg += `• Developer: ${app.developer}\n`;
                CapctionMsg += `• Rating: ${app.rating}\n`;
                CapctionMsg += `• ${app.link}\n\n`;
            });

            if (result.data.length > 3) {
                CapctionMsg += `_+ ${result.data.length - 3} more results..._`;
            }

            await sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: CapctionMsg
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("PlayStore command error:", error);
            await sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Failed to search Play Store. Please try again later.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});