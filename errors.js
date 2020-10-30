class BotError extends Error {
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
	}
}

class Undefined extends BotError {
	constructor(variable) {
		super(`${variable} was undefined`);
	}
}

class Type extends BotError {
	constructor() {
		switch (arguments.length) {
			case 1:
				super(`Expected value type: ${arguments[0]}`);
				break;
			case 2:
				super(
					`Got type ${arguments[0]} but the expected type was ${arguments[1]}`
				);
				break;
			default:
				super("Got a value with the wrong type");
		}
	}
}

class InvalidData extends BotError {
	constructor() {
		super(`The data was invalid`);
	}
}

class Find extends BotError {
	constructor(variable, seach_location) {
		super(`Could not find ${variable} in the ${seach_location}`);
	}
}

class Range extends BotError {
	constructor(variable) {
		super(`The value of ${variable} was not in the required range`);
	}
}

class Unexisting extends BotError {
	constructor(variable) {
		super(`${variable} does not exist`);
	}
}

class Dublication extends BotError {
	constructor(variable) {
		super(`${variable} does already exist.`);
	}
}

class Command extends BotError {
	constructor(message) {
		super(message);
	}
}

class ParameterArguments extends BotError {
	constructor(param) {
		super(
			`The user has given the wrong amount of arguments to the parameter ${param}`
		);
	}
}

class ParameterDependency extends BotError {
	constructor(param, depends) {
		super(
			`Parameter ${param} depends on the parameter ${depends}, wich is configured to not default-initializing it.`
		);
	}
}

class ParameterRequired extends BotError {
	constructor(cmd, param) {
		super(`The user has not provided the essencial Parameter ${param} for the Command ${cmd}`);
	}
}

class CommandNameNotFound extends BotError {
	constructor(cmdname, modulename) {
		super(`Could not find the command ${cmdname} for the module ${modulename}`);
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
	ParameterRequired: ParameterRequired
};
