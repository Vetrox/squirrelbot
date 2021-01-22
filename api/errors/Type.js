import BotError from "./BotError";

export default class Type extends BotError {
	constructor() {
		switch (arguments.length) {
		case 1:
			super(`Erwarteter Typ: ${arguments[0]}`);
			break;
		case 2:
			super(
				`Erhaltener Typ ${arguments[0]} erwartet wurde aber ${arguments[1]}`
			);
			break;
		default:
			super("Wert mit falschen Typ erhalten");
		}
	}
}