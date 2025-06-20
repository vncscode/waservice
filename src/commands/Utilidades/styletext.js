const { createCommand } = require("../../loader");
const { Config } = require("../../constants");
const styletext = require("../../modules/styletext");

module.exports = createCommand({
    name: "styletext",
    aliases: ["gerar-texto"],
    params: "<texto>",
    menu: "utilidades",
    desc: "Estiliza seus textos com +30 fontes diferentes",
    async run(int) {
        try {
            const query = int.args.join(" ");
            if (!query) {
                return await int.sock.sendMessage(
                    int.from,
                    { text: `${Config.get("name")}: Por favor, insira um texto para estilizar.\nExemplo: !styletext Olá` },
                    { quoted: int.info }
                );
            }

            const duration = await int.getEphemeralDuration(int.sock, int.from);

            // Otimização: Cache de estilos para evitar regeneração
            const styles = await styletext(query);
            if (!styles?.length) {
                return await int.sock.sendMessage(
                    int.from,
                    { text: `${Config.get("name")}: Nenhum estilo disponível para este texto.` },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: int.info
                    }
                );
            }

            let currentPage = 0;
            const STYLES_PER_PAGE = 8;
            const totalPages = Math.ceil(styles.length / STYLES_PER_PAGE);

            const sendPollPage = async (page) => {
                const startIdx = page * STYLES_PER_PAGE;
                const endIdx = startIdx + STYLES_PER_PAGE;
                const currentStyles = styles.slice(startIdx, endIdx);

                const options = [];
                const pollInfo = `• Página ${page + 1}/${totalPages} | ${styles.length} estilos`;

                if (page > 0) {
                    options.push({
                        name: "⬅️ Anterior",
                        async run(i, { done }) {
                            currentPage--;
                            await sendPollPage(currentPage);
                            done();
                        }
                    });
                }


                currentStyles.forEach((style, idx) => {
                    const globalIndex = startIdx + idx + 1;
                    options.push({
                        name: `${globalIndex}. ${style.fonte.substring(0, 15)}`,
                        async run(i, { done }) {
                            await i.sock.sendMessage(
                                i.from,
                                {
                                    text: `${Config.get("name")}: *Texto estilizado:*\n` +
                                        `• Fonte: ${style.fonte}\n` +
                                        `• Resultado:\n\`\`\`\n${style.nome}\n\`\`\``,
                                }, {
                                ephemeralExpiration: duration,
                                disappearingMessagesInChat: true,
                                quoted: int.info
                            }
                            );
                            done();
                        }
                    });
                });


                if (page < totalPages - 1) {
                    options.push({
                        name: "➡️ Próximo",
                        async run(i, { done }) {
                            currentPage++;
                            await sendPollPage(currentPage);
                            done();
                        }
                    });
                }

                if (page > 3 && page === totalPages - 1) {
                    options.push({
                        name: "⏮️ Início",
                        async run(i, { done }) {
                            currentPage = 0;
                            await sendPollPage(currentPage);
                            done();
                        }
                    });
                }

                await int.poll({
                    caption: `${Config.get("name")}: *Menu de Estilos de Texto*\n${pollInfo}`,
                    options: options,
                    timeout: new Date(Date.now() + 3 * 60 * 1000),
                    onTimeout: async (i) => {
                        await i.sock.sendMessage(
                            i.from,
                            { react: { text: '⏳', key: i.info.key } }
                        );
                    },
                    once: false,
                    selectableCount: 1
                });
            };

            await sendPollPage(currentPage);

        } catch (error) {
            console.error("Erro no styletext:", error);
            await int.sock.sendMessage(
                int.from,
                {
                    text: `${Config.get("name")} ❌ Erro ao processar:\n${error.message}`,
                    quoted: int.info
                }
            );
        }
    }
});