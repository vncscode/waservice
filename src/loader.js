const { glob } = require("fast-glob")
const { Config, getGroupAdmins, logger } = require("./constants")
const { delay, mentionedJid } = require("baileys")

/** @type {Map<string, ReturnType<typeof createCommand>>} */
const Commands = new Map()
/** @type {Map<string, ReturnType<typeof createEvent>>[]} */
const Events = new Map()

/**
 * @template {keyof import('baileys-pro').BaileysEventMap} T
 *
 * @param {{
 *   name: string,
 *   event: T,
 *   run: (params: import('baileys-pro').BaileysEventMap[T], nx:ReturnType<typeof import("baileys").makeWASocket>) => void | Promise<void>
 * }} properties
 */
function createEvent(properties) {
  return properties
}

const getMenuCommands = () => {
  /** @type {Record<string, ReturnType<typeof createCommand>[]>} */
  const lista = {}
  Commands.forEach((cmd) => {
    if (!cmd.menu) return
    /** @type {string[]} */
    const cmds = typeof lista[cmd.menu] !== "undefined" ? lista[cmd.menu] : []
    cmds.push(cmd)
    lista[cmd.menu] = cmds
  })
  return lista
}

const getMenusInfos = () => {
  /** @type {{label:string, desc:string, menu:string, cmds:ReturnType<typeof createCommand>[] }[]} */
  const menu = []
  const lista = getMenuCommands()
  Commands.forEach((cmd) => {
    if (!cmd.label || cmd.menu) return
    menu.push({
      label: cmd.label,
      desc: cmd.desc,
      isAdmin: cmd.isAdmin,
      isDono: cmd.isDono,
      isMember: cmd.isMember,
      menu: cmd.name,
      cmds: lista[cmd.name],
    })
  })
  return menu
}

/** @param {string} aliasOrCommand */
const getCommand = (aliasOrCommand) => {
  /**@type {ReturnType<typeof createCommand>} */
  let found = undefined
  Commands.forEach((cmd) => {
    if (found) return
    else if (cmd.name == aliasOrCommand) found = cmd
    else if (cmd.aliases && cmd.aliases.includes(aliasOrCommand)) found = cmd
  })
  return found
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param {string} str - The input string.
 * @returns The capitalized string.
 */
function capitalize(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 *
 * @param {{
 *   name: string;
 *   params: string;
 *   prefix?: boolean;
 *   label:string;
 *   desc?:string;
 *   isAdmin: boolean;
 *   isDono: boolean;
 *   isMember: boolean;
 *   aliases?:string[];
 *   menu?:string;
 *   run(int:Awaited<ReturnType<typeof createInteraction>> ) => void | Promise<void>
 * }} properties
 */
function createCommand(properties) {
  return properties
}

async function Initialize() {
  const dirs = ["commands", "events"]
  const pattern = "**/*.js"
  const workdir = require.main.path
  const files = await glob(
    dirs.map((path) => `./${path.replaceAll("\\", "/")}/${pattern}`),
    { absolute: false, cwd: workdir },
  )

  await Promise.all(
    files.map(async (path) => {
      const isCommand = path.includes("/commands/")
      const resource = require(path)
      if (isCommand) {
        logger.log(`*[+].green* | Comando [${resource.name}].gold adicionado.`)
        Commands.set(resource.name, resource)
      } else {
        logger.log(`*[+].green* | Evento [${resource.name}].gold adicionado.`)
        const events = Events.get(resource.event) ?? []
        events.push(resource)
        Events.set(resource.event, events)
      }
    }),
  )
}

/**
 * @param {import("baileys").proto.IWebMessageInfo} info
 * @param {ReturnType<typeof import("baileys").makeWASocket>} sock
 */
async function createInteraction(info, sock) {
  let from = info.key.remoteJid
  const isGroupMessage = from.includes("@g.us")
  const key = {
    remoteJid: info.key.remoteJid,
    id: info.key.id,
    participant: info.key.participant,
  }

  const altpdf = Object.keys(info.message)
  const type =
    altpdf[0] == "senderKeyDistributionMessage"
      ? altpdf[1] == "messageContextInfo"
        ? altpdf[2]
        : altpdf[1]
      : altpdf[0]
  const isGroup = from.endsWith("@g.us")

  // Criando constantes que estavam sendo usadas mas não declaradas
  let sender = isGroup ? info.key.participant : info.key.remoteJid
  const groupMetadata = isGroup ? await sock.groupMetadata(from) : null
  const groupMembers = isGroup ? groupMetadata.participants : []
  const groupAdmins = isGroup ? getGroupAdmins(groupMembers) : []
  const phoneNumber = sock.user?.id.split(":")[0] + "@s.whatsapp.net"
  const numeroDono = Config.get("owners")

  async function react(sock, from, key, emoji) {
    await sock.sendMessage(from, {
      react: {
        text: emoji,
        key: key,
      },
    })
  }

  const composing = async (jid = from) => {
    await sock.presenceSubscribe(jid)
    await delay(500)

    await sock.sendPresenceUpdate("composing", jid)

    await delay(2000)

    await sock.sendPresenceUpdate("paused", jid)
  }

  const recording = async (jid = from) => {
    await sock.presenceSubscribe(jid)
    await delay(500)

    await sock.sendPresenceUpdate("recording", jid)

    await delay(2000)

    await sock.sendPresenceUpdate("paused", jid)
  }

  async function getEphemeralDuration(sock, groupJid) {
    try {
      const metadata = await sock.groupMetadata(groupJid)
      if (typeof metadata.ephemeralDuration === "number") {
        return metadata.ephemeralDuration
      }
      const groupInfo = await sock.groupFetchAllParticipating()
      const groupData = groupInfo[groupJid]

      if (groupData?.ephemeralDuration) {
        return groupData.ephemeralDuration
      }

      return null
    } catch (error) {
      console.error("Erro ao obter ephemeralDuration:", error)
      return null
    }
  }
  const getMessageContent = (messageObj) => {
    if (!messageObj) return undefined


    const textMessage = messageObj.conversation
    const extendedTextMessage = messageObj.extendedTextMessage?.text
    const imageTextMessage = messageObj.imageMessage?.caption
    const videoTextMessage = messageObj.videoMessage?.caption

    // Se for uma mensagem efêmera, verifica a mensagem dentro dela
    const ephemeralContent = messageObj.ephemeralMessage
      ? getMessageContent(messageObj.ephemeralMessage.message)
      : undefined

    return textMessage || extendedTextMessage || imageTextMessage || videoTextMessage || ephemeralContent || undefined
  }

  // Uso:
  let body = getMessageContent(info.message)

  if (!body) body = ""
  const args = typeof body === "string" ? body.trim().split(/ +/).slice(1) : []

  const q = args.join(" ")
  const hasPrefix = body.startsWith(Config.get("prefix"))
  const comando = body.toLowerCase().replace(Config.get("prefix"), "").split(" ")[0]

  const content = JSON.stringify(info.message)
  const menc_prt = info.message?.extendedTextMessage?.contextInfo?.participant
  const menc_jid = args?.join(" ").replace("@", "") + "@s.whatsapp.net"

  // Constantes para tipos de mídia
  const isImage = type === "imageMessage"
  const isVideo = type === "videoMessage"
  const isAudio = type === "audioMessage"
  const isSticker = type === "stickerMessage"
  const isContact = type === "contactMessage"
  const isLocation = type === "locationMessage"
  const isProduct = type === "productMessage"
  const isVisu = type === "viewOnceMessageV2"

  function GetLerMais(iosCompat = false) {
    return iosCompat ? " ".repeat(2575) : "\u200B".repeat(4000)
  }
  const interaction = {
    composing,
    /** @param {PollOptions} opts */
    poll: (opts) => {
      return poll(interaction, opts)
    },
    recording,
    react,
    GetLerMais,
    getEphemeralDuration,
    Nx: sock,
    sock,
    client: sock,
    // Message info
    info,
    from,
    isGroupMessage,
    key,
    type,
    isGroup,
    mentionedJid,

    // Sender info
    sender,
    pushname: info.pushName ? info.pushName : "",
    dispositivo:
      "" + (info.key.id.length > 21 ? "Android" : info.key.id.substring(0, 2) == "3A" ? "IOS" : "WhatsApp web"),

    // Group info
    groupMetadata,
    groupMembers,
    groupAdmins,
    groupDesc: isGroup ? groupMetadata.desc : "",
    groupName: isGroup ? groupMetadata.subject : "",

    isGroupAdmins: groupAdmins.includes(sender),
    isWorner: numeroDono.includes(sender),
    isBotAdmins: groupAdmins.includes(phoneNumber),
    isBotGroupAdmins: groupAdmins.includes(phoneNumber + ""),

    // Message content
    body,
    args,
    q,
    isCmd: hasPrefix,
    comando,
    hasPrefix,
    content,
    typeMessage: isImage
      ? "Image"
      : isVideo
        ? "Video"
        : isAudio
          ? "Audio"
          : isSticker
            ? "Sticker"
            : isContact
              ? "Contact"
              : isLocation
                ? "Location"
                : isProduct
                  ? "Product"
                  : body.substr(0, 50).replace(/6/g, ""),

    // Mentions
    menc_jid2: info.message?.extendedTextMessage?.contextInfo?.mentionedJid,
    menc_os2: q.includes("@") ? menc_jid : menc_prt,

    // Owner info
    criador: `${Config.get("creator")}@s.whatsapp.net`,
    numeroBot: phoneNumber,
    isDono: numeroDono.map((a) => `${a}@s.whatsapp.net`).includes(sender),

    // Media types
    isImage,
    isVideo,
    isAudio,
    isVisu,
    isSticker,
    isContact,
    isLocation,
    isProduct,
    isMedia: isImage || isVideo || isAudio || type == "viewOnceMessage" || isVisu,

    // Quoted messages
    isQuotedMsg: type === "extendedTextMessage" && content.includes("textMessage"),
    isQuotedImage: type === "extendedTextMessage" && content.includes("imageMessage"),
    isQuotedVisuU: type === "extendedTextMessage" && content.includes("viewOnceMessage"),
    isQuotedVisuU2: type === "extendedTextMessage" && content.includes("viewOnceMessageV2"),
    isQuotedVideo: type === "extendedTextMessage" && content.includes("videoMessage"),
    isQuotedDocument: type === "extendedTextMessage" && content.includes("documentMessage"),
    isQuotedAudio: type === "extendedTextMessage" && content.includes("audioMessage"),
    isQuotedSticker: type === "extendedTextMessage" && content.includes("stickerMessage"),
    isQuotedContact: type === "extendedTextMessage" && content.includes("contactMessage"),
    isQuotedLocation: type === "extendedTextMessage" && content.includes("locationMessage"),
    isQuotedProduct: type === "extendedTextMessage" && content.includes("productMessage"),
    isQuotedDocW: type === "extendedTextMessage" && content.includes("documentWithCaptionMessage"),
  }

  return interaction
}

/**
 * @typedef {Object} PollOption
 * @property {string} name - Option name displayed in the poll
 * @property {function(Awaited<ReturnType<typeof createInteraction>>, {done: Function}): Promise<unknown>} run - Function to run when this option is selected
 */

/**
 * @typedef {Object} PollOptions
 * @property {string} caption - Title of the poll
 * @property {Date} [timeout] - When the poll should expire
 * @property {Awaited<ReturnType<typeof createInteraction>>} [interaction] - The interaction that created the poll
 * @property {function(Awaited<ReturnType<typeof createInteraction>>): unknown} [onTimeout] - Function to run when poll times out
 * @property {PollOption[]} options - Available options in the poll
 * @property {number} [selectableCount=1] - Number of options that can be selected
 * @property {boolean} [once=true] - Whether the poll should be deleted after first interaction
 * @property {string[]} [ignores=[]] - JIDs to ignore votes from
 * @property {string[]} [users=[]] - JIDs allowed to vote (empty means everyone)
 */

/** @type {PollOptions[]} */
let Polls = []

/**
 * Creates a new poll
 * @param {Awaited<ReturnType<typeof createInteraction>>} interaction
 * @param {PollOptions} opts
 * @returns {Promise<import("baileys").proto.IWebMessageInfo|undefined>}
 */
async function poll(interaction, opts) {
  opts.timeout = opts.timeout || new Date(Date.now() + 5 * 60 * 1000)
  opts.interaction = opts.interaction || interaction

  opts.ignores = opts.ignores || []
  opts.users = opts.users || []
  opts.once = opts.once === undefined ? true : opts.once
  opts.selectableCount = opts.selectableCount || 1

  if (opts.options.length < 2) {
    return await opts.interaction.sock.sendMessage(
      opts.interaction.from,
      {
        text: `${Config.get("name")}: ⚠️ Mínimo 2 opções necessárias!`,
      },
      { quoted: opts.interaction.info },
    )
  }

  if (opts.options.length > 12) {
    return await opts.interaction.sock.sendMessage(
      opts.interaction.from,
      {
        text: `${Config.get("name")}: ⚠️ Máximo de 10 opções permitidas!`,
      },
      { quoted: opts.interaction.info },
    )
  }

  try {
    const shouldIgnoreBot = Config.get("bot.ignore")
    if (shouldIgnoreBot) {
      opts.ignores.push(interaction.numeroBot)
    }
  } catch (error) {
  }

  const message = await opts.interaction.sock.sendMessage(
    opts.interaction.from,
    {
      poll: {
        name: opts.caption,
        values: opts.options.map((a) => a.name),
        selectableCount: opts.selectableCount,
      },
    },
    { quoted: opts.interaction.info },
  )
  opts.message = message
  Polls.push(opts)
  return message
}

setInterval(async () => {
  const now = Date.now()
  const expiredPolls = Polls.filter((poll) => poll.timeout.getTime() < now)

  await Promise.all(
    expiredPolls.map(async (poll) => {
      try {
        if (typeof poll.onTimeout === "function") {
          await poll.onTimeout(poll.interaction)
        }
        if (poll.message) {
          try {
            await poll.interaction.sock.sendMessage(poll.interaction.from, {
              delete: poll.message.key,
            })
          } catch (e) {
            console.error("Error deleting expired poll:", e)
          }
        }
      } catch (error) {
        console.error("Error processing expired poll:", error)
      } finally {
        Polls = Polls.filter((p) => p !== poll)
      }
    }),
  )
}, 5000)



module.exports = {
  Commands,
  Polls,
  Events,
  Initialize,
  createCommand,
  createEvent,
  capitalize,
  createInteraction,
  getMenuCommands,
  getCommand,
  getMenusInfos,
}
