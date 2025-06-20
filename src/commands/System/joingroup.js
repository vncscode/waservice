const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");

module.exports = createCommand({
    name: "joingroup",
    params: "<Link>",
    aliases: ["entrargrupo", "join"],
    isAdmin: true,
    menu: "system",
    desc: "Entrar em um grupo usando o link de convite",
    async run(int) {
        const { from, sock, args, sender, isDono } = int;
        const link = args[0];
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: int.info
        };

         await int.react(sock, from, int.info.key, "🤖");

        if (!isDono) {
            return await sock.sendMessage(from, {
                text: `${Config.get("name")}: Apenas o dono pode usar este comando!`
            }, messageOptions);
        }

        await int.composing();

        if (!link) {
            return await sock.sendMessage(
                from,
                {
                    text: `${Config.get("name")} 📌 *Como usar:*\n\n` +
                        `🔹 *${Config.get("prefix")}joingroup <link_do_grupo>*\n` +
                        `Exemplo: *${Config.get("prefix")}joingroup https://chat.whatsapp.com/ABC123DEF456*`
                },
                messageOptions
            );
        }

        try {
            const url = new URL(link);

            const code = url.pathname.split('/')[1];
            if (!code) throw new Error("Formato de link inválido");

            const groupId = await sock.groupAcceptInvite(code);

             await int.react(sock, from, int.info.key, "✅");

            await sock.sendMessage(
                from,
                { text: `${Config.get("name")}: Entrei.` },
                messageOptions
            );

            await sock.sendMessage(
                groupId,
                {
                    image: { url: RANDOM_BOT_LOGO },
                    caption: `📢 ${Config.get("name")} *Entrou no grupo!*\n\n` +
                        `• Adicionado por: @${sender.split('@')[0]}\n` +
                        `• Prefixo: *${Config.get("prefix")}*\n` +
                        `• Digite *${Config.get("prefix")}Menu* para comandos`
                }, messageOptions

            );

        } catch (error) {
            console.error(error);
        }
    }
});