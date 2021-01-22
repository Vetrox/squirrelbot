const BotError = require("./BotError");

module.exports = class Unexisting extends BotError {
	constructor(variable) {
		super(`${variable} existiert nicht`);
	}
};