const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { loadConfig, saveConfig, formatDuration, groupStatusTimestamps } = require("../../scripts/groupScheduleHandler");
const moment = require('moment');
require('moment-timezone');

module.exports = createCommand({
    name: "grupomessage",
    params: "<-a> <-f> <-stop> <HH:MM>",
    aliases: ["groupmsg", "gmsg"],
    isAdmin: true,
    menu: "grupos",
    desc: "Controla se o grupo está aberto ou fechado para mensagens de não-admins (horário SP)",
    async run(int) {
        try {
            const { from, sock, isGroup, args, isBotAdmins, isGroupAdmins } = int;
            const query = args.join(' ').toLowerCase();
            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            };

            await int.composing();

            // Verificações básicas
            if (!isGroup) return await sock.sendMessage(from, { text: `${Config.get("name")}: Comando só para grupos!` }, messageOptions);
            if (!isBotAdmins) return await sock.sendMessage(from, { text: `${Config.get("name")}: Preciso ser admin!` }, messageOptions);
            if (!isGroupAdmins) return await sock.sendMessage(from, { text: `${Config.get("name")}: Você precisa ser admin!` }, messageOptions);

            const groupId = from;
            let config = await loadConfig();
            config[groupId] = config[groupId] || { currentStatus: 'open', schedules: [] };

            // Comando -stop para remover todas as configurações
            if (query === '-stop') {
                delete config[groupId];
                await saveConfig(config);
                if (groupStatusTimestamps[groupId]) {
                    delete groupStatusTimestamps[groupId];
                }
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Todas as configurações de mensagens foram removidas para este grupo!`
                }, messageOptions);
            }

            // Comandos básicos
            if (query === '-a') {
                await sock.groupSettingUpdate(groupId, 'not_announcement');

                let durationMsg = '';

                if (groupStatusTimestamps[groupId]?.closedAt) {
                    const closedDuration = moment().diff(groupStatusTimestamps[groupId].closedAt);
                    durationMsg = `\n\n⏱ O grupo ficou fechado por ${formatDuration(closedDuration)}.`;
                    delete groupStatusTimestamps[groupId].closedAt;
                }

                config[groupId].currentStatus = 'open';
                await saveConfig(config);
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Grupo aberto com sucesso!${durationMsg}`
                }, messageOptions);
            }

            if (query === '-f') {
                await sock.groupSettingUpdate(groupId, 'announcement');

                groupStatusTimestamps[groupId] = {
                    closedAt: moment().valueOf()
                };

                let nextOpenMsg = '';
                if (config[groupId].schedules) {
                    const openSchedule = config[groupId].schedules.find(s => s.action === 'open');
                    if (openSchedule) {
                        const now = moment();
                        const nextOpen = moment(openSchedule.time, 'HH:mm');
                        if (nextOpen.isBefore(now)) nextOpen.add(1, 'day');
                        nextOpenMsg = `\n\n⏳ O grupo abrirá novamente em ${formatDuration(nextOpen.diff(now))}.`;
                    }
                }

                config[groupId].currentStatus = 'closed';
                await saveConfig(config);
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Grupo fechado com sucesso!${nextOpenMsg}`
                }, messageOptions);
            }

            // Processar agendamentos
            const times = query.match(/\b\d{1,2}:\d{2}\b/g) || [];
            const hasOpen = query.includes('-a');
            const hasClose = query.includes('-f');

            if (times.length === 2 && (hasOpen || hasClose)) {
                config[groupId].schedules = [];

                const [time1, time2] = times;
                const openTime = hasOpen ? (query.indexOf('-a') < query.indexOf('-f') ? time1 : time2) : null;
                const closeTime = hasClose ? (query.indexOf('-f') < query.indexOf('-a') ? time1 : time2) : null;

                if (hasOpen && openTime) {
                    config[groupId].schedules.push({ action: 'open', time: openTime });
                }

                if (hasClose && closeTime) {
                    config[groupId].schedules.push({ action: 'close', time: closeTime });
                }

                await saveConfig(config);
                let response = `${Config.get("name")}: Agendamento configurado (horário SP):\n`;
                if (hasOpen) response += `🔓 Aberto às ${openTime}\n`;
                if (hasClose) response += `🔐 Fechado às ${closeTime}`;
                return await sock.sendMessage(from, { text: response }, messageOptions);
            }

            // Mensagem de ajuda atualizada
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Como usar (horário SP):\n` +
                    `• !grupomessage -a → Abre o grupo\n` +
                    `• !grupomessage -f → Fecha o grupo\n` +
                    `• !grupomessage -a 7:00 -f 00:00 → Agenda abertura/fechamento\n` +
                    `• !grupomessage -stop → Remove todas as configurações\n` +
                    `Exemplo: !grupomessage -f 18:00 -a 8:00`
            }, messageOptions);

        } catch (e) {
            console.error('[GroupMessage] Erro:', e);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: ${e.message || 'Erro ao processar comando'}`
            }, {
                ephemeralExpiration: await int.getEphemeralDuration(sock, int.from),
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});