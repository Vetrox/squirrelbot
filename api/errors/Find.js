import BotError from "./BotError";

export default class Find extends BotError {
	constructor(variable, seach_location) {
		super(`${variable} konnte in ${seach_location} nicht gefunden werden`);
	}
}