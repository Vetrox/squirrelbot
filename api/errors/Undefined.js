import BotError from "./BotError";

export default class Undefined extends BotError {
	constructor(variable) {
		super(`${variable} war undefiniert`);
	}
}