import BotError from "./BotError";

export default class Dublication extends BotError {
	constructor(variable) {
		super(`${variable} existiert bereits`);
	}
}
