const fs = require('fs');
const path = require('path');
const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");

const IGNORE_DIRS = ['node_modules', '.git', '.npm', '.cache', 'logs', 'conn'];

async function generateFolderStructure(dir, prefix = '') {
    let structure = '';
    let items = [];

    try {
        items = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
        return `Não foi possível ler o diretório: ${path.basename(dir)} (${err.message}). Verifique o caminho ou as permissões.`;
    }

    items = items.filter(item => !IGNORE_DIRS.includes(item.name));

    items.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = (i === items.length - 1);
        const connector = isLast ? '└── ' : '├── ';
        const newPrefix = prefix + (isLast ? '    ' : '│   ');

        structure += prefix + connector + item.name + '\n';

        if (item.isDirectory()) {
            const fullPath = path.join(dir, item.name);
            structure += await generateFolderStructure(fullPath, newPrefix);
        }
    }
    return structure;
}

async function findDirectoryByName(startDir, dirName) {
    try {
        const items = await fs.promises.readdir(startDir, { withFileTypes: true });

        for (const item of items) {
            if (item.isDirectory()) {
                if (IGNORE_DIRS.includes(item.name)) {
                    continue;
                }

                const fullPath = path.join(startDir, item.name);

                if (item.name === dirName) {
                    return fullPath;
                }

                const foundPath = await findDirectoryByName(fullPath, dirName);
                if (foundPath) {
                    return foundPath;
                }
            }
        }
    } catch (error) {
    }
    return null;
}

module.exports = createCommand({
    name: "getstructure",
    aliases: ["structure", "lsdir", "tree"],
    params: "[nome da pasta]",
    isAdmin: true,
    menu: "system",
    desc: "Exibe a estrutura de pastas e arquivos do projeto ou de uma pasta específica.",

    async run(int) {
        const { from, sock, info, args, isDono } = int;
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        };

        await int.composing();

        await sock.sendMessage(from, { react: { text: '👀', key: info.key } });


        try {
            if (!isDono) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Comando só pode ser executado pelo meu Dono!`
                }, messageOptions);
                return;
            }

            let targetPath;
            if (args.length > 0) {
                const folderNameToFind = args.join(' ');
                const foundPath = await findDirectoryByName(process.cwd(), folderNameToFind);

                if (foundPath) {
                    targetPath = foundPath;
                } else {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Pasta '${folderNameToFind}' não encontrada em nenhum lugar do projeto.`
                    }, messageOptions);
                    return;
                }
            } else {
                targetPath = process.cwd();
            }

            const structure = await generateFolderStructure(targetPath);

            await int.composing();

            await sock.sendMessage(from, {
                text: `${Config.get("name")} • Estrutura de '${path.basename(targetPath)}':\n\n` +
                    `\`\`\`\n${structure}\n\`\`\``
            }, messageOptions);

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error('Erro no comando getstructure:', error);
        }
    }
});
