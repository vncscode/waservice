const { rm } = require("node:fs/promises");
const { NEX_STORE_CONN, Config, logger } = require("../constants");
const { createEvent } = require("../loader");
const { NexSocket } = require("../socket");
const { Boom } = require("@hapi/boom");
const { startGroupSchedule } = require("../scripts/groupScheduleHandler");
const { iniciarMonitoramento } = require("../scripts/qrCleaner.js");
const DisconnectReason = {
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    timedOut: 408,
    loggedOut: 401,
    badSession: 500,
    restartRequired: 515,
    multideviceMismatch: 411,
    forbidden: 403,
    unavailableService: 503,
    badGateway: 502,
}

async function UpdateUserWA(client) {
    try {
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = agora.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const horas = String(agora.getHours()).padStart(2, '0');
        const minutos = String(agora.getMinutes()).padStart(2, '0');
        const horaFormatada = `${horas}:${minutos}`;
        //const imageUrl = RANDOM_BOT_LOGO;
        //const buffer = await getBuffer(imageUrl);

        const jid = client.user.id.split(':')[0] + '@s.whatsapp.net';
        const mensagemStatus = `${Config.get("name")}: ${dataFormatada} ${horaFormatada}`;

        //client.updateProfilePicture(jid, buffer);
        client.updateProfileStatus(mensagemStatus);
    } catch (e) {
        return;
    }
}



const ConnectionMessages = {
    dropped: "⚠️ (Conexão foi encerrada pelo servidor)gb(blue50, purple50)",
    lost: "⚠️ (Conexão perdida - tentando reconectar...)gb(blue50, purple50)",
    loggedOut: "🔒 (Você foi desconectado - removendo sessão...)gb(blue50, purple50)",
    successful: "✅ (Conexão restabelecida com sucesso)gb(blue50, purple50)",
    replaced: "🔄 (Conexão substituída por outro dispositivo)gb(blue50, purple50)",
    mismatch: "❌ (Dispositivo incompatível (multidevice ativado?))gb(blue50, purple50)",
    forbidden: "⛔ (Acesso proibido - verifique suas credenciais)gb(blue50, purple50)",
    unavailable: "🔌 (Serviço indisponível no momento)gb(blue50, purple50)",
    badGateway: "🌉 (Problema no gateway - tentando novamente)gb(blue50, purple50)",
    timeout: "⏱️ (Tempo de conexão esgotado)gb(blue50, purple50)",
    badSession: "📛 (Sessão inválida - necessário novo QR code)gb(red50, orange50)",
    started: (version, title) => `(${title} v${version} conectado e pronto!)gb(blue50, purple50)`
};

module.exports = createEvent({
    name: "Status de Conexão",
    event: "connection.update",
    run: async (update, client) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = new Boom(lastDisconnect?.error)?.output
                .statusCode;

            if (shouldReconnect) {
                switch (shouldReconnect) {
                    case DisconnectReason.connectionClosed:
                        logger.warn(ConnectionMessages.dropped);
                        break;
                    case DisconnectReason.connectionLost:
                        logger.warn(ConnectionMessages.lost);
                        break;
                    case DisconnectReason.loggedOut:
                        logger.warn(ConnectionMessages.loggedOut);
                        await rm(NEX_STORE_CONN, { recursive: true });
                        break;
                    case DisconnectReason.restartRequired:
                        logger.log(ConnectionMessages.successful);
                        break;
                    case DisconnectReason.connectionReplaced:
                        logger.warn(ConnectionMessages.replaced);
                        return;
                    case DisconnectReason.multideviceMismatch:
                        logger.warn(ConnectionMessages.mismatch);
                        break;
                    case DisconnectReason.forbidden:
                        logger.warn(ConnectionMessages.forbidden);
                        break;
                    case DisconnectReason.unavailableService:
                        logger.error(ConnectionMessages.unavailable);
                        break;
                    case DisconnectReason.badGateway:
                        logger.warn(ConnectionMessages.badGateway);
                        break;
                    case DisconnectReason.timedOut:
                        logger.warn(ConnectionMessages.timeout);
                        break;
                    case DisconnectReason.badSession:
                        logger.error(ConnectionMessages.badSession);
                        break;
                    default:
                        break;
                }
            }

            if (Object.values(DisconnectReason).includes(shouldReconnect)) {
                client = await NexSocket.create();
            } else {
                throw lastDisconnect?.error;
            }
        } else if (connection === "open") {
            await client.sendPresenceUpdate("available");
            await UpdateUserWA(client);
            logger.log(
                ConnectionMessages.started(
                    Config.get("version"),
                    Config.get('name')
                )
            );
            startGroupSchedule(client);
            const numeroDono = `${Config.get("creator")}@s.whatsapp.net`;
            iniciarMonitoramento(client, numeroDono);
        }
    }
});