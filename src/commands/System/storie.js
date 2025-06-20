const { createCommand } = require("../../loader.js");
const { proto, prepareWAMessageMedia } = require('baileys');
const { Config } = require("../../constants.js");
const { tiktokSearch } = require('../../modules/tiktoksearch.js');

module.exports = createCommand({
    name: "cu",
    params: "[image_url]",
    aliases: ["statusmention"],
    menu: "system",
    isOwner: true,
    desc: "Posts status with group mention",
    async run(int) {
        const { from, sock: sock, args } = int;

        if (!int.isDono) {
            return sock.sendMessage(from, { text: `${Config.get("name")}: Restricted command!` }, { quoted: int.message });
        }

        const result = await tiktokSearch('Memes');

        let titulo = result.titulo;
        let video = result.video;

        await int.composing();

        try {

            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);

            const groupIds = groupList.map(group => group.id);

            const userJidList = (await sock.groupMetadata(from)).participants.map(p => p.id);

            const prepararMessage = await prepareWAMessageMedia(
                { video: { url: video } },
                { upload: sock.waUploadToServer }
            );

            const captionS = titulo;
            if (prepararMessage.imageMessage) {
                prepararMessage.imageMessage.caption = captionS;
            } else if (prepararMessage.videoMessage) {
                prepararMessage.videoMessage.caption = captionS;
            }

            const statusResponse = await sock.relayMessage(
                "status@broadcast",
                prepararMessage,
                {
                    statusJidList: userJidList,
                    additionalNodes: [{
                        tag: "meta",
                        attrs: {},
                        content: [{
                            tag: "mentioned_users",
                            attrs: {},
                            content: [{
                                tag: "to",
                                attrs: { jid: from },
                                content: undefined,
                            }],
                        }],
                    }],
                }
            );

            await sock.relayMessage(
                from,
                proto.Message.fromObject({
                    "groupStatusMentionMessage": {
                        "message": {
                            "protocolMessage": {
                                "key": {
                                    "remoteJid": "status@broadcast",
                                    "fromMe": true,
                                    "id": statusResponse
                                },
                                "type": "STATUS_MENTION_MESSAGE"
                            }
                        }
                    }
                }),
                {}
            );

        } catch (error) {
            console.error("Error in status mention command:", error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Error: ${error.message}`
            });
        }
    }
});