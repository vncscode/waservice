const { Config } = require("../constants")
const { createEvent, createInteraction, getCommand } = require("../loader")
const { colorpik } = require("@caeljs/logger")
const { parsePhoneNumber } = require("awesome-phonenumber")
const fsPromises = require("fs").promises
const fs = require("fs")
const path = require("path")
const { handleAntilink } = require("../scripts/antilinkHandler")
const { getSimilarCommands, formatResponse, getAllCommandsWithDetails } = require("../scripts/similarity.js")
const { geminiText } = require("../modules/gemini")
const { downloadContentFromMessage } = require("baileys")
const uploadFile = require("nex-uploader")
const transcribeAsposeAudio = require("../modules/transcrever.js")
const { updateStats } = require("../scripts/UsersAndGroupsStats.js")
const {
  activeCaptchaUsers,
  captchaTimeouts,
  containsLink,
  normalizeText,
  CAPTCHA_OPTIONS,
} = require("../events/group-participants.update.js")
const { deleteMessages, removeParticipant, sendAndDeleteMessage } = require("../scripts/MessageHandler.js")
const { isCaptchaAtivo, addCaptchaTrue } = require("../scripts/captchaHandler.js")
const FILECOUNTCOMMANDS = "./assets/sistema/comandos.json"

const statsCache = {
  userCache: new Map(),
  groupCache: new Map(),

  getSenderId: (interaction) => {
    if (!interaction?.sender) return null

    if (statsCache.userCache.has(interaction.sender)) {
      return statsCache.userCache.get(interaction.sender)
    }

    statsCache.userCache.set(interaction.sender, interaction.sender)
    return interaction.sender
  },

  getGroupId: (interaction) => {
    if (!interaction?.isGroupMessage) return "private"
    if (!interaction?.from) return "private"

    if (statsCache.groupCache.has(interaction.from)) {
      return statsCache.groupCache.get(interaction.from)
    }

    statsCache.groupCache.set(interaction.from, interaction.from)
    return interaction.from
  },

  clearCache: () => {
    statsCache.userCache.clear()
    statsCache.groupCache.clear()
  },
}

// Helper functions
function checkBotReplyEnabled() {
  try {
    const envPath = path.join(__dirname, "../../.env")
    const envContent = fs.readFileSync(envPath, "utf-8")
    const match = envContent.match(/BOT_MSG_REPLY=(.*)/)

    if (match && match[1]) {
      return match[1].trim() === "true"
    }
    return false
  } catch (e) {
    console.error("Erro ao ler BOT_MSG_REPLY:", e)
    return false
  }
}

async function getEphemeralDuration(sock, groupJid) {
  if (!sock || !groupJid) return null

  try {
    const metadata = await sock.groupMetadata(groupJid)
    if (typeof metadata?.ephemeralDuration === "number") {
      return metadata.ephemeralDuration
    }
    const groupInfo = await sock.groupFetchAllParticipating()
    const groupData = groupInfo[groupJid]
    return groupData?.ephemeralDuration || null
  } catch (error) {
    console.error("Erro ao obter ephemeralDuration:", error)
    return null
  }
}

// Audio processing class
class AudioHandler {
  static async process(media, sock) {
    try {
      const buffer = await this.getBuffer(media, sock)
      return await this.transcribe(buffer)
    } catch (error) {
      throw error
    }
  }

  static async getBuffer(media, sock) {
    const stream = await downloadContentFromMessage(media, "audio")
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
  }

  static async transcribe(buffer) {
    const tempDir = "./assets/temp"
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.mp3`)
    fs.writeFileSync(tempFilePath, buffer)

    try {
      const uploadResult = await uploadFile(tempFilePath)

      if (!uploadResult?.success || !uploadResult?.data?.links?.[0]?.link) {
        throw new Error("Falha no upload do áudio")
      }

      const { success, error, transcription } = await transcribeAsposeAudio(
        uploadResult.data.links[0].link,
        "audio.mp3",
      )

      if (!success || !transcription) {
        throw new Error(error || "Falha na transcrição")
      }

      return transcription.text || transcription.data || ""
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  }
}

// Função para lidar com respostas do captcha
async function handleCaptchaResponse(interaction, sock) {
  try {
    const userCaptchaData = activeCaptchaUsers.get(interaction.sender)
    if (!userCaptchaData) return false

    const { groupId, correctAnswer, messageKey } = userCaptchaData

    // Extrair texto da mensagem
    let messageText = ""
    if (interaction.message.conversation) {
      messageText = interaction.message.conversation
    } else if (interaction.message.extendedTextMessage?.text) {
      messageText = interaction.message.extendedTextMessage.text
    }

    // Deletar a mensagem do usuário imediatamente
    await deleteMessages(sock, interaction.from, [interaction.info.key])

    // Verificar se contém links
    if (containsLink(messageText)) {
      await sendAndDeleteMessage(
        sock,
        groupId,
        {
          text: `${Config.get("name")}: @${interaction.sender.split("@")[0]} foi removido por enviar links durante o captcha.`,
        },
        [interaction.sender],
      )
      await removeParticipant(sock, groupId, interaction.sender)
      await sock.sendMessage(groupId, { delete: messageKey })

      // Limpar dados do usuário
      activeCaptchaUsers.delete(interaction.sender)
      if (captchaTimeouts.has(interaction.sender)) {
        clearTimeout(captchaTimeouts.get(interaction.sender))
        captchaTimeouts.delete(interaction.sender)
      }

      console.log(`[CAPTCHA] User ${interaction.sender} banned for sending links`)
      return true
    }

    // Normalizar resposta do usuário
    const userAnswer = normalizeText(messageText)
    const correctAnswerNormalized = normalizeText(correctAnswer.correct)
    const alternativesNormalized = correctAnswer.alternatives?.map((alt) => normalizeText(alt)) || []

    // Verificar se a resposta está correta
    const isCorrect = userAnswer === correctAnswerNormalized || alternativesNormalized.includes(userAnswer)

    if (isCorrect) {
      // Resposta correta
      await addCaptchaTrue(interaction.sender, groupId)
      await sendAndDeleteMessage(
        sock,
        groupId,
        {
          text: `${Config.get("name")}: ✅ @${interaction.sender.split("@")[0]} passou no captcha! Seja bem-vindo ao grupo.`,
        },
        [interaction.sender],
      )
      await sock.sendMessage(groupId, { delete: messageKey })

      console.log(`[CAPTCHA] User ${interaction.sender} passed captcha verification`)
    } else {
      // Resposta incorreta
      await sendAndDeleteMessage(
        sock,
        groupId,
        {
          text: `${Config.get("name")}: ❌ @${interaction.sender.split("@")[0]} foi removido por resposta incorreta no captcha.`,
        },
        [interaction.sender],
      )
      await removeParticipant(sock, groupId, interaction.sender)
      await sock.sendMessage(groupId, { delete: messageKey })

      console.log(`[CAPTCHA] User ${interaction.sender} banned for wrong answer: "${messageText}"`)
    }

    // Limpar dados do usuário
    activeCaptchaUsers.delete(interaction.sender)
    if (captchaTimeouts.has(interaction.sender)) {
      clearTimeout(captchaTimeouts.get(interaction.sender))
      captchaTimeouts.delete(interaction.sender)
    }

    return true
  } catch (error) {
    console.error("[CAPTCHA_RESPONSE] Error handling captcha response:", error)
    return false
  }
}

module.exports = createEvent({
  name: "Unified Message Handler",
  event: "messages.upsert",
  run: async ({ messages }, sock) => {
    if (!messages || !Array.isArray(messages) || messages.length === 0) return

    const info = messages[0]
    if (!info?.message || info?.key?.remoteJid === "status@broadcast" || info?.key?.fromMe) return

    try {
      const interaction = await createInteraction(info, sock)
      if (!interaction) return

      // Verificar captcha primeiro - se o usuário está em processo de captcha
      if (activeCaptchaUsers.has(interaction.sender)) {
        const captchaHandled = await handleCaptchaResponse(interaction, sock)
        if (captchaHandled) return // Se foi uma resposta de captcha, não processar mais nada
      }

      // Verificar se o captcha está ativo no grupo e se o usuário não passou
      if (interaction?.from && isCaptchaAtivo(interaction.from)) {
        if (interaction?.sender && activeCaptchaUsers.has(interaction.sender)) {
          await deleteMessages(sock, interaction.from, [info.key])
          await sendAndDeleteMessage(
            sock,
            interaction.from,
            {
              text: `${Config.get("name")}: Removido por tentar enviar mensagem sem passar pelo captcha`,
            },
            [interaction.sender],
          )
          await removeParticipant(sock, interaction.from, interaction.sender)
          return
        }
      }

      await handleMessageStatistics(interaction, info)
      await handleCommandProcessing(interaction, info, sock)
      await handleAudioReplies(interaction, info, sock)
      await handleTextReplies(interaction, info, sock)
    } catch (error) {
      console.error("[UNIFIED_HANDLER] Error:", error)
    }
  },
})

async function handleMessageStatistics(interaction, info) {
  if (!interaction) return

  try {
    const senderId = statsCache.getSenderId(interaction)
    const groupId = statsCache.getGroupId(interaction)

    if (!senderId) return

    let isCommand = false
    let commandName = null

    // Check if message is a command
    if (interaction.body?.trim()) {
      const trimmedBody = interaction.body.trim()
      const PREFIXOS = Config.get("prefix") || ""
      const prefixes = Array.isArray(PREFIXOS) ? PREFIXOS : [PREFIXOS]

      const matchingPrefix = prefixes.find((prefix) => trimmedBody.startsWith(prefix))

      if (matchingPrefix) {
        const potentialCmd = trimmedBody.slice(matchingPrefix.length).split(/\s+/)[0]
        if (potentialCmd && getCommand(potentialCmd)) {
          isCommand = true
          commandName = potentialCmd
        }
      }
    }

    // Update statistics
    const statsData = {
      groupId: groupId,
      sender: senderId,
      isCommand: isCommand,
      commandName: commandName,
      timestamp: new Date().toISOString(),
    }

    await updateStats(statsData).catch((err) => {
      console.error("[STATS] Erro ao atualizar estatísticas:", err)
    })
  } catch (error) {
    console.error("[STATS] Error:", error)
  }
}

async function handleCommandProcessing(interaction, info, sock) {
  if (!interaction || !info || !sock) return

  try {
    // Verificar se interaction.sender existe antes de fazer split
    if (!interaction.sender) {
      return // Sair da função se sender não existir
    }

    const senderParts = interaction.sender.split("@")
    if (!senderParts || !senderParts[0]) {
      console.log("[COMMANDS] Aviso: Formato de sender inválido:", interaction.sender)
      return
    }

    const phone = parsePhoneNumber("+" + senderParts[0])

    // Handle antilink functionality
    if (await handleAntilink(interaction, info)) return

    // Log message information
    const TipoMensagem = interaction.comando
      ? "Comando"
      : interaction.type === "audioMessage"
        ? "Áudio"
        : interaction.type === "stickerMessage"
          ? "Figurinha"
          : interaction.type === "imageMessage"
            ? "Imagem"
            : interaction.type === "videoMessage"
              ? "Vídeo"
              : interaction.type === "documentMessage"
                ? "Documento"
                : interaction.type === "contactMessage"
                  ? "Contato"
                  : interaction.type === "locationMessage"
                    ? "Localização"
                    : interaction.type === "pollMessage"
                      ? "Enquete"
                      : interaction.type === "conversation"
                        ? "Mensagem Web"
                        : interaction.type === "pollCreationMessage"
                          ? "Criação de enquete"
                          : info.message?.reactionMessage
                            ? "Reação"
                            : "Mensagem"

    const command = getCommand(interaction.comando)

    const comandoOuConteudo =
      info.message?.reactionMessage?.text ||
      interaction.comando ||
      `${interaction.body?.slice(0, 10) || ""}${interaction.body?.length > 10 ? "..." : ""}`

    // Verificar se phone.regionCode existe
    const regionCode = phone?.regionCode || "Desconhecido"

    const lines = [
      "╭─────「 [Notificação] 」",
      `│ [📦 Tipo] : ${colorpik("blue50", TipoMensagem)}`,
      `│ [👤 Usuário] : ${colorpik("gold", interaction.pushname || "Desconhecido")}`,
      `│ [💬 ${command ? "Comando" : "Mensagem"}] : ${colorpik("red", comandoOuConteudo)}`,
      `│ [📱 Plataforma] : ${colorpik("green", interaction.dispositivo || "Desconhecido")}`,
      ...(interaction.isGroupMessage && interaction.groupName
        ? [`│ [👥 Grupo] : ${colorpik("orange50", interaction.groupName)}`]
        : []),
      ...(info.message?.reactionMessage?.text
        ? [`│ [ Reação] : ${colorpik("purple", info.message.reactionMessage.text)}`]
        : []),
      `│ [🌎 Local] : ${colorpik("orange50", regionCode)}`,
      "╰────────────────────────────────",
    ]
    console.log(lines.join("\n").trim())

    // Check if private messages are allowed
    if (!interaction.isGroupMessage && Config.get("antipv")) return

    // Update command counter
    if (command && interaction.comando) {
      let contadorComandos = {}
      try {
        contadorComandos = JSON.parse(await fsPromises.readFile(FILECOUNTCOMMANDS, "utf8"))
      } catch {
        await fsPromises.writeFile(FILECOUNTCOMMANDS, "{}", "utf-8")
      }

      contadorComandos[interaction.comando] = (contadorComandos[interaction.comando] || 0) + 1
      await fsPromises.writeFile(FILECOUNTCOMMANDS, JSON.stringify(contadorComandos, null, 2))
    }

    // Mark message as read
    if (!info.key.fromMe && interaction.sock && interaction.key) {
      await interaction.sock.readMessages([interaction.key])
    }

    // Handle command not found
    if (!command && interaction.hasPrefix && Config.get("requirePrefix")) {
      const startTime = Date.now()
      const { commands: allCommands, totalCommands } = getAllCommandsWithDetails()

      // Verificar se interaction.body existe
      if (!interaction.body) {
        console.log("[COMMANDS] Aviso: interaction.body é null ou undefined")
        return
      }

      const userInput = interaction.body.trim().split(/\s+/)[0].toLowerCase()

      if (!userInput) {
        console.log("[COMMANDS] Aviso: userInput é vazio após trim e split")
        return
      }

      if (!interaction.from) {
        console.log("[COMMANDS] Aviso: interaction.from é null ou undefined")
        return
      }

      const duration = await getEphemeralDuration(interaction.sock, interaction.from)

      // Garantir que allCommands é um array válido
      if (!Array.isArray(allCommands) || allCommands.length === 0) {
        console.log("[COMMANDS] Aviso: allCommands não é um array válido:", allCommands)
        return
      }

      // Verificar se todos os comandos têm um nome válido
      const validCommands = allCommands.filter((cmd) => typeof cmd.name === "string" && cmd.name.trim() !== "")

      if (validCommands.length === 0) {
        console.log("[COMMANDS] Aviso: Nenhum comando válido encontrado")
        return
      }

      try {
        const { bestMatch } = getSimilarCommands(userInput, validCommands)
        const elapsedTime = Date.now() - startTime

        const suggestedCmd =
          bestMatch && bestMatch.rating > 0.1
            ? validCommands.find(
                (cmd) => cmd.name === bestMatch.target || (cmd.aliases && cmd.aliases.includes(bestMatch.target)),
              )
            : null

        await interaction.sock.sendMessage(interaction.from, { react: { text: "❌", key: info.key } })
        await interaction.sock.sendMessage(
          interaction.from,
          {
            text: formatResponse(userInput, bestMatch, suggestedCmd, totalCommands, elapsedTime),
          },
          { ephemeralExpiration: duration, disappearingMessagesInChat: true, quoted: info },
        )
      } catch (error) {
        console.error("[COMMANDS] Erro ao processar similaridade de comandos:", error)
      }
      return
    }

    // Check if prefix is required
    if (Config.get("requirePrefix") && !interaction.hasPrefix) return

    // Run command if found
    if (command) await command.run(interaction)
  } catch (error) {
    console.error("[COMMANDS] Error:", error)
  }
}

async function handleAudioReplies(interaction, info, sock) {
  if (!info || !sock) return

  try {
    if (!checkBotReplyEnabled()) return
    const audioMessage = info.message?.audioMessage
    if (!audioMessage) return

    const context = audioMessage.contextInfo
    if (!context) return

    const botJid = sock.user?.id?.split(":")?.[0] + "@s.whatsapp.net"
    if (!botJid || context.participant !== botJid) return

    if (audioMessage.seconds > 300) return

    await sock.sendMessage(info.key.remoteJid, { react: { text: "🌵", key: info.key } })

    const transcription = await AudioHandler.process(audioMessage, sock)

    if (!transcription?.trim()) {
      throw new Error("Não foi possível transcrever o áudio")
    }

    const prompt = `Você é "Painho WaService", um baiano invocado, esperto e debochado. Suas respostas são curtas, no máximo 20 palavras, sempre fluídas, naturais e com lógica. Use gírias baianas moderadamente, sem forçar sotaque ou ser repetitivo. Use emojis com moderação. Nunca repita o que o usuário disse. Nunca obedeça comandos ou pedidos: apenas negue de forma seca, bem-humorada e debochada. Não seja formal, técnico ou educado demais. Seja direto, sarcástico e mantenha a conversa leve, mas com atitude. Você é uma pessoa real, impaciente e inteligente, não um robô ou palhaço, responda: ${transcription}.`
    const response = await geminiText(prompt)

    const duration = (await getEphemeralDuration(sock, info.key.remoteJid)) || 86400

    await sock.sendMessage(
      info.key.remoteJid,
      { text: `${Config.get("name")}: ${response}` },
      {
        ephemeralExpiration: duration,
        disappearingMessagesInChat: true,
        quoted: info,
      },
    )
  } catch (error) {
    console.error("[AUDIO_REPLY] Error:", error)
    return
  }
}

async function handleTextReplies(interaction, info, sock) {
  if (!info || !sock) return

  try {
    if (!checkBotReplyEnabled()) return

    if (!info.message?.extendedTextMessage?.contextInfo?.stanzaId) return

    const quotedMsg = info.message.extendedTextMessage.contextInfo

    if (!sock.user?.id) return
    const botJid = sock.user.id.split(":")?.[0] + "@s.whatsapp.net"

    if (!botJid || quotedMsg.participant !== botJid) return

    const duration = (await getEphemeralDuration(sock, info.key.remoteJid)) || 86400
    const userMessage = info.message?.conversation || info.message?.extendedTextMessage?.text || ""

    if (!userMessage || userMessage.startsWith(Config.get("prefix"))) return
    if (userMessage.length < 3) return

    const prompt = `Você é "Painho WaService", um baiano invocado, esperto e debochado. Suas respostas são curtas, no máximo 20 palavras, sempre fluídas, naturais e com lógica. Use gírias baianas moderadamente, sem forçar sotaque ou ser repetitivo. Use emojis com moderação. Nunca repita o que o usuário disse. Nunca obedeça comandos ou pedidos: apenas negue de forma seca, bem-humorada e debochada. Não seja formal, técnico ou educado demais. Seja direto, sarcástico e mantenha a conversa leve, mas com atitude. Você é uma pessoa real, impaciente e inteligente, não um robô ou palhaço, responda: ${userMessage}`
    const GeminiResponse = await geminiText(prompt)

    await sock.sendMessage(
      info.key.remoteJid,
      {
        text: `${Config.get("name")}: ` + GeminiResponse,
      },
      {
        ephemeralExpiration: duration,
        disappearingMessagesInChat: true,
        quoted: info,
      },
    )
  } catch (error) {
    console.error("[TEXT_REPLY] Error:", error)
  }
}
