import BotError from "./BotError";

export default class Range extends BotError {
	constructor(variable) {
		super(`Der Wert von ${variable} war nicht im erforderlichen Bereich`);
	}
}