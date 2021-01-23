const err = require.main.require("./api/errors/errors");

/**
 * Parses a raw string to a map containing the name {string} of the command and a params map mapping the param names
 * {string} to an array of arguments for the param.
 *
 * It parses the raw message to a dict of this structure:
 * {
 *     name: commandName,
 *	   params: {
 *		     commandParam1 : parameter1Arguments,
 *		     ...
 * 	   }
 * }
 *
 * @param message {module:"discord.js".Message} the raw discordjs message from a user. This can be literally
 * anything, but in case the user wants this
 * function to do something the string should start with the bot prefix and so on.
 * @param mod_attributes {{modulename: string commands : Command[]}} the attributes of a module containing the field
 * modulename and commands to be initialized to a string and an array of command Objects respectively.
 *
 * @returns {{name: string, params: ({string : string[]}|boolean|void|*)}|boolean} false, if something went wrong,
 * otherwise a map of the described structure.
 *
 * @throws errors.js#CommandNameNotFound, if the commandname is not found in the Command array of the commands key
 * of the mod_attributes
 * errors.js#Command, if the user input fails a check inside the specified command, it returns a Command-error,
		which contains a useful error message to log in the channel. (error.message)
 */
function parse_message(message, mod_attributes) {
	if (message.content[0] !== bot.api.constants.prefix || message.author.bot === true) return false;
	let split = message.content.substring(1).split(/\s+/);
	if (!split[0] || split[0] !== mod_attributes.modulename) return false;
	let param_args = split.slice(1); //cut the modulename from the array
	for (let cmd of mod_attributes.commands) {
		try {
			let r = cmd.check(...param_args);
			if (r !== false) return { name: cmd.name, params: r };
			//when it's the wrong cmd, continue the list
		} catch (error) {
			if (error instanceof err.Find) {
				/* if a parameter is given (starting with a minus),
				but it's not inside the command parameter list. */
				throw new err.Command(error.message);
			} else if (error instanceof err.ParameterArguments) {
				/* if the user has given the wrong amount of arguments to the parameter.
				This is determined by the arg_check_lambda */
				throw new err.Command(error.message);
			} else if (error instanceof err.ParameterDependency) {
				/* if the user didn't set a dependent parameter, which isn't default-initialized. */
				throw new err.Command(error.message);
			} else if (error instanceof err.ParameterRequired) {
				/* if the user didn't set a required parameter for the command. */
				throw new err.Command(error.message);
			} else {
				throw error;
			}
		}
	}
	throw new err.CommandNameNotFound(param_args[0], mod_attributes.modulename);
}

module.exports = {
	parse_message,
};