const Config = require("../../constants").Config;
const { RANDOM_BOT_LOGO_VIDEO } = require("../../../assets/media/logos.js");
const { createCommand, getMenusInfos } = require("../../loader");
require('../../../assets/media/logos.js');
const fs = require("fs").promises;
const path = require('path');


module.exports = createCommand({
    name: "menu",
    aliases: ["waservice", "menus", "comandos"],
    desc: "Todos os Menus Disponiveis para USo.",
    async run(int) {
        try {

            const { sock, from, info } = int;
            const prefix = Config.get("prefix");

            const groups = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);
            const totalGrupos = groupIds.filter(id => id.endsWith('@g.us')).length;
            const totalParticipantes = Object.values(groups).reduce((acc, group) => acc + (group.size || 0), 0);
            const [contadorComandos, captchasPendentes] = await Promise.all([
                this.getCommandCounts(),
                this.getCaptchaCount()
            ]);

            const statsPath = path.join(__dirname, '../../../assets/sistema/UsersAndGroups.json');
            const statsRaw = await fs.readFile(statsPath, 'utf-8');
            const statsData = JSON.parse(statsRaw);
            const groupStats = statsData.grupos[from] || {};
            const totalMessages = groupStats.totalMensagens || 0;

            const duration = await int.getEphemeralDuration(sock, from);
            const lermais = await int.GetLerMais();

            const soma = Object.values(contadorComandos).reduce((total, valor) => total + valor, 0);

            await int.react(sock, from, info.key, "🤖");

            await int.composing();

            const Title = [
                `╭──⪩ ✦ 𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 ✦ ⪨─╮`,
                `│✦ 𝗚𝗿𝘂𝗽𝗼𝘀: [ ${totalGrupos || 0} ]`,
                `│✦ 𝗨𝘀𝘂𝗮𝗿𝗶𝗼𝘀: [ ${totalParticipantes || 0} ]`,
                `│✦ 𝗖𝗮𝗽𝘁𝗰𝗵𝗮: [ ${captchasPendentes || 'Indisponivel'} ]`,
                `│✦ 𝗛𝗶𝘁 𝗧𝗼𝘁𝗮𝗹: [ ${soma} ]`,
                `│✦ 𝗠𝗲𝗻𝘀𝗮𝗴𝗲𝗻𝘀: [ ${totalMessages} ]`,
                `╰─────────────────⪨`,
                `${lermais}`,
            ].join("\n");

            const Menus = getMenusInfos().map((info) => {
                return [
                    `╭╌ *${info.label}* ╌╮`,
                    `• ${prefix}${info.menu} `,
                    `• Hit: ${contadorComandos[info.menu] || 0}`,
                    `• Comandos: ${info.cmds.length}`,
                    `↳ ${info.desc}`,
                    `╰───────────⪨`
                ].join("\n")
            })

            await int.sock.sendMessage(
                from,
                {
                    video: { url: RANDOM_BOT_LOGO_VIDEO },
                    caption: [Title, Menus.join("\n")].join("\n"),
                    gifPlayback: true
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );


        } catch (e) {
            console.error('Erro ao processar o menu:', e);
            await int.sock.sendMessage(int.from, {
                text: '🤖 Error ao processar o menu!'
            });
        }
    },


    async getCommandCounts() {
        try {
            const data = await fs.readFile('./assets/sistema/comandos.json', 'utf8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    },

    async getCaptchaCount() {
        try {
            const data = await fs.readFile('./assets/grupos/captcha.json', 'utf-8');
            const json = JSON.parse(data);
            const jsonString = JSON.stringify(json);
            const matches = jsonString.match(/(\d+@s\.whatsapp\.net)/g);
            return matches ? matches.length : 0;
        } catch {
            return 0;
        }
    }
});