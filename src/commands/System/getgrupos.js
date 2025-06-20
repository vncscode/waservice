const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");

module.exports = createCommand({
    name: "listgroups",
    aliases: ["lstgps", "grouplist"],
    params: "<-leave [número] | -info [número]>",
    isAdmin: true,
    menu: "system",
    desc: "Lista todos os grupos ou mostra informações detalhadas de um grupo específico",
    async run(int) {
        const { from, sock, info, args, isDono } = int;
        const leaveIndex = args.indexOf('-leave');
        const infoIndex = args.indexOf('-info');
        const groupNumber = leaveIndex !== -1 ? args[leaveIndex + 1] :
            infoIndex !== -1 ? args[infoIndex + 1] : null;
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        };

        await int.composing();

        try {

            if (!int.isDono) {
                await int.sock.sendMessage(int.from, {
                    text: `${Config.get("name")}: Comando só pode ser executado pelo meu Dono!`
                }, messageOptions);

            }
            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);

            if ((leaveIndex !== -1 || infoIndex !== -1) && !isDono) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Apenas donos podem usar -leave ou -info`
                }, messageOptions);
                return;
            }

            if (leaveIndex !== -1 && groupNumber) {
                const num = parseInt(groupNumber);
                if (isNaN(num)) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Número inválido`
                    }, messageOptions);
                    return;
                }

                if (num < 1 || num > groupList.length) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Número fora do intervalo (1-${groupList.length})`
                    }, messageOptions);
                    return;
                }

                const groupToLeave = groupList[num - 1];
                try {
                    await sock.groupLeave(groupToLeave.id);
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Saiu do grupo:\n• "${groupToLeave.subject || 'Sem nome'}"\n• ID: ${groupToLeave.id.replace('@g.us', '')}`
                    }, messageOptions);
                } catch (error) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Erro ao sair: ${error.message}`
                    }, messageOptions);
                }
                return;
            }

            if (infoIndex !== -1 && groupNumber) {
                const num = parseInt(groupNumber);
                if (isNaN(num)) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Número inválido`
                    }, messageOptions);
                    return;
                }

                if (num < 1 || num > groupList.length) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Número fora do intervalo (1-${groupList.length})`
                    }, messageOptions);
                    return;
                }

                const selectedGroup = groupList[num - 1];
                try {
                    const metadata = await sock.groupMetadata(selectedGroup.id);
                    const participants = metadata.participants || [];
                    const admins = participants.filter(p => p.admin).length;

                    const creationDate = new Date(metadata.creation * 1000).toLocaleString('pt-BR');

                    const description = metadata.desc ?
                        metadata.desc.split('\n').map(line => `    ${line}`).join('\n') :
                        'Sem descrição';

                    let response = `${Config.get("name")} • INFORMAÇÕES DO GRUPO [${num}]\n\n` +
                        `• Nome: ${metadata.subject || 'Sem nome'}\n` +
                        `• ID: ${metadata.id.replace('@g.us', '')}\n` +
                        `• Membros: ${participants.length}\n` +
                        `• Administradores: ${admins}\n` +
                        `• Criado em: ${creationDate}\n` +
                        `• Descrição:\n${description}\n\n` +
                        `• Modo restrito: ${metadata.restrict ? 'Ativo' : 'Inativo'}\n` +
                        `• Anúncios: ${metadata.announce ? 'Ativo' : 'Inativo'}\n` +
                        `• Aprovação necessária: ${metadata.joinApprovalMode ? 'Sim' : 'Não'}`;

                    await sock.sendMessage(from, {
                        text: response
                    }, messageOptions);
                } catch (error) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: • Erro ao obter informações: ${error.message}`
                    }, messageOptions);
                }
                return;
            }

            let response = `${Config.get("name")} • LISTA DE GRUPOS (${groupList.length})\n\n`;

            groupList.forEach((group, index) => {
                const participants = group.participants || [];
                const admins = participants.filter(p => p.admin).length;

                response += `• [${index + 1}] ${group.subject || 'Sem nome'}\n` +
                    `• ${participants.length} membros | ${admins} admins\n` +
                    `• ID: ...${group.id.replace('@g.us', '').slice(-6)}\n` +
                    (index < groupList.length - 1 ? `\n` : '');
            });

            await sock.sendMessage(from, {
                text: response
            }, messageOptions);

        } catch (error) {
            console.error('Erro no comando listgroups:', error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: • Erro: ${error.message}`
            }, messageOptions);
        }
    }
});