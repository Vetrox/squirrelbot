const Command = require("./Command");

module.exports = class ParameterRequired extends Command {
	constructor(cmd, param) {
		super(
			`Der Benutzer hat den wesentlichen Parameter ${param} für den Befehl ${cmd} nicht angegeben`
		);
	}
};