const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { GeminiImage } = require("../../modules/gemini.js");


module.exports = createCommand({
    name: "geminiimage",
    params: "<text>",
    aliases: ["gerar-imagem", "genimg"],
    menu: "pesquisas",
    desc: "Gera Imagens usando Gemini, baseadas em termos.",
    async run(int) {
        const { args, from, sock, info } = int;
        const query = args.join(' ');
        const duration = await int.getEphemeralDuration(sock, from);

        if (!query) {
            return await sock.sendMessage(from, {
                text: `${Config.get("name")}: Digite algo para Gerar\nExemplo: *${Config.get("prefix")}GeminiImage Gere uma imagem de um gato*`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            });
        }

        await sock.sendMessage(from, { react: { text: '🔄', key: info.key } });

        await int.recording();

        const result = await GeminiImage(query);

        if (result.success) {
            await sock.sendMessage(
                from,
                {
                    image: { url: result.imageMetadata.url },
                    caption: `*📌 Gemini Generate Images - ${Config.get("name")}*`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );
            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });
        } else {

            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Seu Prompt Não foi bem aceito no meu Generative, reenvie ou modifique alguns parametros.`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            });
            await sock.sendMessage(from, { react: { text: '❌', key: info.key } });
        }
    }
});