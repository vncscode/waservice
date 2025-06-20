const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');

/**
 * Atualiza a variável BOT_MSG_REPLY no .env
 * @param {boolean} enable - true para ativar, false para desativar
 * @returns {boolean} - true se a atualização foi bem-sucedida
 */

function updateBotReply(enable) {
    try {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(
            /BOT_MSG_REPLY=.*/,
            `BOT_MSG_REPLY=${enable}`
        );
        fs.writeFileSync(envPath, envContent);
        return true;
    } catch (e) {
        console.error('Erro ao atualizar Bot Reply:', e);
        return false;
    }
}

module.exports = { updateBotReply };