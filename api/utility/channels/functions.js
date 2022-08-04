const err = require.main.require("./api/errors/errors");

/**
 * Checks a channel for matching one of the given types.
 * Valid channel types are:
 *
 * "dm", "text", "voice", "category", "news", "store"
 *
 *
 * @param channel {module:"discord.js".Channel}
 * @param req_list {string[]} an array of types to be checked against
 *
 * @returns {boolean} true, if the channel matches one or more types given by req_list
 * otherwise false.
 *
 * @throws {errors.js.BotError}, if the channel was undefined or one value in the req_list is not a valid
 * channel type.
 */
function channel_check(channel, req_list) {
	if (!channel) throw new err.BotError("Channel war nicht definiert.");
	for (let req of req_list) {
		if (["dm", "text", "voice", "category", "news"].indexOf(req) === -1)
			throw new err.BotError(`Der gesuchte Channel-Typ ${req} ist invalide.`);
        let id = 0;
        switch (req) {
            case "dm":
                id = 1;
                break;
            case "text":
                id = 0;
                break;
            case "voice":
                id = 2;
                break;
            case "category":
                id = 4;
                break;
            case "news":
                id = 5;
                break;
        }
        console.log(req);
        console.log(channel.type);
        console.log(id);
        console.log("--");
		if (channel.type === id) return true;
	}
	return false;
}

/**
 * Checks, if the channel is either a category or a text channel.
 *
 * @param channel {module:"discord.js".Channel}
 *
 * @returns {boolean} true, if it matches the requirement.
 */
function isGT(channel) {
	return channel_check(channel, ["text", "category"]);
}

module.exports = {
	channel_check,
	isGT,
};
