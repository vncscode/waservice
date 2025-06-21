const { ConfigJS, envDriver, c } = require("@caeljs/config");
const { default: Loggings, LoggingsFormatKitController, LOGGINGS_FORMATKITS, ConsolePlugin, RegisterPlugin } = require("@caeljs/logger");
const { createInterface } = require("node:readline");
const fs = require("node:fs");
const { default: pino } = require("pino");

const NEX_STORE_CONN = './assets/conn';
const CAMINHO_JSON = './assets/sistema/comandos.json';
const PINO_LOGGER = pino({ level: "fatal" }).child({ level: "fatal" });


const Config = new ConfigJS(envDriver, {
    prefix: c.string().prop("BOT_PREFIX").default("!"),
    requirePrefix: c.boolean().prop("BOT_REQUIRE_PREFIX").default(true),
    phone: c.string().prop("BOT_PHONE"),
    antipv: c.boolean().prop("BOT_ANTIPV").default(true),
    name: c.string().prop("BOT_NAME").default("🤖 WA SERVICE"),
    version: c.string().prop("BOT_VERSION").default("1.0.0"),
    owners: c.array(c.string()).prop("BOT_DONOS").default([]),
    creator: c.string().prop("BOT_CRIADOR").default("557399197974"),
    code: c.boolean().prop("BOT_USE_CODE").default(false)
});

const rl = createInterface(process.stdin, process.stdout);

const colortext = (text) => LoggingsFormatKitController([text], LOGGINGS_FORMATKITS);
const question = (query) => new Promise((resolve) => {
    rl.question(query, (aws) => { resolve(aws); rl.close(); })
});

function getGroupAdmins(participants) {
    let admins = [];
    for (let i of participants) {
        if (i.admin === "admin" || i.admin === "superadmin") admins.push(i.id);
    }
    return admins;
}

/** @type {(ms:number) => Promise<void>} */
const sleep = (ms) => new Promise((a) => setTimeout(a, ms));
const logger = new Loggings({
    title: Config.get("name"),
    plugins: [ConsolePlugin, RegisterPlugin]
});

module.exports = {
    Config,
    NEX_STORE_CONN,
    PINO_LOGGER,
    CAMINHO_JSON,
    question,
    colortext,
    sleep,
    logger,
    getGroupAdmins
}