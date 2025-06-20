const { Initialize } = require("./loader");
const { NexSocket } = require("./socket");

const CONSOLE_INFO = console.info;
console.info = function () {
    if (util.format(...arguments).includes("Closing session: SessionEntry")) return;
    if (util.format(...arguments).includes("Removing old closed session: SessionEntry {}")) return;
    if (util.format(...arguments).includes("Session error:Error: Bad MACError: Bad MAC")) return;
    return CONSOLE_INFO(...arguments);
};

void (async () => {
    await Initialize();
    await NexSocket.create();
})()