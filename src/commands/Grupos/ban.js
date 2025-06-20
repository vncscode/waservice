const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");

module.exports = createCommand({
    name: "banir",
    params: "<@usuário> <mensagem>",
    aliases: ["ban", "remove"],
    isAdmin: true,
    menu: "grupos",
    desc: "Remove um usuário do grupo permanentemente",
    async run(int) {
        try {
            const { from, sock, isGroup, mentionedJid, isBotAdmins, isGroupAdmins, groupMembers, groupAdmins, info, args } = int;
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

            await int.react(sock, from, info.key, "🤖");


            if (!isGroupAdmins) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Você precisa ser administrador do grupo para executar este comando!` },
                    messageOptions
                );
                return;
            }

            let userJid = mentionedJid && mentionedJid.length > 0 ? mentionedJid[0] : null;

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


            const isMember = groupMembers.some(member => member.id === userJid);
            if (!isMember) {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Este usuário já não está no grupo.` },
                    messageOptions
                );
                return;
            }

            if (userJid === info.participant || userJid === sock.user.id.split(':')[0] + '@s.whatsapp.net') {
                await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Você não pode banir a si mesmo ou ao bot.` },
                    messageOptions
                );
                return;
            }


            const motivo = args.slice(mentionedJid ? 1 : 0).join(' ') || 'Nenhum motivo especificado';


            await sock.groupParticipantsUpdate(from, [userJid], "remove");


            await sock.sendMessage(
                from,
                { 
                    text: `${Config.get("name")}: @${userJid.split("@")[0]} foi banido do grupo.\nMotivo: ${motivo}`, 
                    mentions: [userJid] 
                },
                messageOptions
            );

        } catch (e) {
            console.error('Erro no comando banir:', e);
            const duration = await int.getEphemeralDuration(sock, from);
            await sock.sendMessage(
                from,
                { text: `${Config.get("name")}: Ocorreu um erro ao tentar banir o usuário.` },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );
        }
    }
});