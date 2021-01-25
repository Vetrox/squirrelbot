const LOGGER = require.main.require("./log.js")("commands");
const err = require.main.require("./api/errors/errors");

/**
 * A Command object is used to handle user inputs and convert them to a parameter list for later use.
 * A Command stores crucial information about:
 * - it's name: The ONE AND ONLY alias for the command.
 * - it's description: A short description to be shown to the user.
 * - it's parameters: A list of Parameter objects which can be used in the context.
 * - it's examples: Examples to be shown to the user.
 *
 *
 * @see Parameter
 *
 * @author Felix Ludwig
 */
module.exports = class Command {

	/**
	 * The Constructor initializes the following:
	 * - name, description, and examples.
	 * - par_desc_map: A map that maps the parameter name (starting with -) to the parameter object. It also checks
	 * for invalid data (eg. type not optional nor required, dependent parameter name is not in the given parameter
	 * list or the arg_check_lambda is false on the default_args.
	 *
	 * @param name the name of the command
	 * @param description a short description to be shown to the user
	 * @param parameter_list an array of parameter objects
	 * @param examples a list of examples in the following form `${bot.api.prefix} ${attributes.modulename}
	 * <command_name> -param_1 arg_p1_1 ...`
	 */
	constructor(
		name,
		description,
		parameter_list,
		examples // ['!help modulehelp -name help', '!help modulehelp -name chmgr',...]
	) {
		this.name = name;
		this.description = description;
		this.examples = examples;
		this.par_desc_map = {};
		for (let param of parameter_list) {
			this.par_desc_map[param.parname] = param;
		}
		for (let param of parameter_list) {
			if (param.type !== "required" && param.type !== "optional")
				throw new err.Command("init_req_opt");
			for (let dep_name of param.dependent_params) {
				if (Object.keys(this.par_desc_map).indexOf(dep_name) <= -1)
					throw new err.Command("init_dep_not_found");
			}
			if (
				param.default_construct === true &&
				!param.arg_check_lambda(param.default_args.length)
			)
				throw new err.Command("init_lambda_err");
			this.par_desc_map[param.parname] = param;
		}
	}

	/**
	 * Checks the dependencies of each Parameter and completes the given dictionary with the newly (default) generated
	 * parameters, if possible, otherwise throws ParameterDependency error.
	 *
	 * @param params {{}} key = Parameter name, value = Parameter Object
	 * @returns {{}} modified map
	 */
	checkParams(params) {
		let changed_params = true;
		while (changed_params === true) {
			changed_params = false;
			for (let param_name in params) {
				let param = this.par_desc_map[param_name];
				let args = params[param_name];
				/* check argument length via lambda */
				if (!param.arg_check_lambda(args.length)) {
					if (param.default_construct === true) {
						params[param_name] = param.default_args;
					} else {
						throw new err.ParameterArguments(param_name);
					}
				}
				for (let dep_name of param.dependent_params) {
					if (!(dep_name in params)) {
						LOGGER.info(
							dep_name +
							" " +
							(dep_name in this.par_desc_map) +
							" " +
							this.par_desc_map[dep_name]
						);
						if (this.par_desc_map[dep_name].default_construct === true) {
							//assign the default arguments of this parameter to the param list
							params[dep_name] = this.par_desc_map[dep_name].default_args;
							changed_params = true;
						} else {
							throw new err.ParameterDependency(param_name, dep_name);
						}
					}
				}
				if (changed_params === true) break; //restart the while loop
			}
		}
		return params;
	}

	/**
	 * Checks the given parameter and their arguments for matching with this command. Checking for module name and
	 * prefix does not happen here.
	 *
	 * @params arguments starting at the command name and ending with the last string of user input. All should be
	 * split by spaces before.
	 *
	 * @returns {{string : string[]}|boolean} false, if the first argument is not the command name, otherwise a map of
	 * parameters with their arguments.
	 *
	 * @throws errors.js#Find, if a parameter is given but not found inside the command parameter list.
	 * errors.js#ParameterRequired, if the user didn't set a required parameter for the command.
	 */
	check() {
		if (arguments[0] !== this.name) return false; //TODO: replace with an error
		let params = {};
		let cache_param;
		let cache_args = [];
		for (let i = 1; i < arguments.length; i++) {
			let arg = arguments[i];
			/* when it's a param and it's not in the list return false */
			if (arg.startsWith("-") && !(arg in this.par_desc_map)) {
				throw new err.Find(
					arg,
					`Befehlsparameterliste für Befehl ${this.name}`
				);
			} else if (arg.startsWith("-") && arg in this.par_desc_map) {
				/* check the cache_args vor validity using the lambda (length) */
				if (cache_param) {
					params[cache_param] = cache_args;
					cache_args = [];
				}
				cache_param = arg;
			} else {
				cache_args.push(arg);
			}
		}
		/* add the last param and it's arguments to the param dict */
		if (cache_param) {
			params[cache_param] = cache_args;
		}
		params = this.checkParams(params);
		/* check for required parameters for this command */
		for (let param_name in this.par_desc_map) {
			let param = this.par_desc_map[param_name];
			if (param.type === "required" && !(param_name in params)) {
				if (param.default_construct === true) {
					params[param_name] = param.default_args;
					params = this.checkParams(params);
				} else {
					throw new err.ParameterRequired(this.name, param_name);
				}
			}
		}
		return params;
	}
};
