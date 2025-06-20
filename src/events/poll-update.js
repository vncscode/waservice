const { createEvent, Polls } = require("../loader")
const { getAggregateVotesInPollMessage } = require("baileys")

module.exports = createEvent({
    name: "Poll Update",
    event: "messages.update",
    run: async (events) => {
        for (const { key, update } of events) {

            if (!update?.pollUpdates || !key?.id) continue
            const component = Polls.find((a) => a.message?.key?.id === key.id)

            if (component) {
                try {
                    const message = component.message

                    const poll = getAggregateVotesInPollMessage({
                        message: message.message,
                        pollUpdates: update.pollUpdates,
                    });
                    
                    if (poll.every((vote) => !vote.voters.length)) continue
                    for (const vote of poll) {
                        const voters = vote.voters.map((voter) => voter.replace(/:[0-9][0-9]|:[0-9]/g, ""))
                        if (!voters.includes(component.interaction.sender)) continue
                        const option = component.options.find((a) => a.name === vote.name)
                        if (!option) continue
                        await option.run(component.interaction, {
                            async done() {
                                try {
                                    await component.interaction.sock.sendMessage(component.interaction.from, {
                                        delete: component.message.key,
                                    })
                                    Polls.splice(Polls.indexOf(component), 1)
                                } catch (err) {
                                    console.error("Error in poll done callback:", err)
                                }
                            },
                        })
                        if (component.once === undefined || component.once === true) {
                            try {
                                await component.interaction.sock
                                    .sendMessage(component.interaction.from, { delete: component.message.key })
                                    .catch(() => { })
                                Polls.splice(Polls.indexOf(component), 1)
                            } catch (err) {
                                console.error("Error deleting poll:", err)
                            }
                            break
                        }
                    }
                } catch (error) {
                    console.error("Error processing poll vote:", error)
                }
            }
        }
    },
})
