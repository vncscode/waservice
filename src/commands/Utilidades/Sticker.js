const { createCommand } = require("../../loader.js");
const { downloadContentFromMessage } = require('baileys');
const { Config } = require("../../constants.js");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const sharp = require('sharp');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuração de diretório temporário seguro
const TEMP_DIR = path.join(os.tmpdir(), 'sticker_temp');
fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => {});

async function getFileBuffer(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function trimVideo(inputPath, outputPath, duration = 10) {
    return new Promise((resolve, reject) => {
        exec(
            `ffmpeg -i "${inputPath}" -t ${duration} ` +
            `-vf "fps=15,scale=512:512:flags=lanczos" ` +
            `-c:v libwebp -lossless 0 -q:v 70 -loop 0 -an ` +
            `-fs 1.5M "${outputPath}"`, // Limite de 1.5MB para evitar estouro
            (error) => error ? reject(error) : resolve()
        );
    });
}

async function processVideoToWebp(buffer) {
    const tempInput = path.join(TEMP_DIR, `input_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`);
    const tempOutput = path.join(TEMP_DIR, `output_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webp`);

    try {
        // Verificação de espaço disponível
        const stats = await fs.statfs(TEMP_DIR);
        const requiredSpace = buffer.length * 2;
        if (stats.bfree * stats.bsize < requiredSpace) {
            throw new Error('Espaço em disco insuficiente para processamento');
        }

        await fs.writeFile(tempInput, buffer);
        await trimVideo(tempInput, tempOutput);
        return await fs.readFile(tempOutput);
    } finally {
        // Limpeza garantida com tratamento de erro
        fs.unlink(tempInput).catch(() => {});
        fs.unlink(tempOutput).catch(() => {});
    }
}

async function applyShape(buffer, shape) {
    const size = 512;
    const resized = await sharp(buffer)
        .resize(size, size, {
            fit: sharp.fit.contain,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

    return await sharp(resized)
        .composite([{
            input: Buffer.from(getSvgShape(size, size, shape)),
            blend: 'dest-in'
        }])
        .toBuffer();
}

function getSvgShape(width, height, shape) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;

    switch (shape) {
        case 'circle':
            return `<svg width="${width}" height="${height}">
                <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
            </svg>`;
        case 'star':
            return `<svg width="${width}" height="${height}">
                <path d="M${centerX},${centerY - radius} 
                         L${centerX + radius * 0.4},${centerY + radius * 0.1} 
                         L${centerX + radius * 0.2},${centerY + radius * 0.3} 
                         L${centerX - radius * 0.2},${centerY + radius * 0.3} 
                         L${centerX - radius * 0.4},${centerY + radius * 0.1} 
                         Z" fill="white"/>
            </svg>`;
        case 'rounded':
            return `<svg width="${width}" height="${height}">
                <rect width="${width}" height="${height}" rx="${radius * 0.2}" fill="white"/>
            </svg>`;
        default:
            return `<svg width="${width}" height="${height}">
                <rect width="${width}" height="${height}" fill="white"/>
            </svg>`;
    }
}

module.exports = createCommand({
    name: "fig",
    params: "<imagem/vídeo> [-c (redondo) | -s (estrela) | -q (quadrado) | -b (bordas arredondadas)]",
    aliases: ["sticker", "st", "s", "stk"],
    menu: "utilidades",
    desc: "Cria figurinhas com formatos personalizados ou animados (até 10s)",
    async run(int) {
        try {
            const { from: sender, sock, info, args } = int;
            const quoted = info.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const pushname = int.pushname || "Usuário";
            const duration = await int.getEphemeralDuration(sock, sender);

            const shape = args.includes('-c') ? 'circle' :
                          args.includes('-s') ? 'star' :
                          args.includes('-b') ? 'rounded' : 'square';

            const getMedia = () => {
                const msg = quoted || info.message;
                return {
                    image: msg?.imageMessage ||
                        msg?.viewOnceMessageV2?.message?.imageMessage ||
                        msg?.viewOnceMessage?.message?.imageMessage,
                    video: msg?.videoMessage ||
                        msg?.viewOnceMessageV2?.message?.videoMessage ||
                        msg?.viewOnceMessage?.message?.videoMessage
                };
            };

            const { image, video } = getMedia();

            if (!image && !video) {
                await sock.sendMessage(
                    sender,
                    { 
                        text: `${Config.get("name")}: Envie ou marque uma imagem/vídeo (até 10s)`
                    },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    }
                );
                return;
            }

            let buffer, isVideo = false;

            if (image) {
                buffer = await getFileBuffer(image, "image");
                buffer = await sharp(buffer)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer();
                
                if (shape !== 'square') {
                    buffer = await applyShape(buffer, shape);
                }
            } else if (video) {
                try {
                    buffer = await getFileBuffer(video, "video");
                    buffer = await processVideoToWebp(buffer);
                    isVideo = true;
                } catch (e) {
                    console.error('Erro ao processar vídeo:', e);
                    throw new Error('Falha ao processar o vídeo. Verifique se o arquivo não está corrompido e tente novamente.');
                }
            }

            const sticker = new Sticker(buffer, {
                pack: `${Config.get("name")}`,
                author: pushname,
                type: isVideo ? StickerTypes.FULL : StickerTypes.DEFAULT,
                quality: 70,
                background: "transparent"
            });

            await sock.sendMessage(
                sender,
                await sticker.toMessage(),
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(
                sender,
                {
                    react: { 
                        text: '✅', 
                        key: info.key 
                    }
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

        } catch (e) {
            console.error('Erro no comando fig:', e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(
                int.from,
                {
                    text: `${Config.get("name")}: ❌ Erro: ${e.message || 'Falha ao criar sticker'}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );
        }
    }
});