module.exports = class BotError extends Error {
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
	}
};