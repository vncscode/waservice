const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { tiktok_stalk } = require('../../modules/tiktokstalk.js')

module.exports = createCommand({
    name: "tiktokstalk",
    params: "<@usuario>",
    aliases: ["ttkstalking", "tikstalk", "ttkstalk"],
    menu: "pesquisas",
    desc: "Busca informações de um perfil do Tiktok",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const user = args[0]?.trim();
            const duration = await int.getEphemeralDuration(sock, from);

            if (!user) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Digite um usuário do Tiktok para pesquisar\n` +
                        `• Exemplo: *${Config.get("prefix")}tiktokstalk Netflixbrasil*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const profile = await tiktok_stalk(user.replace('@', ''));

            if (!profile) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Não foi possível encontrar o perfil @${user}\n` +
                        `• Verifique se o nome de usuário está correto`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            const formattedMessage = `
*✦ 𝐖𝐀 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐒𝐓𝐀𝐋𝐊𝐈𝐍𝐆 ✦*

*• Nome:* ${profile.nome}
*• Username:* ${profile.username}

*• Estatísticas:*
• Curtidas: ${profile.estatisticas.curtidas}
• Seguidores: ${profile.estatisticas.seguidores}
• Seguindo: ${profile.estatisticas.seguindo}
• Vídeos: ${profile.estatisticas.videos}

*• Métricas:*
• Vídeos por mês: ${profile.metricas.videos_mes}
• Engajamento por vídeo: ${profile.metricas.engajamento_video}
• Views médias: ${profile.metricas.views_media}
• Likes médios: ${profile.metricas.likes_media}

*• Descrição:*
${profile.descricao || 'Sem descrição disponível'}
            `.trim();

            await sock.sendMessage(
                from,
                {
                    image: { url: profile.avatar },
                    caption: formattedMessage
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Tiktok stalking command error:", error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: • Ocorreu um erro ao buscar o perfil\n` +
                    `• Erro: ${error.message || 'Desconhecido'}`
            }, {
                quoted: info,
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true
            });
        }
    }
});