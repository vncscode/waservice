const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const Stalkig = require('../../modules/instagramprofile.js');

module.exports = createCommand({
    name: "stalkig",
    params: "<@usuario>",
    aliases: ["instastalk", "igstalk", "instagramstalk"],
    menu: "pesquisas",
    desc: "Busca informações de um perfil do Instagram",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const user = args[0]?.trim();
            const duration = await int.getEphemeralDuration(sock, from);

            if (!user) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: • Digite um usuário do Instagram para pesquisar\n` +
                          `• Exemplo: *${Config.get("prefix")}stalkig instagram*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });
            await int.recording();

            const profile = await Stalkig(user.replace('@', ''));

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

            const formattedInfo = 
                `• Nome: ${profile.nome || 'Não disponível'}\n` +
                `• Usuário: ${profile.usuario || 'Não disponível'}\n` +
                `• Biografia: ${profile.bio || 'Não disponível'}\n\n` +
                `• Estatísticas:\n` +
                `• Posts: ${profile.estatisticas.posts || 'N/A'}\n` +
                `• Seguidores: ${profile.estatisticas.seguidores || 'N/A'}\n` +
                `• Seguindo: ${profile.estatisticas.seguindo || 'N/A'}`;
            await sock.sendMessage(
                from,
                {
                    image: { url: profile.foto },
                    caption: `*✦ 𝐖𝐀  𝐒𝐄𝐑𝐕𝐈𝐂𝐄  𝐒𝐓𝐀𝐋𝐊𝐈𝐍𝐆 ✦*\n\n${formattedInfo}`
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Instagram stalking command error:", error);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: • Ocorreu um erro ao buscar o perfil\n` +
                      `• Erro: ${error.message || 'Desconhecido'}`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});