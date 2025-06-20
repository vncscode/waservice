const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { kwaiDownload } = require('../../modules/kwai.js');

module.exports = createCommand({
    name: "kwai",
    params: "<url>",
    aliases: ["kwa", 'kw'],
    menu: "downloads",
    desc: "Reproduz/Baixa Midias do Kwai",
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

            const Kwai = await kwaiDownload(query);

            const CapctionMsg = `*📌 Kwai Download - ${Config.get("name")}*
            
• Titulo: ${Kwai.titulo}
• Postado: ${Kwai.publicado}
• Criador: ${Kwai.criador.nome}
• Perfil: ${Kwai.criador.perfil}
• Descrição: ${Kwai.descricao}`;


            await sock.sendMessage(from, {
                video: { url: Kwai.video },
                caption: CapctionMsg
            }, messageOptions);


            await sock.sendMessage(from, {
                audio: { url: Kwai.video },
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