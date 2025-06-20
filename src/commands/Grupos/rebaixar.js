const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");

module.exports = createCommand({
    name: "despromover",
    params: "<@usuário>",
    aliases: ["demote", "down", "rebaixar"],
    isAdmin: true,
    menu: "grupos",
    desc: "Rebaixa um administrador para membro comum",
    async run(int) {
        try {
            const { from, sock, isGroup, mentionedJid, isBotAdmins, isGroupAdmins, groupMembers, groupAdmins, info } = int;
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
                    { text: `${Config.get("name")}: Este comando só pode ser usado em grupos!` },
                    messageOptions
                );
                return;
            }

            if (!isBotAdmins) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Eu preciso ser administrador do grupo para executar este comando!` },
                    messageOptions
                );
                return;
            }

            if (!isGroupAdmins) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Você precisa ser administrador do grupo para executar este comando!` },
                    messageOptions
                );
                return;
            }

            await int.sock.sendMessage(
                from,
                {
                    react: {
                        text: '🤖',
                        key: info.key
                    }
                }
            )


            // Obter o JID do usuário a ser despromovido
            let userJid = mentionedJid && mentionedJid.length > 0 ? mentionedJid[0] : null;

            // Se não houver menção, tentar obter o JID da mensagem citada
            if (!userJid && info.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                userJid = info.message.extendedTextMessage.contextInfo.participant;
            }

            if (!userJid) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Marque um usuário com @ ou cite a mensagem dele.` },
                    messageOptions
                );
                return;
            }

            if (mentionedJid && mentionedJid.length > 1) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Por favor, marque apenas um usuário por vez.` },
                    messageOptions
                );
                return;
            }

            // Verificar se o usuário está no grupo
            const isMember = groupMembers.some(member => member.id === userJid);
            if (!isMember) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Este usuário não está no grupo ou saiu, não será possível despromover.` },
                    messageOptions
                );
                return;
            }

            await int.composing();

            // Verificar se o usuário não é administrador
            const isNotAdmin = !groupAdmins.includes(userJid);
            if (isNotAdmin) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Este usuário já é um membro comum do grupo.` },
                    messageOptions
                );
                return;
            }

            await sock.groupParticipantsUpdate(from, [userJid], "demote");
            await sock.sendMessage(
                from,
                { 
                    text: `${Config.get("name")}: @${userJid.split("@")[0]} foi rebaixado para membro comum com sucesso.`, 
                    mentions: [userJid] 
                },
                messageOptions
            );

        } catch (e) {
            console.error('Erro no comando despromover:', e);
            const { sock, from, info } = int;
            const duration = await int.getEphemeralDuration(sock, from);
            await sock.sendMessage(
                from,
                { text: `${Config.get("name")}: Ocorreu um erro ao tentar despromover o usuário.` },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );
        }
    }
});