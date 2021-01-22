import BotError from "./BotError";

export default class Command extends BotError {
	constructor(message) {
		super(message);
	}
}