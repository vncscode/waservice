const fs = require('fs').promises;
const path = require('path');

const STATS_FILE = path.join(__dirname, '../../assets/sistema/UsersAndGroups.json');
const SAVE_DEBOUNCE_DELAY = 5000;

let saveTimeout = null;
let savePromise = Promise.resolve();


const INITIAL_STATS = {
    grupos: {},
    lastUpdated: new Date().toISOString()
};

const INITIAL_GROUP = {
    totalMensagens: 0,
    totalComandos: 0,
    comandos: {},
    usuarios: {},
    topComandos: []
};

const INITIAL_USER = {
    totalMensagens: 0,
    totalComandos: 0,
    comandosUsados: {},
    topComandos: []
};

function sanitizeData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Dados inválidos para atualização de estatísticas');
    }

    return {
        groupId: data.groupId || 'unknown',
        sender: data.sender || 'unknown',
        isCommand: Boolean(data.isCommand),
        commandName: data.isCommand ? (data.commandName || 'unknown') : null,
        timestamp: data.timestamp || new Date().toISOString()
    };
}

async function updateStats(rawData) {
    try {
        const data = sanitizeData(rawData);
        const stats = await loadStatsWithFallback();

        if (!stats.grupos[data.groupId]) {
            stats.grupos[data.groupId] = JSON.parse(JSON.stringify(INITIAL_GROUP));
        }

        const grupo = stats.grupos[data.groupId];
        grupo.totalMensagens = (grupo.totalMensagens || 0) + 1;

        if (data.isCommand && data.commandName) {
            grupo.totalComandos = (grupo.totalComandos || 0) + 1;
            grupo.comandos[data.commandName] = (grupo.comandos[data.commandName] || 0) + 1;
            grupo.topComandos = updateTopCommands(grupo.topComandos, data.commandName);
        }

        if (!grupo.usuarios[data.sender]) {
            grupo.usuarios[data.sender] = JSON.parse(JSON.stringify(INITIAL_USER));
        }

        const usuario = grupo.usuarios[data.sender];
        usuario.totalMensagens = (usuario.totalMensagens || 0) + 1;

        if (data.isCommand && data.commandName) {
            usuario.totalComandos = (usuario.totalComandos || 0) + 1;
            usuario.comandosUsados[data.commandName] = (usuario.comandosUsados[data.commandName] || 0) + 1;
            usuario.topComandos = updateTopCommands(usuario.topComandos, data.commandName);
        }

        stats.lastUpdated = new Date().toISOString();
        debouncedSaveStats(stats);
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
        throw error;
    }
}

function updateTopCommands(currentTop, commandName) {
    const newTop = [...currentTop];
    const existingIndex = newTop.findIndex(item => item.command === commandName);

    if (existingIndex >= 0) {
        newTop[existingIndex].count++;
    } else {
        newTop.push({ command: commandName, count: 1 });
    }

    return newTop
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

async function loadStatsWithFallback() {
    try {
        await fs.access(STATS_FILE);
        const data = await fs.readFile(STATS_FILE, 'utf8');
        return mergeStats(JSON.parse(data));
    } catch {
        return JSON.parse(JSON.stringify(INITIAL_STATS));
    }
}

function mergeStats(existingStats) {
    const merged = JSON.parse(JSON.stringify(INITIAL_STATS));

    if (!existingStats || typeof existingStats !== 'object') {
        return merged;
    }

    for (const [groupId, groupData] of Object.entries(existingStats.grupos || {})) {
        if (!groupId) continue;

        merged.grupos[groupId] = {
            ...INITIAL_GROUP,
            ...groupData,
            usuarios: mergeUsers(groupData.usuarios || {}),
            topComandos: groupData.topComandos || []
        };
    }

    merged.lastUpdated = existingStats.lastUpdated || new Date().toISOString();
    return merged;
}

function mergeUsers(existingUsers) {
    const merged = {};

    if (!existingUsers || typeof existingUsers !== 'object') {
        return merged;
    }

    for (const [userId, userData] of Object.entries(existingUsers)) {
        if (!userId) continue;

        merged[userId] = {
            ...INITIAL_USER,
            ...userData,
            topComandos: userData.topComandos || []
        };
    }
    return merged;
}

async function _saveStats(stats) {
    try {
        await fs.mkdir(path.dirname(STATS_FILE), { recursive: true });
        const tempFile = `${STATS_FILE}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(stats, null, 2));
        await fs.rename(tempFile, STATS_FILE);
    } catch (error) {
        console.error('Erro ao salvar estatísticas:', error);
        throw error;
    }
}

function debouncedSaveStats(stats) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        savePromise = savePromise.then(() => _saveStats(stats)).catch(error => console.error("Erro na promise de salvamento:", error));
    }, SAVE_DEBOUNCE_DELAY);
}

async function getGroupTopCommands(groupId) {
    if (!groupId) return [];
    try {
        const stats = await loadStatsWithFallback();
        return stats.grupos[groupId]?.topComandos || [];
    } catch {
        return [];
    }
}

async function getUserTopCommands(groupId, userId) {
    if (!groupId || !userId) return [];
    try {
        const stats = await loadStatsWithFallback();
        return stats.grupos[groupId]?.usuarios[userId]?.topComandos || [];
    } catch {
        return [];
    }
}

module.exports = {
    updateStats,
    getGroupTopCommands,
    getUserTopCommands
};