const { Config } = require("../constants");
const { createEvent } = require("../loader");
const qrcode = require("qrcode-terminal");
const { LoggingsFormatKitController } = require("@caeljs/logger")
const readline = require("readline");
const awesome = require("awesome-phonenumber");

let ConnectingInstance = 0;

module.exports = createEvent({
    name: "Autenticador",
    event: "connection.update",
    run: async (update, client) => {
        const { connection, qr } = update;
        if (connection == "open") {
            ConnectingInstance = Date.now();
        }

        if (!!qr && ConnectingInstance < Date.now()) {
            switch (Config.get("code")) {
                case false: {
                    // 4 minutos
                    ConnectingInstance = Date.now() + 4 * 60 * 1000;
                    console.log("🔹 Escaneie o QR Code abaixo para conectar seu WhatsApp:");
                    qrcode.generate(qr, { small: true },
                        (code) => process.stdin.write(
                            LoggingsFormatKitController(
                                `[${code}].sky\n`
                            )
                        )
                    );
                    return;
                }
                case true: {
                    // uma hora
                    ConnectingInstance = Date.now() + 1 * 60 * 60 * 1000

                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    /** @param {string} prompt */
                    function question(prompt) {
                        return new Promise((resolve) => {
                            rl.question(LoggingsFormatKitController([`[${prompt}].sky40`]), resolve);
                        });
                    }

                    /** @param {string} resp */
                    async function requestWhatsAppCode(resp) {
                        console.log(`[🔍 Verificando número de telefone: ${resp}].blue40`);

                        try {
                            const parsedNumber = awesome.parsePhoneNumber(
                                resp.startsWith("+") ? resp : `+${resp}`
                            );

                            if (parsedNumber.valid) {
                                const parsed = parsedNumber.number.international;
                                const code = await client.requestPairingCode(
                                    parsedNumber.number.e164.slice(1)
                                );

                                console.log(`[✅ Número válido: ${parsed}].green50`);
                                console.log(`[📱 Código de vinculação do WhatsApp].indigo40`);
                                console.log(`[┌────────────────────────────────┐].emerald40`);
                                console.log(`[│ 🔑 Código: ${code.slice(0, 4)}-${code.slice(4)}].green50`);
                                console.log(`[└────────────────────────────────┘].emerald40`);
                                console.log(`[ℹ️  Digite este código no seu WhatsApp para vincular o dispositivo].blue40`);

                                rl.close();
                            } else {
                                console.log(`[❌ Número inválido].red50`);
                                const newNumber = await question(`[📲 Por favor, insira seu número de WhatsApp (com código do país):].sky40`);
                                await requestWhatsAppCode(newNumber);
                            }
                        } catch (e) {
                            console.log(`[❌ Erro ao processar número].red50`);
                            const newNumber = await question(`[📲 Por favor, insira um número de WhatsApp válido:].sky40`);
                            await requestWhatsAppCode(newNumber);
                        }
                    }

                    try {
                        console.log();
                        console.log(`[⚠️  Autenticação necessária].amber40`);
                        console.log(`[Para usar este bot, você precisa vincular seu número de WhatsApp].blue40`);
                        console.log(`[O número deve incluir o código do país (ex: +5511999999999)].blue40\n`);

                        const number = await question(`[📲 Digite seu número de WhatsApp completo:].sky40`);
                        await requestWhatsAppCode(number);
                    } finally {
                        rl.close();
                    }
                    return;
                }
            }
        }
    }
})