const BotError = require("./BotError");

module.exports = class Range extends BotError {
	constructor(variable) {
		super(`Der Wert von ${variable} war nicht im erforderlichen Bereich`);
	}
};