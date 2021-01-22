import BotError from "./BotError";

export default class InvalidData extends BotError {
	constructor() {
		super("Die Daten waren ungültig");
	}
}