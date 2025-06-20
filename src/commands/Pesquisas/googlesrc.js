const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { search, downloadImage, formatResults } = require('../../modules/googlesearch.js');

module.exports = createCommand({
    name: "googlesearch",
    params: "<texto> [quantidade]",
    aliases: ["gsearch", "googleimg", "gis"],
    menu: "pesquisas",
    desc: "Busca imagens no Google e envia os resultados (máximo 4 imagens)",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args[0] ? args.filter((_, i) => i !== args.length - 1 || isNaN(args[i])).join(' ') : null;
            const requestedCount = parseInt(args[args.length - 1]) || 1;
            const MAX_IMAGES = 4;
            const duration = await int.getEphemeralDuration(sock, from);

            if (requestedCount > MAX_IMAGES) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • O limite máximo é de ${MAX_IMAGES} imagens por pesquisa\n` +
                        `• Você solicitou: ${requestedCount} imagens`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Digite algo para buscar\n` +
                        `• Exemplo: *${Config.get("prefix")}googlesearch camaro 2* (máximo ${MAX_IMAGES} imagens)`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const results = await search(query);

            if (!results || results.length === 0) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Nenhum resultado encontrado para "${query}"`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            const imagesToSend = Math.min(requestedCount, results.length);
            let successCount = 0;

            for (let i = 0; i < imagesToSend; i++) {
                try {
                    const result = results[i];
                    const imageStream = await downloadImage(result.url);

                    await sock.sendMessage(
                        from,
                        {
                            image: { stream: imageStream },
                            caption: `• Imagem ${i + 1}/${imagesToSend} - ${Config.get("name")}\n` +
                                `• Pesquisa: ${query}\n` +
                                `• Dimensões: ${result.width || '?'}x${result.height || '?'}`
                        },
                        {
                            ephemeralExpiration: duration,
                            disappearingMessagesInChat: true,
                            ...(i === 0 ? { quoted: info } : {})
                        }
                    );
                    successCount++;
                } catch (imageError) {
                    console.error(`Erro ao enviar imagem ${i + 1}:`, imageError);
                }
            }

            if (successCount === 0) {
                await sock.sendMessage(
                    from,
                    {
                        text: `• Resultados para "${query}"\n\n` +
                            `${formatResults(results, imagesToSend).replace(/➤/g, '•')}\n\n` +
                            `• Não foi possível enviar as imagens, mas você pode acessar os links acima`
                    },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    }
                );
            }

            if (imagesToSend < requestedCount) {
                await sock.sendMessage(
                    from,
                    { text: `• Encontrei apenas ${imagesToSend} resultados para "${query}"` },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true
                    }
                );
            }

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Google search command error:", error);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: • Ocorreu um erro na busca\n` +
                    `• Erro: ${error.message || 'Desconhecido'}`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});