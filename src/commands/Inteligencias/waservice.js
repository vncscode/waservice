const { createCommand } = require("../../loader.js");
require('../../../assets/media/logos.js');
const { WaService } = require('../../modules/gemini.js');

module.exports = createCommand({
    name: "wa-ai",
    params: "<text>",
    aliases: ["waservice-ai"],
    menu: "inteligencias",
    desc: "WAservice inteligencia artificial.",
    async run(int) {
        try {

            const { args, from } = int;
            const query = args.join(' ');


            if (!query) {
                await int.sock.sendMessage(from, {
                    text: '🤖 Para utilizar esse comando, insira o texto para a WaService Responder'
                });
                return;
            }

            const WaServiceResponse = await WaService(query);

            const duration = await int.getEphemeralDuration(int.sock, from);

            await int.sock.sendMessage(
                int.from,
                {
                    react: {
                        text: '🚀',
                        key: int.info.key
                    }
                }
            )

            await int.composing();

            const CapctionMsg = `*✦  𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄  ✦*\n\n▸ ${WaServiceResponse}`

            await int.sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: CapctionMsg
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );

            await int.sock.sendMessage(
                int.from,
                {
                    react: {
                        text: '✅',
                        key: int.info.key
                    }
                }
            )

        } catch (e) {
            console.error('Erro no comando wa-ai:', e);
            await int.sock.sendMessage(int.from, {
                text: '❌ Falha ao obter resposta: ' + e.message
            });
        }
    }
});