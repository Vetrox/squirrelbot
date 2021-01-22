const Command = require("./Command");

module.exports = class CommandNameNotFound extends Command {
	constructor(cmdname, modulename) {
		super(`Konnte den Befehl ${cmdname} für das ${modulename} nicht finden`);
	}
};