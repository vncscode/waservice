const { default: NodeCache } = require("@cacheable/node-cache")
const {
  default: makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} = require("baileys")
const { NEX_STORE_CONN, PINO_LOGGER, question, Config, colortext, sleep, logger } = require("./constants")
const { Events } = require("./loader")

class NexSocket {
  /** @type {ReturnType<typeof import("baileys-pro").makeWASocket>} */
  static sock = undefined
  static async create() {
    const { state, saveCreds } = await useMultiFileAuthState(NEX_STORE_CONN)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    const msgRetryCounterCache = new NodeCache()

    const sock = makeWASocket({
      version,
      logger: PINO_LOGGER,
      mobile: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, PINO_LOGGER),
      },
      msgRetryCounterCache,
      defaultQueryTimeoutMs: undefined,
      syncFullHistory: true,
      browser: Browsers.ubuntu(`${Config.get("name")}`), // Personalizar o nome do navegador
      markOnlineOnConnect: true,
      printQRInTerminal: true, // Definido como true para exibir o QR code no terminal
      generateHighQualityLinkPreview: true,
      emitOwnEvents: true,
      // Removido deviceList conforme solicitado
      downloadHistory: true,
      fireInitQueries: true,
      emitUnreadMessages: true,
      syncAppState: true,
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!message?.interactiveMessage
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
                ...message,
              },
            },
          }
        }
        return message
      },
    })

    sock.public = true
    logger.log(
      `(${Config.get("name")} rodando na ${isLatest ? "ultima versâo" : `v${version.join(".")}`} do WhatsApp.)gb(blue50, purple50)`,
    )

    // Não precisamos mais do método registerSocket, pois estamos usando QR code
    sock.ev.on("creds.update", saveCreds)
    for await (const [event, handlers] of Events) {
      if (handlers.length > 0) {
        sock.ev.on(event, async (action) => {
          for await (const { run } of handlers) {
            run(action, sock, event)
          }
        })
      }
    }
    this.sock = sock
    return this.sock
  }
}

function getSocket() {
  return NexSocket.sock
}

module.exports = { getSocket, NexSocket }
