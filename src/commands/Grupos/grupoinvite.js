const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const fs = require('fs');
const path = require('path');

module.exports = createCommand({
    name: "grouplink",
    params: "<-get> <-revogar>",
    aliases: ["linkgrupo", "invite"],
    isAdmin: true,
    menu: "grupos",
    desc: "Gerenciador de links de convite do grupo",
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

            // Verificações básicas
            if (!isGroup) {
                return await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Comando só pode ser executado em grupos!` },
                    messageOptions
                );
            }

            if (!isBotAdmins) {
                return await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Eu preciso ser administrador do grupo!` },
                    messageOptions
                );
            }

            // Lógica principal
            if (query.includes('-get')) {
                try {
                    const code = await sock.groupInviteCode(from);
                    const inviteLink = `https://chat.whatsapp.com/${code}`;
                    
                    await sock.sendMessage(
                        from,
                        { 
                            text: `• *Link do grupo:*\n${inviteLink}\n\n` +
                                  `• *Expira em 7 dias*\n` +
                                  `• Use *${Config.get("prefix")}grouplink -revogar* para gerar um novo`
                        },
                        messageOptions
                    );
                } catch (error) {
                    console.error('Erro ao obter link:', error);
                    await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Não foi possível obter o link. Verifique minhas permissões.` },
                        messageOptions
                    );
                }
                return;
            }

            if (query.includes('-revogar')) {
                if (!isGroupAdmins) {
                    return await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Você precisa ser administrador para revogar o link!` },
                        messageOptions
                    );
                }

                try {
                    const newCode = await sock.groupRevokeInvite(from);
                    const newLink = `https://chat.whatsapp.com/${newCode}`;
                    
                    await sock.sendMessage(
                        from,
                        { 
                            text: `• *Novo link gerado:*\n${newLink}\n\n` +
                                  `• O link anterior foi invalidado\n` +
                                  `• *Expira em 7 dias*`
                        },
                        messageOptions
                    );
                } catch (error) {
                    console.error('Erro ao revogar link:', error);
                    await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Falha ao revogar o link. Verifique minhas permissões.` },
                        messageOptions
                    );
                }
                return;
            }

            // Mensagem de ajuda
            await sock.sendMessage(
                from,
                { 
                    text: `${Config.get("name")} 📌 *Como usar:*\n\n` +
                          `🔹 *${Config.get("prefix")}grouplink -get*\n` +
                          `Mostra o link de convite atual\n\n` +
                          `🔹 *${Config.get("prefix")}grouplink -revogar*\n` +
                          `Gera um novo link (apenas admins)\n\n` +
                          `⚠️ Links expiram automaticamente em 7 dias`
                },
                messageOptions
            );

        } catch (e) {
            console.error('Erro no comando grouplink:', e);
            const duration = await int.getEphemeralDuration(sock, from);
            await sock.sendMessage(
                from,
                { text: `${Config.get("name")}: Ocorreu um erro grave no processamento.` },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: true
                }
            );
        }
    }
});