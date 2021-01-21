const fs = require("fs");
const LOGGER = require("./log.js");
const err = require("./errors.js");
const Discord = require("discord.js");
const { prefix } = require("./config.json");

const wait = require("util").promisify(setTimeout); //async wait

/**** CLASSES ****/

/**
 * A database is an api-managed object, which holds the contents of it's corresponding database-text-file in
 * ./data/name.
 *
 * this.data: The data array has the following structure.
 * array[array[json_object, json_object,...],array[json_object,...],...]
 * The number of elements of each subarray equals the number of keys or columns.
 * The number of entries in the outer array equals the number of entries in the database.
 *
 * this.keys: Each column is one key.
 *
 * this.name: Should begin with the module name.
 *
 * this.index: Is an index for each key which has the following structure.
 * array[dict{value1 : index/row in this.data, ...},...]
 *
 * @author Felix Ludwig
 */
class Database {
	/**
	 * Instantiates the object and sets the data_modified and is_saving booleans to false.
	 *
	 * @param name the name of the database. For consistency it should begin with the module name.
	 * @param keys the columns of the database
	 * @param data structured as an array of an array of values for the keys (eg. [[key_1_value,
	 * key_2_value,...],...]. Values are json objects.
	 *
	 * @see Database
	 */
	constructor(name, keys, data) {
		this.name = name.trim();
		this.keys = keys;
		this.data = data;
		this.data_modified = false;
		this.is_saving = false;

		this.indexing(); //this.index should be: index = [(key1) {value : index into data, ...}, (key2)...];
	}

	/**
	 * This function sets the this.data_modified boolean to true and queues a write operation. This function is used
	 * to ensure the data will be written as soon as possible without blocking regular execution.
	 */
	setModAndSave() {
		this.data_modified = true;
		this.write_data();
	}

	/**
	 * This function indexes the this.data array to have the structure mentioned in the class description.
	 *
	 * @see Database
	 */
	indexing() {
		LOGGER.logMessage(`Indexing Datenbank ${this.name}`);
		this.index = [];
		//TODO solve this line
		// eslint-disable-next-line no-unused-vars
		for (let key of this.keys) {
			this.index.push({}); //value -> index;
		}
		for (let ind = 0; ind < this.data.length; ind++) {
			let values = this.data[ind];
			for (let i = 0; i < values.length; i++) {
				if (!(values[i] in this.index[i])) {
					this.index[i][values[i]] = []; //declare
				}
				this.index[i][values[i]].push(ind); //also in index row, you can find that value;
			}
		}
	}

	/**
	 * Validates the types of the arguments array. Every two arguments are compared to each other.
	 *
	 * @param args pairs of the following structure val_t(actual_value, js_type,...);
	 *
	 * @throws {err.Type} if one of the type pairs fails the check.
	*/
	val_t(...args) {
		for (let i = 0; i < args.length - 2; i += 2) {
			if (typeof args[i] != args[i + 1]) {
				throw new err.Type(typeof args[i], args[i + 1]);
			}
		}
	}

	/**
	 * Compares the given keys with the this.keys array and throws errors, when they aren't equal.
	 *
	 * @param param_keys the key-array to compare with.
	 *
	 * @throws errors.js#InvalidData when the arrays don't have equal content.
	 */
	validate_keys(param_keys) {
		if (param_keys.length != this.keys.length) throw new err.InvalidData();
		for (let i = 0; i < this.keys.length; i++) {
			if (this.keys[i] != param_keys[i]) throw new err.InvalidData();
		}
	}

	/**
	 * Validates one row of the data-array.
	 * - Length of array must be equal to number of keys.
	 * - Each element of the array must be a json-object.
	 *
	 * @param data one database entry
	 *
	 * @throws errors.js#InvalidData, when the check failed
	 */
	validate(data) {
		let data_valid = true;
		this.val_t(data, "object");
		if (data.length != this.keys.length) data_valid = false;
		data.forEach(() => {
			try {
				for (let d of data) {
					JSON.stringify(d);
				}
			} catch (error) {
				data_valid = false;
				LOGGER.logMessage(error.message);
			}
		});
		if (!data_valid) throw new err.InvalidData();
	}

	/**
	 * @param keyname the key as a string
	 *
	 * @returns {number} the index of the key in the this.keys array
	 *
	 * @throws errors.js#Find, when the key isn't in keys array of the database.
	 */
	key_i(keyname) {
		let i = this.keys.indexOf(keyname);
		if (i == -1) throw new err.Find("key", "keys of the database");
		return i;
	}

	/**
	 * An async foreach loop. The lambda gets awaited in each loop.
	 *
	 * @param lambda the function to execute with each row of the database
	 *
	 * @returns {Promise<void>} nothing.
	 */
	async for_each(lambda) {
		for (let d of this.data) await lambda(d);
	}

	/**
	 * Adds a row to the database and updates the index and auto-saves the changes.
	 *
	 * @param data_new the new data row
	 *
	 * @returns {number} the new index of the data.
	 */
	add_row(data_new) {
		this.validate(data_new);
		let new_index = this.data.length;
		this.data.push(data_new);
		for (let i = 0; i < data_new.length; i++) {
			if (!(data_new[i] in this.index[i])) {
				this.index[i][data_new[i]] = []; //declare
			}
			this.index[i][data_new[i]].push(new_index);
		}
		this.setModAndSave();
		return new_index;
	}

	/**
	 * Deletes a row in the database and updates the index and auto-saves the changes.
	 *
	 * @param data_index the index pointing at the row to be deleted.
	 *
	 * @throws errors.js#Range, when the index isn't in the database.
	 */
	del_row(data_index) {
		this.val_t(data_index, "number");
		if (data_index < 0 || data_index >= this.data.length)
			throw new err.Range("index");
		this.data.splice(data_index, 1); //hopefully this works
		this.indexing();
		this.setModAndSave();
	}


	/**
	 * Returns a list of indices in which the value for the key is satisfied.
	 *
	 * @param which_key the key to look for
	 * @param value the value under the key
	 *
	 * @returns {number[]} an array of indices specified by the key and value
	 *
	 * @throws errors.js#Find, if the key isn't in the keys array or the value isn't in the index of the key
	 */
	lookup_key_value(which_key, value) {
		//returns a list of indices in which the value for the key is satisfied.
		let i = this.key_i(which_key);
		let data_indices = this.index[i][value];
		if (!data_indices || data_indices.length === 0)
			throw new err.Find(value, "index of the key");
		return data_indices;
	}


	/**
	 * Lookup a value at a row of the database.
	 *
	 * @param index the row index
	 * @param key describing where to look inside the row
	 *
	 * @returns {*} the value at specified database[row][key]
	 *
	 * @throws errors.js#Type, if the index isn't a number or the key isn't a string.
	 * errors.js#Range, if the index isn't in the required range.
	 * errors.js#Find, if the key isn't in the database.
	 */
	lookup_index(index, key) {
		this.val_t(index, "number", key, "string");
		if (index < 0 || index >= this.data.length) throw new err.Range("index");
		let i = this.key_i(key);
		return this.data[index][i];
	}

	/**
	 * Updates the value at the specified location.
	 *
	 * @param data_index the row number
	 * @param key the key
	 * @param new_value the new value to be stored
	 *
	 * @throws errors.js#Range, if the index isn't in the required range.
	 */
	change_data(data_index, key, new_value) {
		this.val_t(data_index, "number", key, "string", new_value, "string");
		if (data_index < 0 || data_index >= this.data.length)
			throw new err.Range("index");
		let i = this.key_i(key);
		let cache_i = this.index[i][this.data[data_index][i]].indexOf(data_index);
		this.index[i][this.data[data_index][i]].splice(cache_i, 1); //remove pointer to this row at index.
		if (this.index[i][this.data[data_index][i]].length === 0) {
			delete this.index[i][this.data[data_index][i]];
		}

		this.data[data_index][i] = new_value;
		if (!(new_value in this.index[i])) {
			this.index[i][new_value] = []; //declare
		}
		this.index[i][new_value].push(data_index);
		this.setModAndSave();
	}

	/**
	 * Writes the data asynchronously on disc.
	 *
	 * @param callback the callback function, when successfully saved.
	 *
	 * @returns {Promise<void>} nothing.
	 */
	async write_data(callback) {
		LOGGER.logMessage("Starte Speichern der Datenbank " + this.name);
		while (this.is_saving == true) await wait(10); //wait for other async task
		this.is_saving = true;
		let cached_data = this.data;
		let write_data = "";
		for (let key of this.keys) {
			write_data += key + " ";
		}
		write_data += "\n";
		for (let row_i in cached_data) {
			for (let key_in in this.keys) {
				write_data += JSON.stringify(cached_data[row_i][key_in]) + "\n";
			}
		}

		fs.writeFile("./data/" + this.name, write_data, "utf8", (err) => {
			if (err) {
				LOGGER.logMessage(err);
				LOGGER.logMessage(err.stack);
			} else {
				LOGGER.logMessage(`Die Datenbank ${this.name} wurde gespeichert!`);
				try {
					typeof callback === "function" && callback();
					//TODO solve this line
					// eslint-disable-next-line no-empty
				} catch (error) {}
			}
			this.is_saving = false;
			if (this.isEqual(cached_data, this.data) == true) {
				this.data_modified = false;
			} else {
				this.setModAndSave(); //in case the data got modidfied during the save (rare, if not impossible)
			}
		});
	}

	/**
	 * Checks, if the data are equal.
	 *
	 * @param data1 the first data
	 * @param data2 the second data
	 *
	 * @returns {boolean} true, if they are fully equal (but not the same)
	 * otherwise false
	 */
	isEqual(data1, data2) {
		if (!data1 || !data2 || data1.length != data2.length) return false;
		for (let i = 0; i < data1.length; i++) {
			if (data1[i] != data2[i]) return false;
		}
		return true;
	}
}

/**
 * A Parameter object is used to store information about one single parameter of a command.
 * It stores crucial information about:
 * - it's type: Which can be 'required' or 'optional'. If the type is 'required' it's not possible to execute the
 * command without this parameter set.
 * - its' dependent parameters: A parameter can require other parameters to be set. If the other parameters aren't
 * set by the user and they have the default_construct set to true, the default_args are written as arguments for
 * the required parameter. Otherwise an error will be thrown, urging the user to provide the required parameter with
 * it's values.
 * - it's arg_check_lambda: Currently there is no possibility to check for anything else than the number of
 * arguments provided to a parameter. This lambda should return true, when the number of arguments matches the
 * expected number of arguments. As an example you could check, if there is an even number of arguments (and they are
 * at least 2) with the following lambda. (nr) => nr >= 2 && nr % 2 == 0
 * - it's default args: If the parameter can be self constructed this array specifies the arguments to be set.
 * - Whether it can be self constructed (default construct)
 *
 * @see Command
 *
 * @author Felix Ludwig
 */
class Parameter {
	/**
	 * Constructor of the Parameter-class.
	 *
	 * @param parname the name of the parameter starting with a minus.
	 * @param type either 'required' or optional
	 * @param dependent_params an array of parameter-names this parameter depends on to be set
	 * @param description to be shown to the user
	 * @param arg_check_lambda the lambda to check for the number of arguments provided by the user
	 * @param default_args an array of arguments to be set, if default_construct is true and either 'required' is the
	 * type of this parameter OR another parameter depends on this parameter and needs to construct this.
	 * @param default_construct whether it should be possible to self construct this parameter with the default_args.
	 */
	constructor(
		parname,
		type,
		dependent_params,
		description,
		arg_check_lambda,
		default_args,
		default_construct
	) {
		this.parname = parname; //starts with minus
		if (!parname.startsWith("-")) throw new err.InvalidData();
		this.type = type;
		this.dependent_params = dependent_params; /* [name] Anmerkung: default_construct bestimmt nun darüber*/
		this.description = description;
		this.arg_check_lambda = arg_check_lambda;
		this.default_args = default_args;
		this.default_construct = default_construct; /*this is just constucted, when 'required' is set. This gets not checked, if it's the dependent_param of another param and it has requested to default construct this*/
	}
}

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
class Command {

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
			if (param.type != "required" && param.type != "optional")
				throw new err.Command("init_req_opt");
			for (let dep_name of param.dependent_params) {
				if (Object.keys(this.par_desc_map).indexOf(dep_name) <= -1)
					throw new err.Command("init_dep_not_found");
			}
			if (
				param.default_construct == true &&
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
		while (changed_params == true) {
			changed_params = false;
			for (let param_name in params) {
				let param = this.par_desc_map[param_name];
				let args = params[param_name];
				/* check argument length via lambda */
				if (!param.arg_check_lambda(args.length)) {
					if (param.default_construct == true) {
						params[param_name] = param.default_args;
					} else {
						throw new err.ParameterArguments(param_name);
					}
				}
				for (let dep_name of param.dependent_params) {
					if (!(dep_name in params)) {
						LOGGER.logMessage(
							dep_name +
								" " +
								(dep_name in this.par_desc_map) +
								" " +
								this.par_desc_map[dep_name]
						);
						if (this.par_desc_map[dep_name].default_construct == true) {
							//assign the default arguments of this parameter to the param list
							params[dep_name] = this.par_desc_map[dep_name].default_args;
							changed_params = true;
						} else {
							throw new err.ParameterDependency(param_name, dep_name);
						}
					}
				}
				if (changed_params == true) break; //restart the while loop
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
		if (arguments[0] != this.name) return false; //TODO: replace with an error
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
				continue;
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
			if (param.type == "required" && !(param_name in params)) {
				if (param.default_construct == true) {
					params[param_name] = param.default_args;
					params = this.checkParams(params);
				} else {
					throw new err.ParameterRequired(this.name, param_name);
				}
			}
		}
		return params;
	}
}

/**** FUNCTIONS ****/

/**
 * Shuts down the whole process.
 * Saves the databases and waits for finishing.
 * Destroys the discord client
 *
 * @returns nothing.
 */
async function shutdown() {
	if (!bot.running || bot.running == false) return;
	LOGGER.logMessage("Shutdown vorbereiten.");
	await save_databases_wait();
	bot.client.destroy();
	bot.running = false; //not used at this time but hey
	LOGGER.logMessage("Bye...");
	process.exit();
}

/**
 * Sets up the controlled exit of the application. Logs exception on error.
 */
function hookexit() {
	process.on("exit", shutdown);
	process.on("SIGINT", shutdown);
	process.on("SIGUSR1", shutdown);
	process.on("SIGUSR2", shutdown);
	process.on("uncaughtException", (error) => {
		LOGGER.logMessage(error);
		LOGGER.logMessage(error.stack);
		shutdown();
	});
}

/**
 * Maps database names to database objects
 *
 * @type {{}}
 */
let databases = {}; //highly inefficient lookup for each database could result in long clustered lookups.
/**
 * An array of all available databases. These aren't necessarily loaded into the database map, but can be if they need
 * to be accessed.
 *
 * @type {*[]}
 */
let possible_databases = [];

/**
 * Initializes the whole api complex. It does the following:
 * - prepares the structured and controlled shutdown process
 * - creates the data folder, if it doesn't exists
 * - stores all possible databases in the possible_databases array
 * - initializes the auto-save of the databases (this is redundant, because each database gets saved asap, if changes
 * are made to it and the shutdown also saves the databases controlled)
 */
function initialize() {
	hookexit();
	if (!fs.existsSync("./data")) {
		LOGGER.logMessage("Erstelle Datenbank-Ordner...");
		fs.mkdirSync("./data");
	}
	let files = fs.readdirSync("./data");
	for (let file of files) {
		possible_databases.push(file);
	}
	save_databases_interval();
}


/**
 * Waits for all databases to be saved.
 *
 * @returns nothing.
 */
async function save_databases_wait() {
	let n = 0;
	for (let database in databases)
		if (databases[database].data_modified === true) {
			n++;
			databases[database].write_data(() => n--);
		}
	while (n > 0) {
		await wait(100);
	}
	LOGGER.logMessage("Speichere alle Datenbanken.");
}

/**
 * Saves the databases asynchronously, so the execution is not blocked. Makes the save_databases_interval function
 * redundant.
 */
function save_databases() {
	for (let database in databases)
		if (databases[database].data_modified === true)
			databases[database].write_data();
}

//TODO: remove because of redundancy
/**
 * Saves the databases every 50 seconds.
 */
function save_databases_interval() {
	save_databases();
	setTimeout(save_databases_interval, 50 * 1000);
}

/**
 * Checks, if the database is in the possible_databases array.
 *
 * @param database name of the database in question
 *
 * @returns {boolean} true, if the database can be loaded. Otherwise false
 */
function exists(database) {
	return possible_databases.indexOf(database) > -1;
}

/**
 * Prepares a database request. This ensures, that there is a database to work on.
 *
 * @param database the requested database
 */
function prepare_request(database) {
	if (!exists(database)) throw new err.Unexisting(database);
	cache_dbs(database);
}

/**
 * Creates the database, if it doesn't exists with the given keys or otherwise loads and caches it.
 *
 * @param database the requested database
 * @param keys an array of the keys of the database in case it is not created yet
 *
 * @throws nothing, but exits the application, when the programmer of a module made a huge mistake with the keys.
 */
function database_create_if_not_exists(database, keys) {
	if (!exists(database)) {
		create_database(database, keys);
	} else {
		cache_dbs(database);
		try {
			databases[database].validate_keys(keys);
		} catch {
			LOGGER.logMessage("KRITISCHER DATENBANK ERROR!!! " + database);
			process.exit();
		}
	}
}

/**
 * Executes a lambda on each row of the database
 *
 * @param database the name of the database
 * @param lambda gets an entire row as a parameter
 * @returns {Promise<void>} nothing.
 */
async function database_for_each(database, lambda) {
	prepare_request(database);
	return await databases[database].for_each(lambda);
}

/**
 * Adds a row to a database.
 *
 * @param database the name of the database.
 * @param data an array with matching values to the keys
 * @returns {number} the index of the new row
 */
function database_row_add(database, data) {
	prepare_request(database);
	return databases[database].add_row(data);
}

/**
 * Deletes an entire row of a database.
 *
 * @param database the name of the database
 * @param index the row number
 */
function database_row_delete(database, index) {
	prepare_request(database);
	return databases[database].del_row(index);
}

/**
 * Changes a value at a key at a row of a database (eg. databases[database][row][key] = value)
 *
 * @param database the name of the database
 * @param data_index the row at the database
 * @param key a string
 * @param new_value the new json object
 */
function database_row_change(database, data_index, key, new_value) {
	prepare_request(database);
	return databases[database].change_data(data_index, key, new_value);
}


/**
 * THE function for getting a list of row indices of a database that match:
 * - the value at a key
 *
 * @param database the name of the database
 * @param key the key string
 * @param value the value to be searched for
 *
 * @returns {number[]} an array of the matching row numbers
 */
function lookup_key_value(database, key, value) {
	//what happens, when multiple modules acess the same database at the same time?!?!?
	prepare_request(database);
	return databases[database].lookup_key_value(key, value);
}

/**
 * Returns the value at the given position.
 *
 * @param database the name of the database
 * @param index the row number
 * @param key a string
 * @returns {*} the json object at databases[database][index][key]
 */
function lookup_index(database, index, key) {
	prepare_request(database);
	return databases[database].lookup_index(index, key);
}

/**
 * Caches the given database by loading it into the databases map, if it's not there.
 *
 * @param database the name of the database
 */
function cache_dbs(database) {
	if (!(database in databases)) load_database(database);
}

/**
 * Loads a database from disk. Expects the database to exist as a file with the given name.
 * A Database has the following disk structure:
 * 0 key_0 key_1 key_2 ... key_n	  (row 0)
 * 1 json_object_for_key_0					(row 0)
 * 2 json_object_for_key_1					(row 0)
 * ...
 * n+1 json_object_for_key_n				(row 1)
 * n+1+1 json_object_for_key_0			(row 1)
 * n+1+2 json_object_for_key_1			(row 1)
 * n+1+n+1 json_object_for_key_n		(row 1)
 *
 * Or with n = 1
 * 0 key_0 key_1
 * 1 json_object_for_key_0 (row 0)
 * 2 json_object_for_key_1 (row 0)
 * 3 json_object_for_key_0 (row 1)
 * 4 json_object_for_key_1 (row 1)
 *
 * @param database the database name
 */
function load_database(database) {
	
  LOGGER.logMessage(`Lade Datenbank ${database}`);
  
	let fi = fs.readFileSync("./data/" + database, "utf8");
	let rows = fi.trim().split("\n");
	let keys = rows[0].trim().split(" ");
	let data = [];
	for (let i = 1; i <= rows.length - keys.length; i += keys.length) {
		let cache = [];
		for (let i_k = 0; i_k < keys.length; i_k++) {
			let row_index = i + i_k;
			cache.push(JSON.parse(rows[row_index]));
		}
		data.push(cache);
	}
	databases[database] = new Database(database, keys, data);
}

/**
 * Creates a database and save it on disk.
 *
 * @param database the name of the database
 * @param keys an array of strings representing the keys of the database
 */
function create_database(database, keys) {
	if (database in databases) {
		throw new err.Dublication(database);
	} else {
		LOGGER.logMessage("Creating database " + database);
		possible_databases.push(database);
		databases[database] = new Database(database, keys, []);
		databases[database].setModAndSave();
	}
}

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
 * @param mod_attributes {{name: string commands : Command[]}} the attributes of a module containing the field
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
	if (message.content[0] != prefix || message.author.bot == true) return false;
	let split = message.content.substring(1).split(/\s+/);
	if (!split[0] || split[0] != mod_attributes.modulename) return false;
	let param_args = split.slice(1); //cut the modulename from the array
	for (let cmd of mod_attributes.commands) {
		try {
			let r = cmd.check(...param_args);
			if (r != false) return { name: cmd.name, params: r };
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

/**
 * Creates an embed containing all useful information about a module.
 *
 * @param mod_attributes {{modulename: string, description : string, commands: Command[]}}
 * @param channel {module:"discord.js".TextChannel} the channel to post the embed in
 * @returns {Promise<void>} nothing.
 *
 * @throws may throw an error, depending on discord permissions
 */
async function help_module(mod_attributes, channel) {
	const embed = new Discord.MessageEmbed()
		.setColor("#ffaaff")
		.setAuthor("Hilfeseite")
		.setTitle(`Modul: ${mod_attributes.modulename}`)
		.setDescription(mod_attributes.description)
		.setTimestamp()
		.setFooter(
			bot.client.user.username,
			bot.client.user.displayAvatarURL({ size: 32 })
		);

	for (let cmd of mod_attributes.commands) {
		let desc = `${cmd.description}\n`;
		desc += "```diff\n+ Beispiel(e) +\n";
		for (let example of cmd.examples) {
			desc += example + "\n";
		}
		desc += "```";
		for (let par_name in cmd.par_desc_map) {
			let c = cmd.par_desc_map[par_name];
			desc +=
				"```diff\n" +
				`${par_name} [${c.type}` +
				(c.default_construct == true
					? `; default: ${c.default_args.toString().replace(",", " ")}]\n`
					: "]\n") +
				` ${c.description}\n` +
				(c.dependent_params.length > 0
					? `+ hängt von diesen Parametern ab: [${c.dependent_params}]`
					: "") +
				"```";
		}
		embed.addField(`cmd: ${cmd.name}`, desc, false);
	}
	await channel.send(embed);
}

/**
 * Creates an embed with title and description.
 *
 * @param title
 * @param description
 * @returns {module:"discord.js".MessageEmbed} the embed.
 */
function create_embed(title, description) {
	return new Discord.MessageEmbed()
		.setColor("#ff9900")
		.setTitle(title)
		.setDescription(description)
		.setTimestamp()
		.setFooter(
			bot.client.user.username,
			bot.client.user.displayAvatarURL({ size: 32 })
		);
}

/**
 * Shortcut for creating discord.js embeds in a specific channel. This checks for the channel to exist and catches
 * any errors.
 *
 * @param title {string}
 * @param description {string}
 * @param channel {module:"discord.js".TextChannel} the channel to send the message in.
 *
 * @returns {Promise<void>} nothing.
 */
async function emb(title, description, channel) {
	if (!channel || channel.deleted == true) return; //maybe log to server log channel
	try {
		await channel.send(create_embed(title, description));
	} catch (error) {
		LOGGER.logMessage(`Error: ${error}`);
	}
}

/**
 * Creates embeds and logs them to a specified logging channel.
 * If logging channel is not defined, it sends the embed but returns without logging.
 *
 * @param title {string}
 * @param description {string}
 * @param channel {module:"discord.js".TextChannel}
 * @param logging_channel {module:"discord.js".TextChannel}
 */
function embl(title, description, channel, logging_channel = undefined) {
	// TODO: make async
	if (!channel || channel.deleted == true) return; //maybe log to server log channel
	let embed = create_embed(title, description);
	channel.send(embed);
	if (!logging_channel || logging_channel.deleted == true) return;
	logging_channel.send(embed);
}

/**
 * Checks a channel for matching one of the given types.
 * Valid channel types are:
 *
 * "dm", "text", "voice", "category", "news", "store"
 *
 *
 * @param channel {module:"discord.js".Channel}
 * @param req_list {string[]} an array of types to be checked against
 *
 * @returns {boolean} true, if the channel matches one or more types given by req_list
 * otherwise false.
 *
 * @throws {errors.js.BotError}, if the channel was undefined or one value in the req_list is not a valid
 * channel type.
 */
function channel_check(channel, req_list) {
	if (!channel) throw new err.BotError("Channel war nicht definiert.");
	for (let req of req_list) {
		if (["dm", "text", "voice", "category", "news", "store"].indexOf(req) == -1)
			throw new err.BotError(`Der gesuchte Channel-Typ ${req} ist invalide.`);
		if (channel.type == req) return true;
	}
	return false;
}

/**
 * Checks, if the channel is either a category or a text channel.
 *
 * @param channel {module:"discord.js".Channel}
 *
 * @returns {boolean} true, if it matches the requirement.
 */
function isGT(channel) {
	return channel_check(channel, ["text", "category"]);
}

/**
 * Handles an occurring error by logging it into the channel and logs.
 *
 * @param e {Error}
 * @param channel {module:"discord.js".TextChannel}
 *
 * @returns {Promise<void>} nothing
 */
async function hErr(e, channel) {
	try {
		LOGGER.logMessage(`Ein Fehler ist aufgetreten ${e}`);
		LOGGER.logMessage(e.stack);
		await emb("Ein Fehler ist aufgetreten", e, channel);
	} catch (error) {
		LOGGER.logMessage(`Ein Fehler ist aufgetreten ${error}`);
	}
}


/**
 * Saves a config to the matching database. eg <modulename>_config
 *
 * @param mod_attributes {{default_config: {}, modulename: string}}
 * @param guild_ID {string}
 * @param config {{}}
 *
 * @throws {errors.js.BotError}, when a key in the provided config object is not in the default config
 */
function config_saveall(mod_attributes, guild_ID, config) {
	if (!config) {
		config = mod_attributes.default_config;
	} else {
		for (let key in config) {
			if (!(key in mod_attributes.default_config))
				throw new err.BotError("Falscher key.");
		}
		for (let key in mod_attributes.default_config) {
			if (!(key in config)) config[key] = mod_attributes.default_config[key];
		}
	}
	const dbs = mod_attributes.modulename + "_config";
	database_create_if_not_exists(dbs, ["guild", "key_value"]);
	try {
		let i = lookup_key_value(dbs, "guild", guild_ID);
		database_row_change(dbs, i[0], "key_value", config);
	} catch (e) {
		database_row_add(dbs, [guild_ID, config]);
	}
}

/**
 * Updates the config and saves it.
 *
 * @param mod_attributes {{default_config: {}, modulename: string}}
 * @param guild_ID {string}
 * @param key {string}
 * @param value {*}
 */
function config_update(mod_attributes, guild_ID, key, value) {
	let config = config_load(mod_attributes, guild_ID);
	if (!(key in config)) throw new err.BotError("Kein valider Key.");
	config[key] = value;
	config_saveall(mod_attributes, guild_ID, config);
}

/**
 * Loads a config and returns the config map.
 *
 * @param mod_attributes {{default_config: {}, modulename: string}}
 * @param guild_ID {string}
 *
 * @returns {{}}
 */
function config_load(mod_attributes, guild_ID) {
	const dbs = mod_attributes.modulename + "_config";
	let config = mod_attributes.default_config;
	database_create_if_not_exists(dbs, ["guild", "key_value"]);
	try {
		let i = lookup_key_value(dbs, "guild", guild_ID);
		if (i.length > 1) throw new err.BotError("Zu viele Einträge.");
		config = lookup_index(dbs, i[0], "key_value");
		//TODO solve this line
		// eslint-disable-next-line no-empty
	} catch (e) {}
	return config;
}

/**
 * Gets a config key.
 *
 * @param mod_attributes  {{default_config: {}, modulename: string}}
 * @param guild_ID {string}
 * @param key {string}
 *
 * @returns {*} the matching json object.
 *
 * @throws {errors.js.BotError}, if the key was not in the config
 */
function config_get(mod_attributes, guild_ID, key) {
	let config = config_load(mod_attributes, guild_ID);
	if (!(key in config)) throw new err.BotError("Kein valider Key.");
	return config[key];
}

function config_toStr(mod_attributes, guild_ID) {
	let config = config_load(mod_attributes, guild_ID);
	let out = "";
	for (let cfg_key in config) {
		out += `${cfg_key} = ${JSON.stringify(config[cfg_key])}\n`;
	}
	return out.trim();
}

/**
 * Checks, if the user has the admin permission and throws an error.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @returns {Promise<void>} nothing.
 *
 * @throws {err.BotError}, if the user doesn't have the required permission. The error message can be displayed to
 * the user.
 */
async function is_admin(user_ID, guild) {
	await has_permission(user_ID, guild, "ADMINISTRATOR");
}

/**
 * Checks, if the user has a specific permission.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @param perm_name {typeof module:"discord.js".PermissionString}
 *
 * @returns {Promise<void>} nothing.
 *
 * @throws {err.BotError}, if the user doesn't have the required permission. The error message can be displayed to
 * the user.
 */
async function has_permission(user_ID, guild, perm_name) {
	let guildMember = await guild.members.fetch({
		user: user_ID,
		cache: true,
		force: true,
	});
	let has = guildMember.roles.highest.permissions.has(perm_name);
	if (!has || has == false)
		throw new err.BotError(
			`Du brauchst die ${perm_name} Berechtigung, um dies auszuführen.`
		);
}

/**
 * Gets the nickname/display-name of a person.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @returns {Promise<string>}
 */
async function get_nickname(user_ID, guild) {
	let guildMember = await guild.members.fetch({
		user: user_ID,
		cache: true,
		force: true,
	});
	return guildMember.displayName;
}

module.exports = {
	/*objects*/
	Parameter,
	Command,
	/*functions*/
	initialize,
	lookup_key_value,
	load_database,
	create_database,
	exists,
	lookup_index,
	database_row_add,
	database_row_delete,
	database_row_change,
	database_for_each,
	database_create_if_not_exists,
	save_databases,
	parse_message,
	help_module,
	emb,
	embl,
	channel_check,
	isGT,
	log: LOGGER,
	wait,
	hErr,
	config_load,
	config_saveall,
	config_update,
	config_toStr,
	config_get,
	is_admin,
	has_permission,
	get_nickname,
	prefix,
};
