const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');
const { Config } = require('../constants');

const prefixo = Config.get("prefix");

function getSimilarCommands(userInput, allCommands) {
    const commandNames = allCommands.flatMap(cmd => [cmd.name, ...(cmd.aliases || [])]);
    return stringSimilarity.findBestMatch(userInput, commandNames);
}

function formatResponse(userInput, bestMatch, suggestedCmd, totalCommands, elapsedTime) {
    if (bestMatch.rating > 0.1) {
        return `*✦ 𝟒𝟎𝟒 𝐂𝐎𝐌𝐀𝐍𝐃𝐎 𝐍𝐎𝐓 𝐅𝐎𝐔𝐍𝐃 ✦*\n\n` +
            `▸ *Digitado:* \`${userInput}\`\n` +
            `▸ *Sugestão:* \`${Config.get("prefix")}${bestMatch.target}\`\n` +
            `↳ *Descrição:* ${suggestedCmd.desc || "Sem descrição"}\n` +
            `▸ *Semelhança:* ${(bestMatch.rating * 100).toFixed(2)}%\n` +
            `↳ *Comandos verificados:* ${totalCommands}\n` +
            `▸ *Tempo:* ${elapsedTime}ms`;
    }

    return `${Config.get("name")}: Apenas prefixo digitado, utilize ${prefixo}Menu.`;
}

function getAllCommandsWithDetails() {
    const commandsDir = path.join(__dirname, '../commands');
    const commands = [];
    let totalCommands = 0;

    try {
        fs.readdirSync(commandsDir).forEach(folder => {
            const folderPath = path.join(commandsDir, folder);
            if (fs.statSync(folderPath).isDirectory()) {
                fs.readdirSync(folderPath).forEach(file => {
                    if (file.endsWith('.js')) {
                        const command = require(path.join(folderPath, file));
                        commands.push({
                            name: command.name,
                            aliases: command.aliases || [],
                            desc: command.desc || "Sem descrição"
                        });
                        totalCommands++;
                    }
                });
            }
        });
    } catch (err) {
        console.error('Erro ao carregar comandos:', err);
        return { commands: [], totalCommands: 0 };
    }

    return { commands, totalCommands };
}

module.exports = {
    getSimilarCommands,
    formatResponse,
    getAllCommandsWithDetails
};