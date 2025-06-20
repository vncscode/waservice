const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const AudioMeme = require('../../modules/audiomeme');
const getBuffer = require('../../scripts/GetBUffer.js');

module.exports = createCommand({
    name: "mememp3",
    params: "<text>",
    aliases: ["audiomeme", "memeaudio"],
    menu: "pesquisas",
    desc: "Busca áudios dos memes mais famosos.",
    async run(int) {
        try {
            const { args, from, sock, info } = int;
            const query = args.join(' ');
            const duration = await int.getEphemeralDuration(sock, from);

            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Digite algo para buscar\nExemplo: *${Config.get("prefix")}mememp3 Peludo*`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });

            const Memp3 = await AudioMeme(query);

            if (!Memp3.length) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Nenhum áudio encontrado para "${query}"`
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await int.recording();

            await sock.sendMessage(from, {
                audio: { url: Memp3[0].mp3Url },
                mimetype: 'audio/mpeg',
                contextInfo: {
                    externalAdReply: {
                        title: `📌 Meme Search - ${Config.get("name")}`,
                        body: `${int.pushname}`,
                        thumbnail: await getBuffer('https://files.nexhub.fun/api/uploads/3ec09dbe-3ed1-407d-860e-2722154a355b/image/9918f91f-ade1-46d3-9e89-a155a83e17d8.jpeg'),
                        mediaType: 1,
                        sourceUrl: Memp3[0].mp3Url || null,
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

            await int.recording();
            if (Memp3.length > 1) {
                setTimeout(async () => {
                    await sock.sendMessage(from, {
                        audio: { url: Memp3[1].mp3Url },
                        mimetype: 'audio/mpeg'
                    }, {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info
                    });
                }, 2000);
            }

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("MemeMp3 command error:", error);
            await int.sock.sendMessage(int.from, {
                text: `${Config.get("name")}: Ocorreu um erro inesperado. Tente novamente mais tarde.`
            }, {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(int.sock, int.from),
                disappearingMessagesInChat: true
            });
        }
    }
});
