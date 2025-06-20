const { createEvent } = require("../loader")

module.exports = createEvent({
    name: "Monitor de Presença",
    event: "presence.update",
    run: async (json) => {

    }
});