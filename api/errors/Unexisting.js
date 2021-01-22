import BotError from "./BotError";

export default class Unexisting extends BotError {
	constructor(variable) {
		super(`${variable} existiert nicht`);
	}
}