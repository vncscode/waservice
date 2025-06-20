const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('America/Sao_Paulo');


async function getEphemeralDuration(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        if (typeof metadata.ephemeralDuration === 'number') {
            return metadata.ephemeralDuration;
        }
        const groupInfo = await sock.groupFetchAllParticipating();
        const groupData = groupInfo[groupJid];

        if (groupData?.ephemeralDuration) {
            return groupData.ephemeralDuration;
        }

        return null;
    } catch (error) {
        console.error('Erro ao obter ephemeralDuration:', error);
        return null;
    }
}


const configPath = path.join(__dirname, '../../assets/grupos/groupSettings.json');
const scheduledIntervals = {};
const groupStatusTimestamps = {};

async function loadConfig() {
    try {
        const exists = await fs.access(configPath).then(() => true).catch(() => false);
        if (!exists) {
            await fs.writeFile(configPath, '{}', { encoding: 'utf-8' });
            return {};
        }
        const content = await fs.readFile(configPath, { encoding: 'utf-8' });
        if (!content.trim()) {
            await fs.writeFile(configPath, '{}', { encoding: 'utf-8' });
            return {};
        }
        return JSON.parse(content) || {};
    } catch (e) {
        console.error('[GroupSchedule] Erro ao carregar configurações:', e);
        await fs.writeFile(configPath, '{}', { encoding: 'utf-8' }).catch(err => {
            console.error('[GroupSchedule] Erro ao corrigir groupSettings.json:', err);
        });
        return {};
    }
}

async function saveConfig(config) {
    try {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
    } catch (e) {
        console.error('[GroupSchedule] Erro ao salvar configurações:', e);
    }
}

function formatDuration(ms) {
    const duration = moment.duration(ms);
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    let parts = [];
    if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? 's' : ''}`);

    return parts.join(' e ') || 'poucos instantes';
}

function normalizeJid(jid) {
    if (!jid) return jid;
    const match = jid.match(/^(\d+)(?::\d+)?@/);
    return match ? `${match[1]}@s.whatsapp.net` : jid;
}

async function executeTask(sock, groupId, action, config) {
    try {

        const ephemeral = await getEphemeralDuration(sock, groupId);

        const messageOptions = {
            ephemeralExpiration: ephemeral,
            disappearingMessagesInChat: true
        };


        const groupMetadata = await sock.groupMetadata(groupId);
        const botJid = normalizeJid(sock.user.id);
        const isBotAdmin = groupMetadata.participants.some(p => normalizeJid(p.id) === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
        if (!isBotAdmin) {
            console.error(`[GroupSchedule] Bot não é admin no grupo ${groupId}. Bot JID: ${botJid}`);
            return;
        }

        if (action === 'open') {
            await sock.groupSettingUpdate(groupId, 'not_announcement');
            let durationMsg = '';
            if (groupStatusTimestamps[groupId]?.closedAt) {
                const closedDuration = moment().diff(moment(groupStatusTimestamps[groupId].closedAt));
                durationMsg = `\n\n⏱ O grupo ficou fechado por ${formatDuration(closedDuration)}.`;
                delete groupStatusTimestamps[groupId].closedAt;
            }

            await sock.sendMessage(groupId, { text: `🔓 Grupo aberto!${durationMsg}` }, messageOptions);

            config[groupId].currentStatus = 'open';
        } else if (action === 'close') {
            await sock.groupSettingUpdate(groupId, 'announcement');
            groupStatusTimestamps[groupId] = { closedAt: moment().valueOf() };
            let nextOpenMsg = '';
            const openSchedule = config[groupId].schedules.find(s => s.action === 'open');
            if (openSchedule) {
                const now = moment();
                const nextOpen = moment(openSchedule.time, 'HH:mm');
                if (nextOpen.isBefore(now)) nextOpen.add(1, 'day');
                nextOpenMsg = `\n\n⏳ O grupo abrirá novamente em ${formatDuration(nextOpen.diff(now))}.`;
            }
            await sock.sendMessage(groupId, { text: `🔐 Grupo fechado!${nextOpenMsg}` }, messageOptions);
            config[groupId].currentStatus = 'closed';
        }
        await saveConfig(config);
    } catch (error) {
        console.error(`[GroupSchedule] Erro ao executar tarefa ${action} para ${groupId}:`, error);
    }
}

async function checkMissedTasks(sock, groupId, config) {
    const now = moment();
    const groupConfig = config[groupId];
    if (!groupConfig.schedules || !groupConfig.schedules.length) return;

    for (const schedule of groupConfig.schedules) {
        const { action, time } = schedule;
        const scheduledTime = moment(time, 'HH:mm');
        const currentStatus = groupConfig.currentStatus;

        if (scheduledTime.isSame(now, 'minute') || (scheduledTime.isBefore(now) && now.diff(scheduledTime, 'minutes') <= 5)) {
            if ((action === 'open' && currentStatus !== 'open') || (action === 'close' && currentStatus !== 'closed')) {
                await executeTask(sock, groupId, action, config);
            }
        }
    }
}

async function scheduleGroupTasks(sock) {
    const config = await loadConfig();

    for (const groupId in scheduledIntervals) {
        clearInterval(scheduledIntervals[groupId]);
        delete scheduledIntervals[groupId];
    }

    for (const groupId in config) {
        const groupConfig = config[groupId];
        if (!groupConfig.schedules || !groupConfig.schedules.length) continue;

        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            const botJid = normalizeJid(sock.user.id);
            const isBotAdmin = groupMetadata.participants.some(p => normalizeJid(p.id) === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
            if (!isBotAdmin) {
                console.error(`[GroupSchedule] Bot não é admin no grupo ${groupId}. Bot JID: ${botJid}`);
                continue;
            }

            await checkMissedTasks(sock, groupId, config);

            scheduledIntervals[groupId] = setInterval(async () => {
                try {
                    const now = moment();
                    const currentConfig = await loadConfig();
                    const currentGroupConfig = currentConfig[groupId];
                    if (!currentGroupConfig || !currentGroupConfig.schedules || !currentGroupConfig.schedules.length) {
                        clearInterval(scheduledIntervals[groupId]);
                        delete scheduledIntervals[groupId];
                        return;
                    }

                    for (const schedule of currentGroupConfig.schedules) {
                        const { action, time } = schedule;
                        const scheduledTime = moment(time, 'HH:mm').second(0).millisecond(0);
                        if (scheduledTime.isSame(now, 'second')) {
                            await executeTask(sock, groupId, action, currentConfig);
                        }
                    }
                } catch (error) {
                    console.error(`[GroupSchedule] Erro ao verificar tarefas para ${groupId}:`, error);
                }
            }, 10000); 
        } catch (error) {
            console.error(`[GroupSchedule] Erro ao configurar tarefas para ${groupId}:`, error);
        }
    }
}

function startGroupSchedule(sock) {
    scheduleGroupTasks(sock);

    setInterval(async () => {
        await scheduleGroupTasks(sock);
    }, 60 * 60 * 1000); // A cada hora
}

async function testTask(sock, groupId, action) {
    const config = await loadConfig();
    if (!config[groupId]) {
        console.error(`[GroupSchedule] Grupo ${groupId} não encontrado nas configurações`);
        return;
    }
    await executeTask(sock, groupId, action, config);
}

module.exports = { startGroupSchedule, loadConfig, saveConfig, formatDuration, groupStatusTimestamps, testTask };