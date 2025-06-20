const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
/**
 * Atualiza a variável BOT_ANTIPV no .env
 * @param {boolean} enable - true para ativar, false para desativar
 * @returns {boolean} - true se a atualização foi bem-sucedida
 */
function updateAntiPV(enable) {
    try {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(
            /BOT_ANTIPV=.*/,
            `BOT_ANTIPV=${enable}`
        );
        fs.writeFileSync(envPath, envContent);
        return true;
    } catch (e) {
        console.error('Erro ao atualizar Anti-PV:', e);
        return false;
    }
}

module.exports = { updateAntiPV };