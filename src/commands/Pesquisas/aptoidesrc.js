const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const { AptoideSearch } = require('../../modules/aptoidesearch.js');
const axios = require('axios');

module.exports = createCommand({
    name: "aptoide",
    params: "<app>",
    aliases: ["aptsearch", "apkdownload"],
    menu: "pesquisas",
    desc: "Busca APKs no Aptoide (envia APKs até 100MB)",
    async run(int) {
        const { args, from, sock, info } = int;
        const query = args.join(' ').trim();
        const duration = await int.getEphemeralDuration(sock, from);

        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        };

        try {
            if (!query) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")} • Digite o nome do app (ex: *${Config.get("prefix")}aptoide Telegram*)`
                }, messageOptions);
            }

            await sock.sendMessage(from, { react: { text: '🔍', key: info.key } });

            const results = await AptoideSearch(query, 1);
            if (!results?.length) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")} • Nenhum resultado para "${query}"`
                }, messageOptions);
            }

            const app = results[0];
            const sizeInMB = parseFloat(app.size.replace('MB', ''));

            await sock.sendMessage(from, {
                image: { url: app.icon },
                caption: `${Config.get("name")} : 📦 *${app.name} App*\n` +
                         `• Versão: ${app.version}\n` +
                         `• Tamanho: ${app.size}\n` +
                         `• Avaliação: ${app.rating}/5\n` +
                         `• Pacote: ${app.package}`
            }, messageOptions);

            if (sizeInMB > 100) {
                await sock.sendMessage(from, {
                    text: `• *Arquivo muito grande (${app.size})*\n\n` +
                          `• *Download:*\n${app.downloadUrl}\n\n` +
                          `• Este APK ultrapassa 100MB\n` +
                          `• Recomendo verificar a segurança antes de instalar`
                }, messageOptions);
            } else {
                const response = await axios.get(app.downloadUrl, { responseType: 'arraybuffer' });
                const apkBuffer = Buffer.from(response.data);

                await sock.sendMessage(from, {
                    document: apkBuffer,
                    mimetype: "application/vnd.android.package-archive",
                    fileName: `${app.name.replace(/[^\w]/g, '_')}_v${app.version}.apk`,
                    caption: "• APK pronto para instalação"
                }, messageOptions);
            }

            await sock.sendMessage(from, { react: { text: '✅', key: info.key } });

        } catch (error) {
            console.error("Erro no aptoide:", error);
            await sock.sendMessage(from, {
                text: `${Config.get("name")} • Erro: ${error.message || "Tente novamente mais tarde"}`
            }, messageOptions);
        }
    }
});