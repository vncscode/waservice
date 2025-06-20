const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { kwaiSearch } = require('../../modules/kwaisearch.js');

module.exports = createCommand({
    name: "kwaisearch",
    params: "<texto>",
    aliases: ["kwsrc", "kwaiedits"],
    menu: "pesquisas",
    desc: "Busca vídeos/edits no Kwai.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            const messageOptions = {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            };

            if (!query) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Por favor, insira um termo de busca. Ex: *${Config.get("prefix")}kwaisearch edits*`
                }, messageOptions);
                return;
            }

            await sock.sendMessage(
                from,
                { react: { text: '🔍', key: info.key } }
            );

            await int.recording();

            const result = await kwaiSearch(query);

            if (result.error) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: ${result.error}`
                }, messageOptions);
                return;
            }

            if (!result.data || !result.data.length) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Nenhum vídeo encontrado para a busca.`
                }, messageOptions);
                return;
            }

            const randomIndex = Math.floor(Math.random() * result.data.length);
            const post = result.data[randomIndex];

            if (!post || !post.main_mv_urls || !post.main_mv_urls.length) {
                await sock.sendMessage(from, {
                    text: `${Config.get("name")}: O vídeo selecionado não está disponível.`
                }, messageOptions);
                return;
            }

            const videoUrl = post.main_mv_urls[0].url;

            const captionText = post.caption || post.coverCaption || 'Vídeo do Kwai';
            const verifiedStatus = post.verified ? '✅ Verificado' : 'Não verificado';
            const userSex = post.user_sex === 'M' ? 'Masculino' : post.user_sex === 'F' ? 'Feminino' : 'Desconhecido';
            const tags = post.tags?.map(tag => tag.tag).join(', ') || 'Nenhuma';
            const videoDuration = post.ext_params?.video || post.music?.duration || 'N/A';
            const musicName = post.music?.name || 'N/A';
            const musicArtist = post.music?.artist || 'Desconhecido';
            const musicDuration = post.music?.duration || 'N/A';

            const caption = [
                `• *Post*`,
                `  • *Título:* ${captionText}`,
                `  • *Data:* ${post.time || post.displayTime || 'Desconhecida'}`,
                `  • *Curtidas:* ${post.like_count || 0}`,
                `  • *Visualizações:* ${post.view_count || 0}`,
                `  • *Comentários:* ${post.comment_count || 0}`,
                `  • *Compartilhamentos:* ${post.forward_count || 0}`,
                `  • *Duração:* ${videoDuration} segundos`,
                ``,
                `• *Autor*`,
                `  • *Nome:* ${post.user_name || 'Desconhecido'}`,
                `  • *ID Kwai:* ${post.kwai_id || 'N/A'}`,
                `  • *Fãs:* ${post.fans_num || 0}`,
                `  • *Sexo:* ${userSex}`,
                `  • *Verificado:* ${verifiedStatus}`,
                `  • *Bio:* ${post.user_text || 'Sem descrição'}`,
                ``,
                `• *Música*`,
                `  • *Nome:* ${musicName}`,
                `  • *Artista:* ${musicArtist}`,
                `  • *Duração:* ${musicDuration} segundos`,
                ``,
                `• *Tags*`,
                `  • ${tags}`
            ].join('\n');

            await sock.sendMessage(from, {
                video: { url: videoUrl },
                caption: caption,
                mimetype: 'video/mp4'
            }, messageOptions);

            if (post.music && post.music.audioUrls && post.music.audioUrls.length) {
                await sock.sendMessage(from, {
                    audio: { url: post.music.audioUrls[0].url },
                    mimetype: "audio/mpeg"
                }, messageOptions);
            }

            await sock.sendMessage(
                from,
                { react: { text: '✅', key: info.key } }
            );

        } catch (error) {
            console.error("Erro no comando kwaisearch:", error);
            await sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Ocorreu um erro ao processar sua solicitação.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});