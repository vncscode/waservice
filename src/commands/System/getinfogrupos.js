const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const fs = require('fs');
const path = require('path');

module.exports = createCommand({
    name: "getinfogrupo",
    aliases: ["stats", "estatisticas"],
    params: "<-all>",
    isAdmin: true,
    menu: "system",
    desc: "Mostra estatísticas do grupo atual ou de todos os grupos (-all)",
    async run(int) {
        const { from, sock, isGroup, info, args, isDono } = int;
        const showAll = args.includes('-all');
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        };

        await int.composing();

        try {
            const statsPath = path.join(__dirname, '../../../assets/sistema/UsersAndGroups.json');
            if (!fs.existsSync(statsPath)) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Arquivo de estatísticas não encontrado.`
                }, messageOptions);
                return;
            }

            const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

            if (showAll) {
                if (!isDono) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Apenas donos podem ver estatísticas de todos os grupos.`
                    }, messageOptions);
                    return;
                }

                let consolidatedData = {
                    totalMessages: 0,
                    totalCommands: 0,
                    users: {},
                    commands: {},
                    totalGroups: Object.keys(statsData.grupos || {}).length
                };

                // Processa todos os grupos
                Object.values(statsData.grupos || {}).forEach(group => {
                    consolidatedData.totalMessages += group.totalMensagens || 0;
                    consolidatedData.totalCommands += group.totalComandos || 0;

                    // Usuários
                    Object.entries(group.usuarios || {}).forEach(([userId, userData]) => {
                        if (!consolidatedData.users[userId]) {
                            consolidatedData.users[userId] = {
                                totalMensagens: 0,
                                totalComandos: 0
                            };
                        }
                        consolidatedData.users[userId].totalMensagens += userData.totalMensagens || 0;
                        consolidatedData.users[userId].totalComandos += userData.totalComandos || 0;
                    });

                    // Comandos
                    if (group.comandos) {
                        Object.entries(group.comandos).forEach(([cmd, count]) => {
                            consolidatedData.commands[cmd] = (consolidatedData.commands[cmd] || 0) + count;
                        });
                    }
                });

                // Prepara os dados para exibição
                const lastUpdated = statsData.lastUpdated ?
                    new Date(statsData.lastUpdated).toLocaleString('pt-BR') :
                    'Não disponível';

                // Top 5 usuários
                const topUsersAll = Object.entries(consolidatedData.users)
                    .sort((a, b) => (b[1].totalMensagens || 0) - (a[1].totalMensagens || 0))
                    .slice(0, 5)
                    .map(([userId, userData], index) => {
                        const percentage = consolidatedData.totalMessages > 0 ?
                            (userData.totalMensagens / consolidatedData.totalMessages) * 100 : 0;
                        const shortId = userId.replace('@s.whatsapp.net', '').slice(-4);
                        return `• ${index + 1}. [${shortId}]: ${userData.totalMensagens} msg (${percentage.toFixed(1)}%)`;
                    })
                    .join('\n');

                // Top 5 comandos
                const topCommandsAll = Object.entries(consolidatedData.commands)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cmd, count], index) => `• ${index + 1}. !${cmd}: ${count} vezes`)
                    .join('\n') || 'Nenhum comando registrado';

                const response = `${Config.get("name")} • ESTATÍSTICAS GERAIS (${consolidatedData.totalGroups} grupos)

• Mensagens totais: ${consolidatedData.totalMessages}
• Comandos usados: ${consolidatedData.totalCommands}

• Top 5 usuários mais ativos:
${Object.keys(consolidatedData.users).length > 0 ? topUsersAll : 'Nenhum dado disponível'}

• Top 5 comandos usados:
${topCommandsAll}

• Atualizado em: ${lastUpdated}`;

                await sock.sendMessage(from, {
                    text: response
                }, messageOptions);

            } else {
                if (!isGroup) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Este comando só pode ser usado em grupos (use -all para estatísticas gerais).`
                    }, messageOptions);
                    return;
                }

                const groupStats = statsData.grupos[from];
                if (!groupStats) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Não há estatísticas disponíveis para este grupo ainda.`
                    }, messageOptions);
                    return;
                }

                const totalMessages = groupStats.totalMensagens || 0;
                const totalCommands = groupStats.totalComandos || 0;
                const lastUpdated = statsData.lastUpdated ?
                    new Date(statsData.lastUpdated).toLocaleString('pt-BR') :
                    'Não disponível';

                // Top 5 usuários
                const usersData = Object.entries(groupStats.usuarios || {});
                const topUsers = usersData
                    .sort((a, b) => (b[1].totalMensagens || 0) - (a[1].totalMensagens || 0))
                    .slice(0, 5)
                    .map(([userId, userData], index) => {
                        const userMessages = userData.totalMensagens || 0;
                        const percentage = totalMessages > 0 ? (userMessages / totalMessages) * 100 : 0;
                        const shortId = userId.replace('@s.whatsapp.net', '').slice(-4);
                        return `• ${index + 1}. [${shortId}]: ${userMessages} msg (${percentage.toFixed(1)}%)`;
                    })
                    .join('\n');

                // Top comandos
                let topCommands = 'Nenhum comando registrado';
                if (groupStats.comandos && Object.keys(groupStats.comandos).length > 0) {
                    topCommands = Object.entries(groupStats.comandos)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([cmd, count], index) => `• ${index + 1}. !${cmd}: ${count} vezes`)
                        .join('\n');
                }

                const response = `${Config.get("name")} • ESTATÍSTICAS DO GRUPO

• Mensagens totais: ${totalMessages}
• Comandos usados: ${totalCommands}

• Top 5 usuários:
${usersData.length > 0 ? topUsers : 'Nenhum dado disponível'}

• Top comandos:
${topCommands}

• Atualizado em: ${lastUpdated}`;

                await sock.sendMessage(from, {
                    text: response
                }, messageOptions);
            }

        } catch (error) {
            console.error('Erro no comando estatisticas:', error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Ocorreu um erro ao processar as estatísticas: ${error.message}`
            }, messageOptions);
        }
    }
});