const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const GithubStalk = require('../../modules/githubstalk.js');

module.exports = createCommand({
    name: "stalkgithub",
    params: "<@usuario>",
    aliases: ["ghstalk", "githubstalk", "gitstalk"],
    menu: "pesquisas",
    desc: "Busca informações de um perfil do GitHub",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const user = args[0]?.trim();
            const duration = await int.getEphemeralDuration(sock, from);

            if (!user) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Digite um usuário do GitHub para pesquisar\n` +
                        `• Exemplo: *${Config.get("prefix")}stalkgithub vncscode*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const profile = await GithubStalk(user.replace('@', ''));

            if (!profile || !profile.success) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Não foi possível encontrar o perfil @${user}\n` +
                        `• Erro: ${profile?.error || 'Perfil não encontrado'}\n` +
                        `• Verifique se o nome de usuário está correto`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            let formattedInfo =
                `*✦ 𝐖𝐀  𝐒𝐄𝐑𝐕𝐈𝐂𝐄  𝐆𝐈𝐓𝐇𝐔𝐁  𝐒𝐓𝐀𝐋𝐊𝐈𝐍𝐆 ✦*\n\n` +
                `• *Informações do Perfil*\n` +
                `• Nome: ${profile.name || 'Não disponível'}\n` +
                `• Usuário: @${profile.username || 'Não disponível'}\n` +
                `• Bio: ${profile.bio || 'Nenhuma biografia'}\n` +
                `• Localização: ${profile.location || 'Não informada'}\n` +
                `• Conta criada em: ${new Date(profile.joinedAt).toLocaleDateString('pt-BR')}\n\n` +
                `• *Estatísticas*\n` +
                `• Repositórios públicos: ${profile.publicRepos || '0'}\n` +
                `• Seguidores: ${profile.followers || '0'}\n` +
                `• Seguindo: ${profile.following || '0'}\n` +
                `• Link do perfil: ${profile.githubUrl}\n`;

            if (profile.repositorios && profile.repositorios.length > 0) {
                const topRepos = profile.repositorios
                    .sort((a, b) => b.estrelas - a.estrelas)
                    .slice(0, 5);

                formattedInfo += `\n• *Repositórios:*`;

                topRepos.forEach((repo, index) => {
                    formattedInfo +=
                        `\n${index + 1}. *${repo.nome}*\n` +
                        `• Estrelas: ${repo.estrelas} | Forks: ${repo.forks || '0'}\n` +
                        `• ${repo.linguagem || 'Nenhuma linguagem principal'}\n` +
                        `• ${repo.url}\n`;
                });
            }

            await sock.sendMessage(
                from,
                {
                    image: { url: profile.avatar },
                    caption: formattedInfo,
                    contextInfo: {
                        mentionedJid: [user]
                    }
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("GitHub stalking command error:", error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: • Ocorreu um erro ao buscar o perfil\n` +
                    `• Erro: ${error.message || 'Desconhecido'}\n` +
                    `• Tente novamente mais tarde`
            }, {
                quoted: info,
                ephemeralExpiration: await int.getEphemeralDuration(sock, from),
                disappearingMessagesInChat: true
            });
        }
    }
});