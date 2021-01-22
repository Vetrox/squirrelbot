const BotError = require("./BotError");

module.exports = class Undefined extends BotError {
	constructor(variable) {
		super(`${variable} war undefiniert`);
	}
};