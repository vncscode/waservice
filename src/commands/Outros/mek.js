const { createCommand } = require("../../loader.js");
const { Config } = require("../../constants.js");

module.exports = createCommand({
    name: "mek",
    params: "<mensagem ou citação>",
    aliases: ["msginfo", "messageinfo"],
    menu: "outros",
    desc: "Exibe a estrutura JSON da mensagem recebida ou citada",
    async run(int) {
        try {
            const { from: sender, from, sock, info } = int;
            const quoted = info;
            const duration = await int.getEphemeralDuration(sock, sender);

            const messageToInspect = quoted || info;
            if (!messageToInspect) {
                await sock.sendMessage(
                    sender,
                    {
                        text: `Nenhuma mensagem encontrada. Envie ou marque uma mensagem.`
                    },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    }
                );
                return;
            }


            const messageStructure = JSON.stringify(messageToInspect, null, 2);

            await sock.sendMessage(
                sender,
                {
                    text: `${messageStructure}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error('Erro no comando mek:', e);
            const duration = await int.getEphemeralDuration(int.sock, from);
            await int.sock.sendMessage(
               from,
                {
                    text: `${Config.get("name")}: ❌ Erro: ${e.message || 'Falha ao exibir estrutura da mensagem'}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );
        }
    }
});