const { createCommand } = require("../../loader.js");
const { Config } = require("../../constants.js"); 
module.exports = createCommand({
    name: "totag",
    aliases: ["cita", "hidetag", "tagall"],
    params: "<text> <medias>",
    isAdmin: true,
    menu: "grupo",
    desc: "Marca todos os membros do grupo com uma mensagem.",
    async run(int) {
        try {
            const { args, from, isGroupAdmins, isBotGroupAdmins, info, sock, isQuotedImage, isQuotedVideo, isQuotedDocument, isQuotedDocW, isQuotedAudio, isQuotedSticker, isQuotedMsg, pushname } = int;
            const fullText = args.join(' ');
            const q = fullText.replace(/^!(totag|cita|hidetag)\s*/i, '');
            const duration = await int.getEphemeralDuration(sock, from);
            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            };

            if (!q) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Marque uma <media> ou insira um <texto> após o comando!`
                }, messageOptions);
            }

            if (!from.endsWith('@g.us')) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Este comando só pode ser usado em grupos!`
                }, messageOptions);
            }

            if (!isGroupAdmins) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Você precisa ser administrador do grupo para executar este comando!`
                }, messageOptions);
            }

            if (!isBotGroupAdmins) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Eu preciso ser administrador do grupo para executar este comando!`
                }, messageOptions);
            }

            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            const MRC_TD = participants.map(i => i.id);

            const rsm = info.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const pink = isQuotedImage ? rsm?.imageMessage : info.message?.imageMessage;
            const blue = isQuotedVideo ? rsm?.videoMessage : info.message?.videoMessage;
            const purple = isQuotedDocument ? rsm?.documentMessage : info.message?.documentMessage;
            const yellow = isQuotedDocW ? rsm?.documentWithCaptionMessage?.message?.documentMessage : info.message?.documentWithCaptionMessage?.message?.documentMessage;
            const aud_d = isQuotedAudio ? rsm?.audioMessage : "";
            const figu_d = isQuotedSticker ? rsm?.stickerMessage : "";
            const red = isQuotedMsg && !aud_d && !figu_d && !pink && !blue && !purple && !yellow ? rsm?.conversation : info.message?.conversation;
            const green = rsm?.extendedTextMessage?.text || info?.message?.extendedTextMessage?.text;

            let DFC = "";

            if (pink && !aud_d && !purple) {
                DFC = {
                    ...pink,
                    caption: q || "",
                    image: { url: pink.url },
                    mentions: MRC_TD
                };
            } else if (blue && !aud_d && !purple) {
                DFC = {
                    ...blue,
                    caption: q || "",
                    video: { url: blue.url },
                    mentions: MRC_TD
                };
            } else if (red && !aud_d && !purple) {
                DFC = {
                    text: q || red.replace(/^!(totag|cita|hidetag)\s*/i, ''),
                    mentions: MRC_TD
                };
            } else if (!aud_d && !figu_d && green && !purple) {
                DFC = {
                    text: q || green.replace(/^!(totag|cita|hidetag)\s*/i, ''),
                    mentions: MRC_TD
                };
            } else if (purple) {
                DFC = {
                    ...purple,
                    document: { url: purple.url },
                    mentions: MRC_TD
                };
            } else if (yellow && !aud_d) {
                DFC = {
                    ...yellow,
                    caption: q || "",
                    document: { url: yellow.url },
                    mentions: MRC_TD
                };
            } else if (figu_d && !aud_d) {
                DFC = {
                    ...figu_d,
                    sticker: { url: figu_d.url },
                    mentions: MRC_TD
                };
            } else if (aud_d) {
                DFC = {
                    ...aud_d,
                    audio: { url: aud_d.url },
                    mentions: MRC_TD,
                    ptt: true
                };
            } else {
                DFC = {
                    text: q || `Marcação de @${pushname}`,
                    mentions: MRC_TD
                };
            }

            await sock.sendMessage(from, DFC, messageOptions);

            await sock.sendMessage(
                from,
                {
                    react: {
                        text: '✅',
                        key: info.key
                    }
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true
                }
            );

        } catch (e) {
            console.error('Erro no comando totag:', e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: ❌ Ocorreu um erro ao tentar marcar os membros: ${e.message}`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});