const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('America/Sao_Paulo');

const confPath = path.join(__dirname, '../../../assets/grupos/confs.json');
const groupSettingsPath = path.join(__dirname, '../../../assets/grupos/groupSettings.json');

function loadJsonFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(rawData) || {};
        }
        return {};
    } catch (e) {
        console.error(`Erro ao carregar arquivo ${filePath}:`, e);
        return {};
    }
}

module.exports = createCommand({
    name: "statusgp",
    params: "<>",
    aliases: ["sttsgp", "statusgrupo"],
    isAdmin: true,
    menu: "grupos",
    desc: "Mostra o Status/Ativações do Grupo",
    async run(int) {
        try {
            const { from, sock, info, isGroup, isBotAdmins, isGroupAdmins } = int;
            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            };

            if (!isGroup) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Este comando só pode ser usado em grupos!` },
                    messageOptions
                );
                return;
            }

            if (!isBotAdmins) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Eu preciso ser administrador do grupo!` },
                    messageOptions
                );
                return;
            }

            if (!isGroupAdmins) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Você precisa ser administrador!` },
                    messageOptions
                );
                return;
            }

            await int.composing();

            // Carrega os arquivos JSON dinamicamente
            const conf = loadJsonFile(confPath);
            const groupSettings = loadJsonFile(groupSettingsPath);

            const groupConfig = conf[from] || {};
            const groupSchedule = groupSettings[from] || {};

            // Construir mensagem no formato solicitado
            let statusMessage = `• Status do Grupo - Configurações\n\n`;

            // Seção de Agendamentos Automáticos
            statusMessage += `• Agendamentos Automáticos (Horário SP):\n\n`;

            if (groupSchedule.schedules && groupSchedule.schedules.length > 0) {
                groupSchedule.schedules.forEach(schedule => {
                    const action = schedule.action === 'open' ? 'ABRE' : 'FECHA';
                    const now = moment();
                    const nextTime = moment(schedule.time, 'HH:mm');

                    if (nextTime.isBefore(now)) {
                        nextTime.add(1, 'day');
                    }

                    const diff = moment.duration(nextTime.diff(now));

                    statusMessage += `• ${action} às ${schedule.time}\n`;
                    statusMessage += `• Próxima execução em: ${diff.hours()}h ${diff.minutes()}m\n\n`;
                });
            } else {
                statusMessage += `Nenhum agendamento configurado\n\n`;
            }

            // Seção de Outras Configurações (pega automaticamente do arquivo)
            statusMessage += `• Outras Configurações:\n\n`;

            // Lista todas as configurações encontradas no arquivo
            for (const [key, value] of Object.entries(groupConfig)) {
                statusMessage += `• ${key.toUpperCase()}: ${value ? '✅' : '❌'}\n`;
            }

            await int.sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: statusMessage
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

        } catch (e) {
            console.error('Erro no statusgp:', e);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Erro ao verificar status do grupo`
            }, {
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});