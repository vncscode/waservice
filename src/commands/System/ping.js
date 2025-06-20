const { createCommand } = require("../../loader.js");
const { getSystemInfo, getUptime } = require('../../modules/ping.js');
const fs = require('fs/promises');
const path = require('path');
require('../../../assets/media/logos.js');

module.exports = createCommand({
    name: "ping",
    aliases: ["velocity", 'speed'],
    menu: "system",
    desc: "Verifica Parâmetros do Sistema/Velocidade",
    async run(int) {
        try {
            const info = await getSystemInfo();
            const lermais = await int.GetLerMais();
            const countJsonFiles = async (folderPath) => {
                try {
                    const files = await fs.readdir(folderPath);
                    return files.filter(file =>
                        path.extname(file).toLowerCase() === '.json'
                    ).length;
                } catch (e) {
                    console.error('Erro ao contar arquivos:', e);
                    return 0;
                }
            };
            


            await int.sock.sendMessage(
                int.from,
                {
                    react: {
                        text: '🚀',
                        key: int.info.key
                    }
                }
            )

            await int.composing();

            const commandLatency = ((Date.now() - int.info.messageTimestamp * 1000) / 1000).toFixed(2);
            const prekyes = await countJsonFiles('./assets/conn');

            const formatUptime = (seconds) => {
                const days = Math.floor(seconds / (3600 * 24));
                const hours = Math.floor((seconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return [days > 0 ? `${days}d` : null, hours > 0 ? `${hours}h` : null, `${minutes}m`]
                    .filter(Boolean).join(' ');
            };

            const uptimeService = getUptime();

            const duration = await int.getEphemeralDuration(int.sock, int.from);

            const CapctionMsg = `*✦  𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐒𝐓𝐀𝐓𝐔𝐒 ✦*` +
                `\n\n▸ *Sistema*\n` +
                `▸ OS: ${info.system.os}\n` +
                `▸ Arquitetura: ${info.system.arch}\n` +
                `▸ Node.js: ${info.metadata.nodeVersion}\n` +
                `▸ Prekeys: ${prekyes}\n` +
                `▸ Uptime Server: ${info.system.uptime}\n` +
                `▸ Uptime Bot: ${formatUptime(process.uptime())}\n` +
                `▸ Uptime Serviço: ${uptimeService.uptime}\n\n` +
                `${lermais}` +

                `▸ *Hardware*\n` +
                `▸ CPU: ${info.hardware.cpu.model}\n` +
                `▸ Núcleos: ${info.hardware.cpu.cores}\n` +
                `▸ Uso: ${info.hardware.cpu.usage}\n\n` +

                `▸ *Memória RAM*\n` +
                `▸ Total: ${info.hardware.memory.total}\n` +
                `▸ Usada: ${info.hardware.memory.used}\n` +
                `▸ Utilização: ${info.hardware.memory.usage}\n\n` +

                `▸ *Armazenamento*\n` +
                `▸ Total: ${info.hardware.totalDisks}\n` +
                `▸ Usado: ${info.hardware.usedDisks}\n` +
                `${info.hardware.disks.map(disk =>
                    `▸ ${disk.mount}: ${disk.used} / ${disk.size} (${disk.usage})`
                ).join('\n')}\n\n` +

                `▸ *Rede*\n` +
                `▸ Latência Interna: ${info.metadata.latency}\n` +
                `▸ Latência Comando: ${commandLatency}s\n` +
                `▸ Ping WhatsApp: ${info.network.pingTest.time || 'N/A'}`;

            await int.sock.sendMessage(
                int.from,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: CapctionMsg
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                }
            );

            await int.sock.sendMessage(
                int.from,
                {
                    react: {
                        text: '✅',
                        key: int.info.key
                    }
                }
            )

        } catch (e) {
            console.error('Erro no comando ping:', e);

            const duration = await int.getEphemeralDuration(int.sock, int.from);

            await int.sock.sendMessage(int.from, {
                text: '❌ Falha ao obter status do sistema. Erro: ' + e.message
            }
                , {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: int.info
                });
        }
    }
});