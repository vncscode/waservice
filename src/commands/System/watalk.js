const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { updateBotReply } = require("../../scripts/BotMsgReplyHandler.js");

module.exports = createCommand({
    name: "watalk",
    params: "<-start/-stop>",
    aliases: ["watalk", "autoresponder"],
    menu: "system",
    isOwner: true,
    desc: "Ativa/desativa as respostas automáticas quando o bot é mencionado",
    async run(int) {
        const { from, sock, args } = int;
        const action = args[0]?.toLowerCase();
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: int.info
        };

        if (!int.isDono) {
                    
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Apenas donos podem ver estatísticas de todos os grupos.`
            }, messageOptions);
            return;
        }

        await int.composing();

        if (!action || !["-start", "-stop"].includes(action)) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Uso correto:\n*!botreply -start* - ativa respostas automáticas\n*!botreply -stop* - desativa respostas automáticas`
            }, messageOptions);
            return;
        }

        try {
            const success = updateBotReply(action === '-start');
            
            if (success) {
                if (process.env.BOT_MSG_REPLY) {
                    process.env.BOT_MSG_REPLY = (action === '-start').toString();
                }

                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Respostas automáticas ${action === '-start' ? 'ativadas' : 'desativadas'} com sucesso!`
                }, messageOptions);
            } else {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Falha ao atualizar as configurações de resposta automática.`
                }, messageOptions);
            }
        } catch (e) {
            console.error('Erro no comando botreply:', e);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Ocorreu um erro ao processar o comando. Verifique os logs.`
            }, messageOptions);
        }
    }
});