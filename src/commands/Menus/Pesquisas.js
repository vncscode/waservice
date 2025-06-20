const Config = require("../../constants").Config;
const { createCommand, getMenuCommands, capitalize } = require("../../loader");
require('../../../assets/media/logos.js');
const fs = require("fs").promises;

module.exports = createCommand({
    name: "pesquisas",
    label: "𝐏𝐄𝐒𝐐𝐔𝐈𝐒𝐀𝐒",
    desc: "Comandos de Pesquisa por Termo ou Parametro.",
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
                        text: '🔍',
                        key: info.key
                    }
                }
            );

            await int.composing();

            const menus = getMenuCommands()['pesquisas'];
            const textos = menus.map((cmd) => [
                `• *${prefix}${capitalize(cmd.name)}${cmd.params ? ' ' + cmd.params : ''}*`,
                `• Aliases: ${cmd.aliases?.join(', ') || 'Nenhum'}`,
                `• Hit: ${contadorComandos[cmd.name] || 0}`,
                `↳ ${cmd.desc}\n-`
            ].join("\n"));

            const menuCaption = `╭╌ *𝐏𝐄𝐒𝐐𝐔𝐈𝐒𝐀𝐒* ╌╮\n${textos.join("\n")}\n╰───────────⪨`;

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
            console.error('Erro ao processar o menu de pesquisas:', e);
            await int.sock.sendMessage(int.from, {
                text: '🔍 Erro ao processar o menu de pesquisas!'
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