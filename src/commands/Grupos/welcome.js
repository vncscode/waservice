const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const fs = require('fs');
const path = require('path');


const configPath = path.join(__dirname, '../../../assets/grupos/confs.json');


function loadConfig() {
    try {

        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, '{}');
            return {};
        }

        const data = fs.readFileSync(configPath, 'utf-8');
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
        return {};
    }
}


async function saveConfig(config) {
    try {
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error('Erro ao salvar configurações:', e);
    }
}

module.exports = createCommand({
    name: "welcome",
    params: "<-start> <-stop>",
    aliases: ["bemvindo", 'boasvindas'],
    isAdmin: true,
    menu: "grupos",
    desc: "Saudação para novos integrantes do grupo.",
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

            if (!isGroup) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Comando só pode ser executado em Grupos!` },
                    messageOptions
                );
                return;
            }

            if (!isBotAdmins) {
                await sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Eu preciso ser administrador do grupo para executar este comando!`
                    },
                    messageOptions
                );
                return;
            }

            await int.composing();

            if (!isGroupAdmins) {
                await sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Voce precisa ser administrador do grupo para executar este comando!`
                    },
                    messageOptions
                );
                return;
            }

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar esse comando, insira -start para Habilitar o Welcome ou -stop para desabilitalo.`
                }, messageOptions);
                return;
            }

            const groupId = from;
            let fileconf = loadConfig();

            if (query.includes('-start')) {

                fileconf[groupId] = {
                    ...(fileconf[groupId] || {}),
                    welcome: true
                };

                await saveConfig(fileconf);
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Welcome ativado com sucesso para este grupo!`
                }, messageOptions);
            } else if (query.includes('-stop')) {
                // Desativar welcome
                fileconf[groupId] = {
                    ...(fileconf[groupId] || {}),
                    welcome: false
                };

                await saveConfig(fileconf);
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Welcome desativado com sucesso para este grupo!`
                }, messageOptions);
            } else {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Parâmetro inválido. Use -start para ativar ou -stop para desativar.`
                }, messageOptions);
            }

        } catch (e) {
            console.error('Erro no comando Welcome:', e);
            const duration = await int.getEphemeralDuration(sock, from);
            await sock.sendMessage(
                from,
                { text: `${Config.get("name")}: Ocorreu um erro ao processar o comando.` },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: true
                }
            );
        }
    }
});