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
		super('Got a value with the wrong type');
	}
	constructor(expected){
		super(`Expected value type: ${expected}`);
	}
	constructor(got, expected) {
		super(`Got type ${got} but the expected type was ${expected}`);
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
	'WrongType' : WrongType,
	'InvalidData' : InvalidData,
	'Find' : Find,
	'Range' : Range,
	'Unexisting' : Unexisting,
	'Dublication' : Dublication
}