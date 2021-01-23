const BotError = require("./BotError");

module.exports = class InvalidData extends BotError {
	constructor() {
		super("Die Daten waren ungültig");
	}
};