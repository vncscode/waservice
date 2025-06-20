const { createCommand } = require("../../loader.js");
const uploadFile = require('nex-uploader');
const fs = require('fs');
const { Config } = require("../../constants.js");
const { downloadContentFromMessage } = require('baileys');
const transcribeAsposeAudio = require('../../modules/transcrever.js');
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
    name: "transcrever",
    params: "<áudio>",
    aliases: ["transcribe", 'transcrição', 'totext'],
    menu: "outros",
    desc: "Transcreve áudios para texto",
    async run(int) {
        try {
            const { from, sock, info } = int;
            const isAudio = info.message?.audioMessage;
            const isQuotedAudio = info.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage;

            if (!isAudio && !isQuotedAudio) {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: ❌ Você deve enviar ou responder a um áudio para transcrever`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            const media = isQuotedAudio ?
                info.message.extendedTextMessage.contextInfo.quotedMessage.audioMessage :
                info.message.audioMessage;

            if (media.seconds > 300) {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: ❌ Áudios muito longos (mais de 5 minutos) não são suportados`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            await int.react(int.sock, from, info.key, "🤖");

            const buffer = await getFileBuffer(media, 'audio');

            const tempDir = './assets/temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `audio_${Date.now()}.mp3`);
            fs.writeFileSync(tempFilePath, buffer);

            const uploadResult = await uploadFile(tempFilePath);
            fs.unlinkSync(tempFilePath);

            if (!uploadResult.success || !uploadResult.data?.links?.[0]?.link) {
                console.error('Erro no upload:', uploadResult.error);
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: ❌ Falha no upload do áudio`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            const audioUrl = uploadResult.data.links[0].link;

            await int.composing();

            let lermais = await int.GetLerMais();

            const { success, error, transcription } = await transcribeAsposeAudio(audioUrl, 'audio.mp3');

            const duration = await int.getEphemeralDuration(sock, from);

            if (!success || !transcription) {
                let errorMsg = `${Config.get("name")}: ❌ Falha na transcrição`;
                if (error) errorMsg += `\nMotivo: ${error}`;

                errorMsg += `\n\n🔗 Áudio: ${audioUrl}\n💡 Dica: Áudios claros com falas próximas ao microfone funcionam melhor`;

                await int.sock.sendMessage(
                    from,
                    { text: errorMsg },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    }
                );
                return;
            }

            // CORREÇÃO: Garantir o acesso ao texto da transcrição
            const transcriptionText = transcription.text || transcription.data || 'Nenhum texto identificado';
            const language = transcription.language || 'pt-BR';
            const audioDuration = transcription.duration ? `${transcription.duration}s` : `${media.seconds}s (estimada)`;

            // Formatar texto com melhor legibilidade
            const formattedText = transcriptionText
                .replace(/([.!?])\s+/g, '$1\n\n')
                .replace(/(\w{30,})/g, '$1\n')
                .trim();

            const caption = `✦ 𝐓𝐑𝐀𝐍𝐒𝐂𝐑𝐈𝐂̧𝐀̃𝐎 𝐃𝐄 𝐀́𝐔𝐃𝐈𝐎 ✦

• Áudio: ${audioUrl}
• Duração: ${audioDuration}
• Idioma: ${language}
• Texto contido no audio:
${lermais}
${formattedText}`;

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
            console.error('Erro na transcrição:', e);
            await int.sock.sendMessage(
                from,
                {
                    text: `${Config.get("name")}: ❌ Erro no processamento\n${e.message || 'Erro desconhecido'}`,
                    ephemeralExpiration: await int.getEphemeralDuration(int.sock, from)
                },
                {
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );
        }
    }
});