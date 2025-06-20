async function sendAndDeleteMessage(sock, chatId, message, mentions = [], deleteAfter = 15000) {
    try {
        const msg = await sock.sendMessage(chatId, { ...message, mentions });
        setTimeout(() => sock.sendMessage(chatId, { delete: msg.key }).catch(() => {}), deleteAfter);
        return msg;
    } catch (error) {
        console.error(`[ERROR] Falha ao enviar mensagem para ${chatId}:`, error);
        return null;
    }
}

async function deleteMessages(sock, chatId, messageKeys = [], retries = 3, delay = 1000) {
    for (const key of messageKeys) {
        let attempts = 0;
        while (attempts < retries) {
            try {
                if (!key || !key.id) {
                    break;
                }
                await sock.sendMessage(chatId, { delete: key });
                break;
            } catch (error) {
                attempts++;
                console.error(`[ERROR] Falha ao deletar mensagem ${key?.id || 'desconhecida'} em ${chatId} (tentativa ${attempts}):`, error);
                if (attempts < retries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }
}

async function removeParticipant(sock, chatId, participant) {
    try {
        await sock.groupParticipantsUpdate(chatId, [participant], "remove");
    } catch (error) {
        if (error.message.includes('not-authorized')) {
            await sendAndDeleteMessage(sock, chatId, {
                text: '*⚠️ Erro*: Não tenho permissão para remover participantes. Verifique se sou administrador!'
            });
        }
        console.error(`[ERROR] Falha ao remover participante ${participant} de ${chatId}:`, error);
        throw error;
    }
}


module.exports = { deleteMessages, sendAndDeleteMessage, removeParticipant };