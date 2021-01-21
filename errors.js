class BotError extends Error {
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
	}
}

class Undefined extends BotError {
	constructor(variable) {
		super(`${variable} war undefiniert`);
	}
}

class Type extends BotError {
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

class InvalidData extends BotError {
	constructor() {
		super("Die Daten waren ungültig");
	}
}

class Find extends BotError {
	constructor(variable, seach_location) {
		super(`${variable} konnte in ${seach_location} nicht gefunden werden`);
	}
}

class Range extends BotError {
	constructor(variable) {
		super(`Der Wert von ${variable} war nicht im erforderlichen Bereich`);
	}
}

class Unexisting extends BotError {
	constructor(variable) {
		super(`${variable} existiert nicht`);
	}
}

class Dublication extends BotError {
	constructor(variable) {
		super(`${variable} existiert bereits`);
	}
}

class Command extends BotError {
	constructor(message) {
		super(message);
	}
}

class ParameterArguments extends Command {
	constructor(param) {
		super(
			`Der Nutzer hat die falsche Anzahl an Argumenten übergeben ${param}`
		);
	}
}

class ParameterDependency extends Command {
	constructor(param, depends) {
		super(
			`Der Parameter ${param} hängt vom Parameter ${depends} ab, der so konfiguriert ist, dass er nicht standardmäßig initialisiert wird`
		);
	}
}

class ParameterRequired extends Command {
	constructor(cmd, param) {
		super(
			`Der Benutzer hat den wesentlichen Parameter ${param} für den Befehl ${cmd} nicht angegeben`
		);
	}
}

class CommandNameNotFound extends Command {
	constructor(cmdname, modulename) {
		super(`Konnte den Befehl ${cmdname} für das ${modulename} nicht finden`);
	}
}

module.exports = {
	BotError: BotError,
	Undefined: Undefined,
	Type: Type,
	InvalidData: InvalidData,
	Find: Find,
	Range: Range,
	Unexisting: Unexisting,
	Dublication: Dublication,
	Command: Command,
	CommandNameNotFound: CommandNameNotFound,
	ParameterArguments: ParameterArguments,
	ParameterDependency: ParameterDependency,
	ParameterRequired: ParameterRequired,
};
