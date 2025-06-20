const path = require('path');
const { Config } = require("../../constants.js");
const { createCommand } = require("../../loader.js");
const IndicacoesManager = require("../../scripts/IndicacoesHandler.js");
const fs = require('fs').promises; 


const groupsPath = path.join(__dirname, '../../../assets/grupos/confs.json');

module.exports = createCommand({
    name: "indicar",
    params: "<número>",
    aliases: ["indicar", "indique"],
    menu: "grupos",
    isAdmin: true,
    desc: "Indica um número para entrar no grupo",
    async run(int) {
        const { from, sock, args, sender, isGroup, info } = int;
        const duration = await int.getEphemeralDuration(sock, from);
        
        const messageOptions = {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info
        };

        if (!isGroup) {
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: Comando apenas para Grupos.`
            }, messageOptions);
            return;
        }

        if (!int.isGroupAdmins) {
            return await sock.sendMessage(from, {
                text: `${Config.get("name")}: Você precisa ser administrador do grupo para executar este comando!`
            }, messageOptions);
        }

        try {
            const groupData = JSON.parse(await fs.readFile(groupsPath, { encoding: 'utf-8' }));
            
            if (!groupData[from]?.indicacoes) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Indicações estão desabilitadas neste grupo.`
                }, messageOptions);
            }

            if (!args[0] || args[0].replace(/\D/g, '').length < 11) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Formato inválido. Use: ${Config.get("prefix")}indicar 5573999197974\n` +
                          `(Incluindo código do país, sem espaços ou caracteres especiais)`
                }, messageOptions);
            }

            const numeroIndicado = args[0].replace(/\D/g, '');
            if (!/^\d{11,}$/.test(numeroIndicado)) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: Número inválido. Deve conter pelo menos 11 dígitos.`
                }, messageOptions);
            }

            const groupMeta = await sock.groupMetadata(from);
            const nomeGrupo = groupMeta.subject;
            const inviteCode = await sock.groupInviteCode(from);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

            const resultado = await IndicacoesManager.adicionarIndicacao(
                sock, sender, from, numeroIndicado
            );

            if (!resultado.success) {
                return await sock.sendMessage(from, {
                    text: `${Config.get("name")}: ${resultado.message || "Falha ao adicionar indicação"}`
                }, messageOptions);
            }
            try {
                await sock.sendMessage(
                    `${numeroIndicado}@s.whatsapp.net`,
                    {
                        text: `• *Você foi indicado para um grupo!*\n\n` +
                              `• *Grupo:* ${nomeGrupo}\n` +
                              `• *Quem indicou:* @${sender.split('@')[0]}\n` +
                              `• *Link de convite:* ${inviteLink}\n\n` +
                              `_Clique no link acima para entrar no grupo_`,
                        mentions: [sender]
                    }
                );
            } catch (e) {
                console.error('Erro ao enviar para número indicado:', e);
            }

            await sock.sendMessage(from, {
                text: `${Config.get("name")}: ✅ *${numeroIndicado}* foi indicado com sucesso!\n` +
                      `Uma mensagem com o link de convite foi enviada para o número indicado.`
            }, messageOptions);

        } catch (e) {
            console.error('Erro no comando indicar:', e);
            const errorMsg = e.code === 'ENOENT' 
                ? "Arquivo de configuração do grupo não encontrado"
                : "Ocorreu um erro ao processar a indicação";
            
            await sock.sendMessage(from, {
                text: `${Config.get("name")}: ${errorMsg}`
            }, messageOptions);
        }
    }
});