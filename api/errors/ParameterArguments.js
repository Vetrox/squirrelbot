import Command from "./Command";

export default class ParameterArguments extends Command {
	constructor(param) {
		super(
			`Der Nutzer hat die falsche Anzahl an Argumenten übergeben ${param}`
		);
	}
}