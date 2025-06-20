const { createCommand } = require("../../loader.js")
const Config = require("../../constants.js").Config

module.exports = createCommand({
    name: "requestgp",
    params: "<-r or -a> <number> <-all>",
    aliases: ["joinrequest", "pendingrequest"],
    isAdmin: true,
    menu: "grupos",
    desc: "Gerenciar Solitações de Entrada no Grupo",
    async run(int) {
        try {
            const { from, sock, args, info } = int

            const duration = await int.getEphemeralDuration(sock, from)

            const prefix = Config.get("prefix")

            const messageOptions = {
                quoted: int.info,
                ephemeralExpiration: await int.getEphemeralDuration(sock, from),
                disappearingMessagesInChat: true,
            }

            if (!from.endsWith("@g.us")) {
                return await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Este comando só pode ser usado em grupos!` },
                    messageOptions,
                )
            }

            if (!int.isGroupAdmins) {
                return await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Você precisa ser administrador do grupo para executar este comando!` },
                    messageOptions,
                )
            }

            if (!int.isBotGroupAdmins) {
                return await sock.sendMessage(
                    from,
                    { text: `${Config.get("name")}: Eu preciso ser administrador do grupo para executar este comando!` },
                    messageOptions,
                )
            }

            const requests = await sock.groupRequestParticipantsList(from)

            if (args[0] === "-list") {
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Não há solicitações pendentes no grupo.` },
                        messageOptions,
                    )
                }

                await int.composing()

                let requestList = `📋 *Solicitações Pendentes (${requests.length})*\n\n`
                requests.forEach((req, index) => {
                    requestList += `*${index + 1}.* @${req.jid.split("@")[0]}\n`
                })

                await sock.sendMessage(
                    from,
                    {
                        text: requestList,
                        mentions: requests.map((req) => req.jid),
                    },
                    messageOptions,
                )

                await sock.sendMessage(from, {
                    react: {
                        text: "🤖",
                        key: info.key,
                    },
                })
            } else if (args[0] === "-a" && args[1]) {
                const index = Number.parseInt(args[1]) - 1
                if (isNaN(index) || index < 0 || index >= requests.length) {
                    return await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Número de solicitação inválido.` },
                        messageOptions,
                    )
                }

                const userJid = requests[index].jid
                await sock.groupRequestParticipantsUpdate(from, [userJid], "approve")

                await sock.sendMessage(
                    from,
                    {
                        text: `🎉 @${userJid.split("@")[0]} foi aprovado(a) no grupo!\n` + `Seja bem-vindo(a) ao grupo!`,
                        mentions: [userJid],
                    },
                    messageOptions,
                )
            } else if (args[0] === "-r" && args[1]) {
                const index = Number.parseInt(args[1]) - 1
                if (isNaN(index) || index < 0 || index >= requests.length) {
                    return await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Número de solicitação inválido.` },
                        messageOptions,
                    )
                }

                const userJid = requests[index].jid
                await sock.groupRequestParticipantsUpdate(from, [userJid], "reject")

                await sock.sendMessage(
                    from,
                    {
                        text: `${Config.get("name")}: @${userJid.split("@")[0]} foi rejeitado(a).`,
                        mentions: [userJid],
                    },
                    messageOptions,
                )
            } else if (args[0] === "-all") {
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(
                        from,
                        { text: `${Config.get("name")}: Não há solicitações pendentes no grupo.` },
                        messageOptions,
                    )
                }

                await int.composing()

                const userJids = requests.map((req) => req.jid)

                await sock.groupRequestParticipantsUpdate(from, userJids, "approve")

                const mentionList = userJids.map((jid) => `@${jid.split("@")[0]}`).join(", ")

                await sock.sendMessage(
                    from,
                    {
                        text: `🎉 *Todas as solicitações foram aprovadas!*\n\nSejam bem-vindos ao grupo:\n${mentionList}`,
                        mentions: userJids,
                    },
                    messageOptions,
                )
            } else {
                const collque =
                    "ℹ️ *Como usar o comando request:*\n\n" +
                    `*${prefix}request -list*\n` +
                    "Mostra todas as solicitações pendentes\n\n" +
                    `*${prefix}request -a [número]*\n` +
                    "Aprova a solicitação especificada\n\n" +
                    `*${prefix}request -r [número]*\n` +
                    "Rejeita a solicitação especificada\n\n" +
                    `*${prefix}request -all*\n` +
                    "Aprova todas as solicitações pendentes de uma vez\n\n" +
                    "*Exemplo:*\n" +
                    `${prefix}request -a 1 (aprova a primeira solicitação da lista)`

                await int.sock.sendMessage(
                    from,
                    {
                        image: { url: RANDOM_BOT_LOGO },
                        caption: collque,
                    },
                    {
                        ephemeralExpiration: duration,
                        disappearingMessagesInChat: true,
                        quoted: info,
                    },
                )
            }
        } catch (error) {
            console.error("Error in request command:", error)
            await sock.sendMessage(
                int.from,
                { text: `${Config.get("name")}: Ocorreu um erro ao processar a solicitação.` },
                { quoted: int.info },
            )
        }
    },
})
