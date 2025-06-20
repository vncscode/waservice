const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const pinterestDL = require('../../modules/pinterest.js');

module.exports = createCommand({
    name: "pinvideo",
    params: "<url>",
    aliases: ["pinvid", 'pinterestvideo'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do Pinterest",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            };

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o link de um vídeo do Kwai.`
                }, messageOptions);
                return;
            }

            await int.react(sock, from, info.key, "🤖");

            await int.recording();

            const PinVid = await pinterestDL(query);

            const keywordsList = PinVid.keyword.length > 0
                ? PinVid.keyword.join(', ')
                : 'Sem Tags.';

            const CapctionMsg = `*📌 Pinterest Download - ${Config.get("name")}*
            
• Titulo: ${PinVid.titulo}
• Postado em: ${PinVid.upload}
            
• Autor: ${PinVid.autor.nome}
• Usuario: ${PinVid.autor.usuario}
• Perfil: ${PinVid.autor.url}
            
• KeyWords: ${keywordsList}`;
            await sock.sendMessage(from, {
                video: { url: PinVid.download },
                caption: CapctionMsg
            }, messageOptions);


            await sock.sendMessage(from, {
                audio: { url: PinVid.download },
                mimetype: "audio/mpeg"
            }, messageOptions);

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error(e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não Encontrei Nenhuma midia para baixar.`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});

