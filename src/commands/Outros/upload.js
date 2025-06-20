const { createCommand } = require("../../loader.js");
const uploadFile = require('../../modules/upload.js');
const fs = require('fs');
const { Config } = require("../../constants.js");
const { downloadContentFromMessage } = require('baileys');
const path = require('path');

async function getFileBuffer(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

module.exports = createCommand({
    name: "upload",
    params: "<media>",
    aliases: ["uploads", 'gerarlink'],
    menu: "outros",
    desc: "Faz Upload/Gera link de Arquivos",
    async run(int) {
        try {
            const { from, sock, info } = int;
            const isMedia = info.message?.imageMessage || info.message?.videoMessage ||
                info.message?.audioMessage || info.message?.stickerMessage;
            const isQuoted = info.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!isMedia && !isQuoted) {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Você deve enviar ou marcar uma mídia (imagem, vídeo, áudio ou sticker)`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            let mediaType, fileExt;
            if (isQuoted?.imageMessage || info.message?.imageMessage) {
                mediaType = 'image';
                fileExt = '.jpeg';
            } else if (isQuoted?.videoMessage || info.message?.videoMessage) {
                if ((info.message?.videoMessage?.seconds || 0) > 30) {
                    await int.sock.sendMessage(
                        from,
                        {
                            text: `${Config.get("name")}: Vídeos devem ter até 30 segundos`,
                            ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                        },
                        { quoted: info }
                    );
                    return;
                }
                mediaType = 'video';
                fileExt = '.mp4';
            } else if (isQuoted?.audioMessage || info.message?.audioMessage) {
                mediaType = 'audio';
                fileExt = '.mp3';
            } else if (isQuoted?.stickerMessage || info.message?.stickerMessage) {
                mediaType = 'sticker';
                fileExt = '.webp';
            } else {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Tipo de mídia não suportado`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            const media = isQuoted ?
                info.message.extendedTextMessage.contextInfo.quotedMessage[`${mediaType}Message`] :
                info.message[`${mediaType}Message`];

            const buffer = await getFileBuffer(media, mediaType);
            const tempDir = './assets/temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `upload_${Date.now()}${fileExt}`);
            fs.writeFileSync(tempFilePath, buffer);

            const result = await uploadFile(tempFilePath);
            fs.unlinkSync(tempFilePath);

            if (!result.success) {
                console.error('Erro no upload:', result.error);
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: ❌ Falha no upload: ${result.error}`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }
            const duration = await int.getEphemeralDuration(sock, from);

            await int.react(int.sock, from, info.key, "🤖");
            await int.composing();



            const expiresAt = result.file.expiresAt;

            let lermais = await int.GetLerMais();

            const displayDate = expiresAt ? new Date(expiresAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }) : 'nunca';

            const caption = `✦ 𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐔𝐏𝐋𝐎𝐀𝐃 ✦

*• Link:* ${"https://files.nexhub.fun" + result.file.url}

${lermais}            
• Informaçoes do User:
• Email: ${result.user.userEmail}

*• Limites Global:*
• Limite usado: ${result.limits.daily.used}
• Limite de Uploads: ${result.limits.daily.total}
• Limites Restantes Hoje: ${result.limits.daily.remaining}

*• Limite Para o tipo: ${result.file.type}*
• Limite Usado: ${result.limits.type.used}
• Limite de Uploads: ${result.limits.type.total}
• Limites Restantes Hoje: ${result.limits.type.remaining}

*• Informações do Arquivo: ${result.file.fileName}*

• Id: ${result.file.id}
• Bytes: ${result.file.fileSize}
• Tipo: ${result.file.type} | ${result.file.mimeType}
• Data de Upload: ${new Date(result.file.uploadedAt).toLocaleString('pt-BR')}
• Data de Expiração: ${displayDate}
• Acessos: ${result.file.accessCount}`;

            await int.sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: caption
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await int.react(int.sock, from, info.key, "✅");

        } catch (e) {
            console.error('Erro no upload:', e);
            await int.sock.sendMessage(
                from,
                {
                    text: `${Config.get("name")}: ❌ Erro: ${e.message || 'Falha ao processar a mídia'}`,
                    ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                },
                {
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );
        }
    }
});