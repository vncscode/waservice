const { createCommand } = require("../../loader.js");

const {
    geminiText,
    GeminiImage,
    GeminiEditImage,
    getFileBuffer
} = require('../../modules/gemini.js');
const { Config } = require("../../constants.js");

module.exports = createCommand({
    name: "gemini",
    params: "<text> [image modification/generation]",
    aliases: [],
    menu: "inteligencias",
    desc: "Interage com a Gemini AI para texto, geração de imagem ou edição de imagem.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const isQuotedImage = info.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const isSentImage = info.message?.imageMessage;
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query && !isQuotedImage && !isSentImage) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar o comando Gemini, forneça texto para conversar, peça uma imagem (ex: 'Gerar imagem de um gato'), ou marque uma imagem para editar com um texto.`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
                return;
            }

            await sock.sendMessage(from, { react: { text: '🔄', key: info.key } });

            await int.composing();

            if (isQuotedImage || isSentImage) {
                const media = isQuotedImage || isSentImage;
                const buffer = await getFileBuffer(media, 'image');

                if (!query) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Você marcou uma imagem, mas não forneceu um comando de edição. Por favor, digite o que você quer fazer com a imagem.`
                    }, {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    });
                    await sock.sendMessage(from, { react: { text: '❌', key: info.key } });
                    return;
                }

                await int.recording();

                const editResult = await GeminiEditImage(buffer, query);

                if (editResult.success) {
                    await sock.sendMessage(
                        from,
                        {
                            image: { url: editResult.imageMetadata.url },
                            caption: `*📌 Gemini Image Editor - ${Config.get("name")}*\n\nComando: ${query}`
                        },
                        {
                            ephemeralExpiration: duration,
                            disappearingMessagesInChat: true,
                            quoted: info
                        }
                    );
                    await sock.sendMessage(from, { react: { text: '✅', key: info.key } });
                } else {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Houve um problema ao editar a imagem: ${editResult.message}`
                    }, {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    });
                    await sock.sendMessage(from, { react: { text: '❌', key: info.key } });
                }
                return;
            }

            const generateImageKeywords = [
                "gerar imagem", "crie uma imagem", "faça uma imagem", "gen img", "Criar imagem",
                "imagem", "logos", "Logo", "Logos", "logo", "foto", "Foto", "Logo", "Create",
                "desenhe algo", "criar arte", "imagem ai", "img ai", "criar imagem", "gerar",
                "gerar arte", "desenho", "art", "arte", "make an image", "imagine",
                "generate image", "create image", "draw something", "draw for me",
                "imagem automática", "ilustração", "figure", "visual", "generate"
            ];

            const isImageGenerationRequest = generateImageKeywords.some(keyword =>
                query.toLowerCase().startsWith(keyword)
            );

            if (isImageGenerationRequest) {
                const promptText = query.replace(new RegExp(`^(${generateImageKeywords.join('|')})\\s*`, 'i'), '').trim();

                if (!promptText) {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Por favor, forneça uma descrição para a imagem que você quer gerar.`
                    }, {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    });
                    await sock.sendMessage(from, { react: { text: '❌', key: info.key } });
                    return;
                }

                await int.recording();

                const genImageResult = await GeminiImage(promptText);

                if (genImageResult.success) {
                    await sock.sendMessage(
                        from,
                        {
                            image: { url: genImageResult.imageMetadata.url },
                            caption: `*📌 Gemini Generate Images - ${Config.get("name")}*`
                        },
                        {
                            ephemeralExpiration: duration,
                            disappearingMessagesInChat: true,
                            quoted: info
                        }
                    );
                    await sock.sendMessage(from, { react: { text: '✅', key: info.key } });
                } else {
                    await sock.sendMessage(from, {
                        text: `${Config.get("name")}: Seu pedido de imagem não foi bem aceito pelo Gemini. Tente novamente com uma descrição diferente.`
                    }, {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    });
                    await sock.sendMessage(from, { react: { text: '❌', key: info.key } });
                }
                return;
            }

            await int.recording();
            const GeminiResponse = await geminiText(query);

            const CapctionMsg = `*✦  𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐆𝐄𝐌𝐈𝐍𝐈 ✦*\n\n▸ ${GeminiResponse}`

            await sock.sendMessage(
                from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: CapctionMsg
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (e) {
            console.error('Erro no comando Gemini Unificado:', e);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: ❌ Ocorreu um erro inesperado: ${e.message || 'Falha ao processar sua solicitação.'}`
            }, {
                disappearingMessagesInChat: true,
                quoted: int.info
            });
            await int.sock.sendMessage(int.from, { react: { text: '❌', key: int.info.key } });
        }
    }
});