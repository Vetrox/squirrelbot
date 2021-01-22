const BotError = require("./BotError");

module.exports = class Dublication extends BotError {
	constructor(variable) {
		super(`${variable} existiert bereits`);
	}
};
