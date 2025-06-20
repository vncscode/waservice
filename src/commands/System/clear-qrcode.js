const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { iniciarMonitoramento } = require("../../scripts/qrCleaner.js");

module.exports = createCommand({
    name: "clear-qr",
    params: "",
    aliases: ["limpeza", "limpar-qr"],
    menu: "system",
    isOwner: true,
    desc: "Inicia o monitoramento para limpar arquivos QR quando a pasta atingir 3.500 arquivos",
    async run(int) {
        const { from, sock } = int;
        const duration = await int.getEphemeralDuration(sock, from);
        const numeroDono = `${Config.get("creator")}@s.whatsapp.net` || int.sender;

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: int.info
        };

        if (!int.isDono) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Apenas donos podem executar a limpeza de arquivos QR.`
            }, messageOptions);
            return;
        }

        await int.composing();

        try {
            // Iniciar o monitoramento
            iniciarMonitoramento(sock, numeroDono);

            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Monitoramento de arquivos QR iniciado. A limpeza será acionada automaticamente quando a pasta atingir 3.500 arquivos.`
            }, messageOptions);

        } catch (e) {
            console.error('Erro no comando limpeza-qrcode:', e);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Ocorreu um erro ao processar o comando. Verifique os logs.`
            }, messageOptions);
        }
    }
});