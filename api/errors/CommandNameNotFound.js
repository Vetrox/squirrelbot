import Command from "./Command";

export default class CommandNameNotFound extends Command {
	constructor(cmdname, modulename) {
		super(`Konnte den Befehl ${cmdname} für das ${modulename} nicht finden`);
	}
}