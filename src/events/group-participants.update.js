const { Config } = require("../constants")
const { createEvent, createInteraction } = require("../loader")
const path = require("path")
const fs = require("fs")
const fsPromises = fs.promises
const { addCaptchaTrue, addCaptchaFalse, isCaptchaAtivo } = require("../scripts/captchaHandler")
const { sendAndDeleteMessage, removeParticipant, deleteMessages } = require("../scripts/MessageHandler")
const IndicacoesManager = require("../scripts/IndicacoesHandler")

// Constants and global variables
const CAPTCHA_FOLDER = path.join(__dirname, "../../assets/grupos/captcha_images")
const CAPTCHA_OPTIONS = {
  "gato.jpeg": { correct: "gato", alternatives: ["cat"] },
  "cachorro.jpeg": { correct: "cachorro", alternatives: ["dog", "cão"] },
  "cavalo.jpeg": { correct: "cavalo", alternatives: ["horse"] },
  "vaca.jpeg": { correct: "vaca", alternatives: ["cow"] },
}
const activeCaptchaUsers = new Map()
const captchaTimeouts = new Map()

// Helper functions
async function getEphemeralDuration(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid)
    if (typeof metadata.ephemeralDuration === "number") {
      return metadata.ephemeralDuration
    }
    const groupInfo = await sock.groupFetchAllParticipating()
    const groupData = groupInfo[groupJid]
    return groupData?.ephemeralDuration || 86400
  } catch (error) {
    console.error("Erro ao obter ephemeralDuration:", error)
    return 86400
  }
}

// Função para verificar se a mensagem contém links
function containsLink(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+\.[a-z]{2,})/gi
  return urlRegex.test(text)
}

// Função para normalizar texto (remover acentos, converter para minúsculo)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

module.exports = createEvent({
  name: "Unified Group Participants Handler",
  event: "group-participants.update",
  async run(update, sock) {
    const { id, participants, action } = update

    if (!id.endsWith("@g.us") || action !== "add") return
    const newMember = participants[0]

    try {
      if (await handleBotRemoval(id, newMember, sock)) return

      await handleCaptcha(id, newMember, sock)
      await handleReferrals(id, newMember, sock)
    } catch (error) {
      console.error("[GROUP_PARTICIPANTS] Error:", error)
    }
  },
})

async function handleBotRemoval(groupId, memberNum, sock) {
  if (memberNum.includes(":") || memberNum.includes("bot")) {
    try {
      await sock.groupParticipantsUpdate(groupId, [memberNum], "remove")
      console.log(`[BOT_REMOVAL] Removed bot or virtual number: ${memberNum} from ${groupId}`)
      return true
    } catch (error) {
      console.error("[BOT_REMOVAL] Error removing bot:", error)
    }
  }
  return false
}

async function handleCaptcha(groupId, memberNum, sock) {
  try {
    if (!isCaptchaAtivo(groupId)) return

    const images = Object.keys(CAPTCHA_OPTIONS)
    const randomImage = images[Math.floor(Math.random() * images.length)]
    const correctAnswer = CAPTCHA_OPTIONS[randomImage]

    addCaptchaFalse(memberNum, groupId)

    const message = await sock.sendMessage(groupId, {
      image: { url: path.join(CAPTCHA_FOLDER, randomImage) },
      caption: `${Config.get("name")}: 🔒 CAPTCHA DE SEGURANÇA\n\n@${memberNum.split("@")[0]}, identifique o animal na imagem e digite o nome dele.\n\n⚠️ Você tem 5 minutos para responder.\n⚠️ Envio de links resultará em banimento automático.\n⚠️ Resposta incorreta resultará em banimento.`,
      mentions: [memberNum],
    })

    activeCaptchaUsers.set(memberNum, {
      groupId,
      correctAnswer,
      messageKey: message.key,
      startTime: Date.now(),
    })

    // Configurar timeout de 5 minutos
    const timeoutId = setTimeout(
      async () => {
        if (activeCaptchaUsers.has(memberNum)) {
          await sendAndDeleteMessage(
            sock,
            groupId,
            {
              text: `${Config.get("name")}: @${memberNum.split("@")[0]} foi removido por não responder ao captcha no tempo limite.`,
            },
            [memberNum],
          )
          await removeParticipant(sock, groupId, memberNum)
          await sock.sendMessage(groupId, { delete: message.key })
          activeCaptchaUsers.delete(memberNum)
          captchaTimeouts.delete(memberNum)
          console.log(`[CAPTCHA] User ${memberNum} removed due to timeout`)
        }
      },
      5 * 60 * 1000,
    ) // 5 minutos

    captchaTimeouts.set(memberNum, timeoutId)
  } catch (error) {
    console.error("[CAPTCHA] Error in captcha handler:", error)
  }
}

async function handleReferrals(groupId, newMember, sock) {
  try {
    const groupsPath = "./assets/grupos/confs.json"
    let groupData

    try {
      await fsPromises.access(groupsPath)
      groupData = JSON.parse(await fsPromises.readFile(groupsPath, { encoding: "utf-8" }))
    } catch (error) {
      console.error("[REFERRALS] Erro ao ler arquivo de configurações do grupo:", error)
      return
    }

    if (!groupData[groupId]?.indicacoes) {
      return
    }

    const indicacoes = IndicacoesManager.getIndicacoesData()
    const duration = await getEphemeralDuration(sock, groupId)
    let referralFound = false

    for (const usuario of indicacoes) {
      for (const grupo of usuario.grupos) {
        if (grupo.grupoId === groupId) {
          const indicacao = grupo.indicacoes.find((ind) => ind.numero === newMember && !ind.entrou)

          if (indicacao) {
            indicacao.entrou = true
            indicacao.dataEntrada = new Date().toISOString()
            IndicacoesManager.salvarIndicacoes()
            referralFound = true

            const groupMetadata = await sock.groupMetadata(groupId)
            const quemIndicouInfo = groupMetadata.participants.find((p) => p.id === usuario.usuarioId)
            const referrerName = quemIndicouInfo?.id
              ? "@" + quemIndicouInfo.id.split("@")[0]
              : usuario.usuarioId.split("@")[0]

            const response =
              `🎉 *Novo Membro indicado Entrou!*\n\n` +
              `👤 @${newMember.split("@")[0]} foi indicado por ${referrerName}!\n` +
              `📅 Data da indicação: ${new Date(indicacao.dataIndicacao).toLocaleDateString()}`

            await sock.sendMessage(
              groupId,
              {
                text: `${Config.get("name")}: ${response}`,
                mentions: [newMember, usuario.usuarioId],
              },
              {
                ephemeralExpiration: duration,
                disappearingMessagesInChat: true,
              },
            )

            break
          }
        }
      }
      if (referralFound) break
    }
  } catch (error) {
    console.error("[REFERRALS] Error in referrals handler:", error)
  }
}

module.exports.activeCaptchaUsers = activeCaptchaUsers
module.exports.captchaTimeouts = captchaTimeouts
module.exports.containsLink = containsLink
module.exports.normalizeText = normalizeText
module.exports.CAPTCHA_OPTIONS = CAPTCHA_OPTIONS
