const { createCommand } = require("../../loader.js");
const { downloadContentFromMessage } = require('baileys');
const { Config } = require("../../constants.js");
const axios = require('axios');

async function getFileBuffer(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

module.exports = createCommand({
    name: "translateimage",
    params: "<image> [language]",
    aliases: ["imgtranslate", "transimage"],
    menu: "outros",
    desc: "Traduz texto presente em imagens. Opcionalmente, especifique o idioma de destino (Portuguese, English, Spanish, French, German, Italian).",
    async run(int) {
        try {
            const { from, sock, info, args } = int;
            const query = args.join(' ');
            const isMedia = info.message?.imageMessage;
            const isQuoted = info.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const validLanguages = ["Portuguese", "English", "Spanish", "French", "German", "Italian"];

            if (!isMedia && !isQuoted) {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Você deve enviar ou marcar uma imagem`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            let targetLang;
            if (query) {
                targetLang = validLanguages.find(lang => lang.toLowerCase() === query.toLowerCase());
                if (!targetLang) {
                    await int.sock.sendMessage(
                        from,
                        {
                            text: `${Config.get("name")}: Idioma inválido. Use um dos seguintes: ${validLanguages.join(', ')}`,
                            ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                        },
                        { quoted: info }
                    );
                    return;
                }
            }

            let media;
            if (isQuoted?.imageMessage) {
                media = info.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
            } else if (isMedia) {
                media = info.message.imageMessage;
            } else {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: Você deve enviar ou marcar uma imagem`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            const buffer = await getFileBuffer(media, 'image');

            await int.react(int.sock, from, info.key, "🤖");
            await int.composing();

            const formData = new FormData();
            const blob = new Blob([buffer], { type: 'image/jpeg' });
            formData.append('image', blob, 'image.jpeg');
            if (targetLang) {
                formData.append('targetLang', targetLang);
            }

            const response = await axios.post('https://translate.aniexmanga.xyz/process-image', formData);

            if (!response.data.text) {
                await int.sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: ❌ Falha na tradução: Nenhum texto detectado na imagem`,
                        ephemeralExpiration: await int.getEphemeralDuration(sock, from)
                    },
                    { quoted: info }
                );
                return;
            }

            const translatedText = response.data.text || 'Nenhum texto detectado';
            const imageUrl = `https://translate.aniexmanga.xyz${response.data.imageUrl}`;
            const duration = await int.getEphemeralDuration(sock, from);

            const caption = `✦ 𝐖𝐀 𝐈𝐌𝐀𝐆𝐄 𝐓𝐑𝐀𝐍𝐒𝐋𝐀𝐓𝐈𝐎𝐍 ✦

• Texto Traduzido: ${translatedText}
• Idioma: ${targetLang || 'Padrão'}
• Data: ${new Date().toLocaleString()}`;

            await int.sock.sendMessage(
                from,
                {
                    image: { url: imageUrl },
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
            console.error('Erro na tradução:', e);
            await int.sock.sendMessage(
                int.from,
                {
                    text: `${Config.get("name")}: ❌ Erro: ${e.message || 'Falha ao processar a imagem'}`,
                    ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from)
                },
                {
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );
        }
    }
});