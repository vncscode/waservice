const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { stalktheads } = require('../../modules/threads.js');

module.exports = createCommand({
    name: "threadsstalk",
    params: "<username>",
    aliases: ["thstalk", "threadstalk"],
    menu: "stalk",
    desc: "Exibe informações detalhadas de um perfil do Threads (Instagram), incluindo a foto de perfil em HD",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ').replace(/^@/, '');

            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            };

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Para utilizar esse comando, insira o nome de usuário de um perfil do Threads (exemplo: @username ou username).`
                }, messageOptions);
                return;
            }

            await int.react(sock, from, info.key, "🤖");
            await int.recording();

            const threadsProfile = await stalktheads(query);

            if (!threadsProfile?.user) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Não foi possível encontrar o perfil "${query}" no Threads.`
                }, messageOptions);
                return;
            }

            const { user } = threadsProfile;

            let caption = `*📌 Threads Stalk - ${Config.get("name")}*\n\n`;
            caption += `• *Usuário*: ${user.username || 'Desconhecido'}\n`;
            caption += `• *Nome*: ${user.full_name || 'Nenhum'}\n`;
            caption += `• *Biografia*: ${user.biography || user.text_app_biography || 'Nenhuma'}\n`;
            caption += `• *Seguidores*: ${user.follower_count?.toLocaleString('pt-BR') || 0}\n`;
            caption += `• *Verificado*: ${user.is_verified ? 'Sim' : 'Não'}\n`;
            caption += `• *ID do Perfil*: ${user.id || 'N/A'}\n`;

            let profilePicUrl = user.profile_pic_url;
            if (user.hd_profile_pic_versions?.length > 0) {
                const hdPic = user.hd_profile_pic_versions.sort((a, b) => b.height - a.height)[0];
                profilePicUrl = hdPic.url;
            }

            await sock.sendMessage(from, {
                image: { url: profilePicUrl },
                caption: caption
            }, messageOptions);

            await int.react(sock, from, info.key, "✅");

        } catch (e) {
            console.error(e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Não foi possível obter as informações do perfil do Threads.\nErro: ${e.message}`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});