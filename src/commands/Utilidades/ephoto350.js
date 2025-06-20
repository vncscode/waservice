const { createCommand } = require("../../loader")
const { Config } = require("../../constants")
const { ephoto360_1text, ephoto360_2text, EFFECTS_1TEXT, EFFECTS_2TEXT } = require("../../modules/ephoto360")
const axios = require("axios")

module.exports = createCommand({
  name: "logo",
  aliases: ["logomaker", "ephoto"],
  params: "<estilo> <texto> ou <texto1>|<texto2> ou -list",
  menu: "utilidades",
  desc: "Cria logos personalizados com diversos efeitos do ephoto360",
  async run(int) {
    try {
      const { args, from, sender, info, sock } = int
      const duration = await int.getEphemeralDuration(sock, from)

      if (!args[0] || args[0].toLowerCase() === "-list") {
        const effects1Text = Object.keys(EFFECTS_1TEXT)
          .map((effect) => `• ${effect}`)
          .join("\n")
        const effects2Text = Object.keys(EFFECTS_2TEXT)
          .map((effect) => `• ${effect}`)
          .join("\n")

        return await sock.sendMessage(
          from,
          {
            text: `${Config.get("name")}: *Lista de Efeitos Disponíveis*\n\n*Efeitos para um texto:*\n${effects1Text}\n\n*Efeitos para dois textos:*\n${effects2Text}\n\n• *Uso para um texto:* !logo <efeito> <texto>\n• *Uso para dois textos:* !logo <efeito> <texto1>|<texto2>`,
          },
          {
            ephemeralExpiration: duration,
            disappearingMessagesInChat: true,
            quoted: info,
          },
        )
      }

      const fullText = args.join(" ")
      if (fullText.includes("|")) {
        const effectName = args[0].toLowerCase()
        const inputText = args.slice(1).join(" ")

        if (EFFECTS_2TEXT[effectName]) {
          return await generateLogo(int, effectName, inputText, true)
        }

        const defaultEffect = Object.keys(EFFECTS_2TEXT)[0]
        return await generateLogo(int, defaultEffect, fullText, true)
      }

      if (args.length === 1) {
        const defaultEffect = Object.keys(EFFECTS_1TEXT)[0]
        return await generateLogo(int, defaultEffect, args[0], false)
      }

      // Caso com efeito e texto especificado
      const effectName = args[0].toLowerCase()
      const text = args.slice(1).join(" ")

      if (EFFECTS_1TEXT[effectName]) {
        return await generateLogo(int, effectName, text, false)
      }

      await sock.sendMessage(
        from,
        {
          text: `${Config.get("name")}: ❌ Efeito "${effectName}" não encontrado. Use ${Config.get("prefix")}Logo -list para ver os efeitos disponíveis.`,
        },
        {
          ephemeralExpiration: duration,
          disappearingMessagesInChat: true,
          quoted: info,
        },
      )

    } catch (error) {
      console.error("Erro no comando logo:", error)
      const duration = await int.getEphemeralDuration(int.sock, int.from)

      await int.sock.sendMessage(
        int.from,
        {
          text: `${Config.get("name")} ❌ Erro ao processar:\n${error.message}`,
          quoted: int.info,
        },
        {
          ephemeralExpiration: duration,
          disappearingMessagesInChat: true,
        },
      )
    }
  },
})

async function generateLogo(int, effectName, inputText, isTwoText) {
  const { from, sock, info, sender } = int
  const duration = await int.getEphemeralDuration(sock, from)

  await sock.sendMessage(from, {
    react: { text: "⏳", key: info.key },
  })

  try {
    let result, caption

    if (isTwoText) {
      const [text1, text2] = inputText.split("|").map((t) => t.trim())
      if (!text1 || !text2) {
        throw new Error('Formato incorreto! Use: texto1|texto2')
      }
      result = await ephoto360_2text(effectName, text1, text2)
      caption = `*📌 Logo Maker - ${Config.get("name")}*`
    } else {
      result = await ephoto360_1text(effectName, inputText)
      caption = `*📌 Logo Maker - ${Config.get("name")}*`
    }

    const imageUrl = isTwoText ? result.image_2text : result.image_1text
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" })

    await sock.sendMessage(
      from,
      {
        image: Buffer.from(response.data),
        caption: caption,
        mentions: [sender],
      },
      {
        ephemeralExpiration: duration,
        disappearingMessagesInChat: true,
        quoted: info,
      },
    )

    await sock.sendMessage(from, {
      react: { text: "✅", key: info.key },
    })
  } catch (error) {
    await sock.sendMessage(from, {
      react: { text: "❌", key: info.key },
    })

    await sock.sendMessage(
      from,
      { text: `${Config.get("name")}: ❌ Erro ao gerar logo: ${error.message}` },
      {
        ephemeralExpiration: duration,
        disappearingMessagesInChat: true,
        quoted: info,
      },
    )
  }
}