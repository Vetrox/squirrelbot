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
	constructor(){
		switch(arguments.length){
			case 1:
				super(`Expected value type: ${arguments[0]}`);
				break;
			case 2:
				super(`Got type ${arguments[0]} but the expected type was ${arguments[1]}`);
				break;
			default:
				super('Got a value with the wrong type');
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
	constructor(variable){
		super(`The value of ${variable} was not in the required range`);
	}
}

class Unexisting extends BotError {
	constructor(variable){
		super(`${variable} does not exist`);
	}
}

class Dublication extends BotError {
	constructor(variable){
		super(`${variable} does already exist.`);
	}
}


module.exports = {
	'BotError' : BotError,
	'Undefined' : Undefined,
	'Type' : Type,
	'InvalidData' : InvalidData,
	'Find' : Find,
	'Range' : Range,
	'Unexisting' : Unexisting,
	'Dublication' : Dublication
}