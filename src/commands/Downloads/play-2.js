const { createCommand } = require("../../loader.js");
const { play2 } = require('../../modules/youtube.js');
const { Config } = require("../../constants.js");

module.exports = createCommand({
    name: "play2",
    params: "<url> <text> [-mp4]",
    aliases: ["p2", 'youtube2'],
    menu: "downloads",
    desc: "Reproduz/Baixa Músicas do YouTube",
    async run(int) {

        const { args, from, sock, info } = int;

        let query = args.join(' ');

        const duration = await int.getEphemeralDuration(sock, from);

        await int.react(sock, from, info.key, "🤖");

        if (!query) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Para utilizar esse comando, insira o nome ou o link de um vídeo do YouTube.`
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: info
            });
        }
        const infop = await play2(query);

        await sock.sendMessage(from, {
            audio: { url: infop.downloads.adaptiveFormats[6].url },
            mimetype: 'audio/mpeg',
            contextInfo: {
                externalAdReply: {
                    title: `📌 Youtube Player - ${Config.get("name")}`,
                    body: `${int.pushname}`,
                    thumbnail: await getBuffer('https://files.nexhub.fun/api/uploads/3ec09dbe-3ed1-407d-860e-2722154a355b/image/9918f91f-ade1-46d3-9e89-a155a83e17d8.jpeg'),
                    mediaType: 1,
                    sourceUrl: infop.result.video.url,
                    mediaUrl: `https://files.nexhub.fun/api/uploads/3ec09dbe-3ed1-407d-860e-2722154a355b/image/9918f91f-ade1-46d3-9e89-a155a83e17d8.jpeg`,
                    showAdAttribution: true,
                    renderLargerThumbnail: false
                }
            }
        }, {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        });

        await int.react(sock, from, info.key, "✅");

    }
});