const { spawn } = require('child_process');
const { createCommand } = require("../../loader.js");
const { Config } = require("../../constants.js");

function softRestart() {
    const [node, script, ...args] = process.argv;
    const newProcess = spawn(node, [script, ...args], {
        stdio: 'inherit',
        detached: true
    });

    newProcess.unref();
    process.exit(0);
}

module.exports = createCommand({
    name: "restart",
    aliases: ["reiniciar", 'reboot'],
    menu: "system",
    desc: "Reinicia o bot suavemente.",
    async run(int) {
        try {

            await int.composing();

            const duration = await int.getEphemeralDuration(int.sock, int.from);

            if (!int.isDono) {
                await int.sock.sendMessage(int.from, {
                    text: `${Config.get("name")}: Comando só pode ser executado pelo meu Dono!`
                }
                    , {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: int.info
                    });

            }

            await int.sock.sendMessage(
                int.from,
                {
                    react: {
                        text: '🔄',
                        key: int.info.key
                    }
                }
            )
            await new Promise(resolve => setTimeout(resolve, 2000));

            softRestart();

        } catch (e) {
            console.error('Erro no comando restart:', e);
            await int.sock.sendMessage(int.from, {
                text: '❌ Falha ao reiniciar: ' + e.message,
                quoted: int.info
            });
        }
    }
});