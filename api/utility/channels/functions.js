const err = bot.err;

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
export function channel_check(channel, req_list) {
	if (!channel) throw new err.BotError("Channel war nicht definiert.");
	for (let req of req_list) {
		if (["dm", "text", "voice", "category", "news", "store"].indexOf(req) === -1)
			throw new err.BotError(`Der gesuchte Channel-Typ ${req} ist invalide.`);
		if (channel.type === req) return true;
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
export function isGT(channel) {
	return channel_check(channel, ["text", "category"]);
}