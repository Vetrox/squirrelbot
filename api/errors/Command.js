const BotError = require("./BotError");

module.exports = class Command extends BotError {
	constructor(message) {
		super(message);
	}
};