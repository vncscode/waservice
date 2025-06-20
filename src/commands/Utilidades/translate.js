const { createCommand } = require("../../loader.js");
const { Config } = require("../../constants.js");
const translate = require('../../modules/translategg.js');
const languagesData = require('../../modules/utils/langs.json');

const langCache = new Map(languagesData.languages.map(lang => [lang.codigo_iso.toLowerCase(), lang.idioma]));

module.exports = createCommand({
    name: "traduzir",
    params: "<texto> <-idioma> <-list>",
    aliases: ["translate", 'tradutor'],
    menu: "utilidades",
    desc: "Traduz textos para diversos idiomas (use -list para ver todos os idiomas)",
    async run(int) {
        try {
            const { args, from, sender, info } = int;
            const duration = await int.getEphemeralDuration(int.sock, from);
            const prefix = Config.get('prefix');

            if (args.includes('-list')) {
                const languagesList = languagesData.languages
                    .map(lang => `• ${lang.idioma.padEnd(25)}
                                  ↳ -${lang.codigo_iso}\n`)
                    .join('\n');
                
                await int.sock.sendMessage(
                    from,
                    {
                        text: `*✦ LISTA DE IDIOMAS DISPONÍVEIS ✦*\n\nUse o código após o - para traduzir\nExemplo: ${prefix}traduzir Hello -en\n\n${languagesList}\n\nTotal: ${languagesData.languages.length} idiomas`
                    },
                    { ephemeralExpiration: duration, disappearingMessagesInChat: true, quoted: info }
                );
                return;
            }

            const langIndex = args.findIndex(arg => arg.startsWith('-'));
            const targetLang = langIndex !== -1 ? args[langIndex].substring(1) : 'pt';
            
            if (!langCache.has(targetLang.toLowerCase())) {
                return await int.sock.sendMessage(from, {
                    text: `${Config.get("name")}: ❌ Idioma não encontrado! Use ${prefix}traduzir -list para ver todos.`,
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            const textToTranslate = langIndex !== -1 
                ? args.slice(0, langIndex).join(' ')
                : args.join(' ');

            if (!textToTranslate.trim()) {
                return await int.sock.sendMessage(from, {
                    text: `${Config.get("name")}: ❌ Digite o texto para traduzir!\nExemplo: ${prefix}traduzir Hello world -en`,
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            await int.sock.sendMessage(from, {
                react: { text: '⏳', key: info.key }
            });

            const resultado = await translate({ 
                text: textToTranslate, 
                targetLang: targetLang 
            });

            if (!resultado) {
                await int.sock.sendMessage(from, {
                    react: { text: '❌', key: info.key }
                });
                return await int.sock.sendMessage(from, {
                    text: `${Config.get("name")}: ❌ Falha na tradução. Verifique o texto e tente novamente.`,
                }, {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                });
            }

            const targetLangName = langCache.get(targetLang.toLowerCase()) || targetLang;

            await int.sock.sendMessage(
                from,
                {
                    text: `*✦ TRADUÇÃO ✦*\n\n` +
                          `• *Texto original:* ${textToTranslate}\n` +
                          `• *Tradução (${targetLangName}):* ${resultado}\n` +
                          `• *Traduzido por:* @${sender.split('@')[0]}`,
                    mentions: [sender]
                },
                {
                    ephemeralExpiration: duration,
                    disappearingMessagesInChat: true,
                    quoted: info
                }
            );

            await int.sock.sendMessage(from, {
                react: { text: '✅', key: info.key }
            });

        } catch (e) {
            console.error('Erro no comando traduzir:', e);
            const duration = await int.getEphemeralDuration(int.sock, int.from);

            await int.sock.sendMessage(from, {
                react: { text: '❌', key: int.info.key }
            });

            await int.sock.sendMessage(from, {
                text: `${Config.get("name")}: ❌ Erro ao processar comando: ${e.message || 'Erro desconhecido'}`,
            }, {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
                quoted: int.info
            });
        }
    }
});