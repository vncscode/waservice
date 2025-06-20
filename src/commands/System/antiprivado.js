const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { updateAntiPV } = require("../../scripts/antiprivadoHandler"); 

module.exports = createCommand({
    name: "antipv",
    params: "<-start> <-stop>",
    aliases: ["antiprivado"],
    menu: "system",
    isOwner: true,
    desc: "Ativa/desativa o Anti-PV (bloqueio de mensagens privadas).",
    async run(int) {
        const { from, sock, args } = int;
        const action = args[0]?.toLowerCase();
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: int.info
        };

        await int.composing();

        if (!int.isDono) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Apenas donos podem ver estatísticas de todos os grupos.`
            }, messageOptions);
            return;
        }

        if (!action || !["-start", "-stop"].includes(action)) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Uso correto: *!ntipv -start* (ativa) ou *!ntipv -stop* (desativa).`
            }, messageOptions);
            return;
        }


        const success = updateAntiPV(action === "-start");
        if (success) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Anti-PV ${action === "-start" ? "ativado" : "desativado"} com sucesso!`
            }, messageOptions);
        } else {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Falha ao atualizar o Anti-PV. Verifique os logs.`
            }, messageOptions);
        }
    }
});