const fs = require("fs").promises;
const groupsPath = './assets/grupos/confs.json';
const antilinkPath = './assets/grupos/antilink.json';
const { sendAndDeleteMessage, deleteMessages, removeParticipant } = require("./MessageHandler");

async function handleAntilink(interaction, info) {
    const sock = interaction.sock;
    const chatId = interaction.from;
    const sender = interaction.sender;

    if (!interaction.isGroupMessage) return false;

    let groupData = {};
    try {
        await fs.access(groupsPath);
        groupData = JSON.parse(await fs.readFile(groupsPath, { encoding: 'utf-8' }));
    } catch {
        await fs.writeFile(groupsPath, '{}', { encoding: 'utf-8' });
    }

    if (!groupData[chatId]?.antilink) return false;

    // Ignora se for admin
    let isAdmin = false;
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        isAdmin = groupMetadata.participants.some(
            participant => participant.id === sender && participant.admin
        );
    } catch {
    }
    if (isAdmin) return false;

    // Detecta URLs (com ou sem https://)
    const urlRegex = /((https?:\/\/)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
    if (!urlRegex.test(interaction.body)) return false;

    // Dados de tentativas
    let antilinkData = {};
    try {
        await fs.access(antilinkPath);
        antilinkData = JSON.parse(await fs.readFile(antilinkPath, { encoding: 'utf-8' }));
    } catch {
        await fs.writeFile(antilinkPath, '{}', { encoding: 'utf-8' });
    }

    // Vê tentativas
    const userKey = `${sender}:${chatId}`;
    if (!antilinkData[userKey]) {
        antilinkData[userKey] = { attempts: 2, messageKeys: [] };
    }
    antilinkData[userKey].messageKeys.push(info.key);

    await deleteMessages(sock, chatId, [info.key]);

    if (antilinkData[userKey].attempts > 1) {
        antilinkData[userKey].attempts -= 1;
        await fs.writeFile(antilinkPath, JSON.stringify(antilinkData, null, 2));
        await sendAndDeleteMessage(sock, chatId, {
            text: `*🚫 [ ANTI-LINK ]*\n<@${sender.split("@")[0]}>, links não são permitidos! Mensagem deletada.`
        }, [sender]);
    } else {
        await deleteMessages(sock, chatId, antilinkData[userKey].messageKeys);
        await sendAndDeleteMessage(sock, chatId, {
            text: `*🚫 [ ANTI-LINK ]*\n<@${sender.split("@")[0]}> foi removido por enviar links após advertência. 🧍➡️🚫`
        }, [sender]);
        await removeParticipant(sock, chatId, sender);
        delete antilinkData[userKey];
        await fs.writeFile(antilinkPath, JSON.stringify(antilinkData, null, 2));
    }

    return true;
}


module.exports = { handleAntilink };