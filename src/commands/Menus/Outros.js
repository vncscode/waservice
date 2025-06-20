const Config = require("../../constants").Config;
const { createCommand, getMenuCommands, capitalize } = require("../../loader");
require('../../../assets/media/logos.js');
const fs = require("fs").promises;

module.exports = createCommand({
    name: "outros",
    label: "𝐎𝐔𝐓𝐑𝐎𝐒",
    desc: "Comandos diversos sem categoria definida.",
    async run(int) {
        try {
            const { sock, from, info } = int;
            const prefix = Config.get("prefix");
            const duration = await int.getEphemeralDuration(sock, from);

            const contadorComandos = await this.getCommandCounts();

            await int.sock.sendMessage(
                from,
                {
                    react: {
                        text: '🤖',
                        key: info.key
                    }
                }
            );

            await int.composing();

            const menus = getMenuCommands()['outros'];
            const textos = menus.map((cmd) => {
                return [
                    `• *${prefix}${capitalize(cmd.name)}${cmd.params ? ' ' + cmd.params : ''}*`,
                    `• Aliases: ${cmd.aliases?.join(', ') || 'Nenhum'}`,
                    `• Hit: ${contadorComandos[cmd.name] || 0}`,
                    `↳ ${cmd.desc}\n-`,
                ].join("\n");
            });

            const menuCaption = `╭╌ *𝐎𝐔𝐓𝐑𝐎𝐒* ╌╮\n${textos.join("\n")}\n╰───────────⪨`;

            await int.sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: menuCaption
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

        } catch (e) {
            console.error('Erro ao processar o menu:', e);
            await int.sock.sendMessage(int.from, {
                text: '🤖 Erro ao processar o menu!'
            });
        }
    },

    async getCommandCounts() {
        try {
            const data = await fs.readFile('./assets/sistema/comandos.json', 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Erro ao ler contador de comandos:', e);
            return {};
        }
    }
});