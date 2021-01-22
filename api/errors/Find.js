const BotError = require("./BotError");

module.exports = class Find extends BotError {
	constructor(variable, seach_location) {
		super(`${variable} konnte in ${seach_location} nicht gefunden werden`);
	}
};