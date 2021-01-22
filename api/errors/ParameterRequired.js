import Command from "./Command";

export default class ParameterRequired extends Command {
	constructor(cmd, param) {
		super(
			`Der Benutzer hat den wesentlichen Parameter ${param} für den Befehl ${cmd} nicht angegeben`
		);
	}
}