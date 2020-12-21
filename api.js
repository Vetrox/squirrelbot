const fs = require("fs");
const log = require("./log.js");
const err = require("./errors.js");
const util = require("util");
const Discord = require("discord.js");
const { prefix } = require("./config.json");

const wait = require("util").promisify(setTimeout); //async wait

/**** CLASSES ****/
class Database {
	constructor(name, keys, data) {
		//Data shold be an array: index -> [value for key1, value for key2...]; values are json objects
		this.name = name.trim();
		this.keys = keys;
		this.data = data;
		this.data_modified = false;
		this.is_saving = false;

		this.indexing(); //this.index should be: index = [(key1) {value : index into data, ...}, (key2)...];
	}

	setModAndSave() {
		this.data_modified = true;
		this.write_data();
	}

	/**
		throws:
			Nothing.
	**/
	indexing() {
		log.logMessage(`Indexing database ${this.name}`);
		this.index = [];
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
		usage: val_t(1, 'number', 'hello, world!', 'string') -> returns true;
				val_t(val1, val1_requested_type, ...);
		throws:
			Type-error, if one of the types of the arguments match doesn't match the requested type
	**/
	val_t(...args) {
		for (let i = 0; i < args.length - 2; i += 2) {
			if (typeof args[i] != args[i + 1]) {
				throw new err.Type(typeof args[i], args[i + 1]);
			}
		}
	}

	validate_keys(param_keys) {
		if (param_keys.length != this.keys.length) throw new err.InvalidData();
		for (let i = 0; i < this.keys.length; i++) {
			if (this.keys[i] != param_keys[i]) throw new err.InvalidData();
		}
	}

	validate(data) {
		let data_valid = true;
		this.val_t(data, "object");
		if (data.length != this.keys.length) data_valid = false;
		data.forEach((e) => {
			try {
				for (let d of data) {
					JSON.stringify(d);
				}
			} catch (error) {
				data_valid = false;
				log.logMessage(error.message);
			}
		});
		if (!data_valid) throw new err.InvalidData();
	}

	/**
		returns the index of the key in the keys array
	**/
	key_i(keyname) {
		let i = this.keys.indexOf(keyname);
		if (i == -1) throw new err.Find("key", "keys of the database");
		return i;
	}

	/**
		executes the lambda with each row as a parameter
	**/
	async for_each(lambda) {
		for (let d of this.data) await lambda(d);
	}

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
		throws:
			Range error
	**/
	del_row(data_index) {
		this.val_t(data_index, "number");
		if (data_index < 0 || data_index >= this.data.length)
			throw new err.Range("index");
		this.data.splice(data_index, 1); //hopefully this works
		this.indexing();
		this.setModAndSave();
	}

	/**
		throws:
			- Find-error, if the key isn't in the keys array
			- Find-error, if the value isn't in the index of the key
	
	**/
	lookup_key_value(which_key, value) {
		//returns a list of indices in which the value for the key is satisfied.
		let i = this.key_i(which_key);
		let data_indices = this.index[i][value];
		if (!data_indices || data_indices.length === 0)
			throw new err.Find(value, "index of the key");
		return data_indices;
	}

	/**
		throws:
			- Type-error, when the index isn't a string or the key isn't a string.
			- Range-error, when the index istn't in the required range.
			- Find-error, when the key is not in the database.
	**/
	lookup_index(index, key) {
		this.val_t(index, "number", key, "string");
		if (index < 0 || index >= this.data.length) throw new err.Range("index");
		let i = this.key_i(key);
		return this.data[index][i];
	}

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
	Writes the data on disk (async)
	(optional callback)
**/
	async write_data(callback) {
		log.logMessage("Starting saving of database " + this.name);
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
				log.logMessage(err);
				log.logMessage(err.stack);
			} else {
				log.logMessage(`The database ${this.name} has been saved!`);
				try {
					typeof callback === "function" && callback();
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

	isEqual(data1, data2) {
		if (!data1 || !data2 || data1.length != data2.length) return false;
		for (let i = 0; i < data1.length; i++) {
			if (data1[i] != data2[i]) return false;
		}
		return true;
	}
}

class Parameter {
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

class Command {
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

	/* check dependencies for each param */
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
						console.log(
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
		Checks the given parameter/arguments for matching with this command. Checking for modulename and prefix should happen before!!!
		This gets executed at first.
		Also autocompletes commands.

		returns 'params', if input passed the test; false, if input is wrong!

		throws:
			- Find-error, if a parameter is given (starting with a minus),
				but it's not inside the command parameter list.
			- ParameterArguments-error, 
				if the user has given the wrong amount of arguments to the parameter. And it couldn't be default constructed
				This is determined by the arg_check_lambda
			- ParameterDependency-error,
				if the user didn't set a dependent parameter, which isn't default-initialized.
			- ParameterRequired-error,
				if the user didn't set a required parameter for the command.
	**/
	check() {
		if (arguments[0] != this.name) return false;
		let params = {};
		let cache_param;
		let cache_args = [];
		for (let i = 1; i < arguments.length; i++) {
			let arg = arguments[i];
			/* when it's a param and it's not in the list return false */
			if (arg.startsWith("-") && !(arg in this.par_desc_map)) {
				throw new err.Find(
					arg,
					`command parameter list for command ${this.name}`
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

async function shutdown() {
	if (!bot.running || bot.running == false) return;
	bot.api.log.logMessage("Preparing shutdown.");
	await save_databases_wait();
	bot.client.destroy();
	bot.running = false; //not used at this time but hey
	bot.api.log.logMessage("Bye...");
	process.exit();
}

function hookexit() {
	process.on("exit", shutdown);
	process.on("SIGINT", shutdown);
	process.on("SIGUSR1", shutdown);
	process.on("SIGUSR2", shutdown);
	process.on("uncaughtException", (error) => {
		log.logMessage(error);
		log.logMessage(error.stack);
		shutdown();
	});
}
let databases = {}; //highly inefficient lookup for each database could result in long clustered lookups.
let possible_databases = [];

function initialize() {
	hookexit();
	if (!fs.existsSync("./data")) {
		log.logMessage("Creating database folder...");
		fs.mkdirSync("./data");
	}
	let files = fs.readdirSync("./data");
	for (file of files) {
		possible_databases.push(file);
	}
	save_databases_interval();
}

/**
waits for them to finish saving
**/
async function save_databases_wait() {
	let n = 0;
	for (database in databases)
		if (databases[database].data_modified === true) {
			n++;
			databases[database].write_data(() => n--);
		}
	while (n > 0) {
		await wait(100);
	}
	log.logMessage("Saved all Databases controlled.");
}

/**
	saves the databases asynchronously, so the execution is not blocked. makes the save_databases_interval function redundant.
**/
function save_databases() {
	for (database in databases)
		if (databases[database].data_modified === true)
			databases[database].write_data();
}

//TODO: remove because of redundancy
function save_databases_interval() {
	save_databases();
	setTimeout(save_databases_interval, 50 * 1000);
}

function exists(database) {
	return possible_databases.indexOf(database) > -1;
}

function prepare_request(database) {
	if (!exists(database)) throw new err.Unexisting(database);
	cache_dbs(database);
}

function database_create_if_not_exists(database, keys) {
	if (!exists(database)) {
		create_database(database, keys);
	} else {
		cache_dbs(database);
		try {
			databases[database].validate_keys(keys);
		} catch {
			log.logMessage("CRITICAL DATABASE ERROR!!! " + database);
			process.exit();
		}
	}
}

async function database_for_each(database, lambda) {
	prepare_request(database);
	return await databases[database].for_each(lambda);
}

function database_row_add(database, data) {
	prepare_request(database);
	return databases[database].add_row(data);
}

/**
	throws
		Range error
**/
function database_row_delete(database, index) {
	prepare_request(database);
	return databases[database].del_row(index);
}

function database_row_change(database, data_index, key, new_value) {
	prepare_request(database);
	return databases[database].change_data(data_index, key, new_value);
}

/**
	returns a list of indices of the data in that database

	throws: 
		- Unexisting error, when the database is not exisiting
		- Find error, when key not in keys or value not in index[key]
**/
function lookup_key_value(database, key, value) {
	//what happens, when multiple modules acess the same database at the same time?!?!?
	prepare_request(database);
	return databases[database].lookup_key_value(key, value);
}

function lookup_index(database, index, key) {
	//get value at (index, key)
	prepare_request(database);
	return databases[database].lookup_index(index, key);
}

function cache_dbs(database) {
	//loads the database from the cache, otherwise from disk
	if (!(database in databases)) load_database(database);
}

function load_database(database) {
	//should always be checked first, if this database truly exists.
	/*structure:
	row1 = keys; separated by spaces
	row2 (key1) = value_for_key1;
	row3 (key2) = value_for_key2;
	row4 (key1) = value2_for_key1;
	...
	*/
	log.logMessage(`Loading database ${database}`);
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

function create_database(database, keys) {
	if (database in databases) {
		throw new err.Dublication(database);
	} else {
		log.logMessage("Creating database " + database);
		possible_databases.push(database);
		databases[database] = new Database(database, keys, []);
		databases[database].setModAndSave();
	}
}

/**
input:
	- raw message from event
	- attributes of the module. Should contain modulename and commands

usage:
	This should be used, when using the 'message' event from discordjs.
	It parses the raw message to a dict of this structure:
	{
		name: commandName,
		params: {
			commandParam1 : parameter1Arguments,
			...
		}
	}
	if the message doesn't belong to the module, it returns false.
	if the commandname isn't found in the commandlist of the module it throws err.CommandNameNotFound.
		This leads to the fact, that you cannot have a commandlist without a single command.
	if the user input fails a check inside the specified command, it returns a Command-error,
		which conains a useful error message to log in the channel. (error.message)
**/
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
	help for module and it's commands
	requires: attributes.modulename, attributes.description, attributes.commands
**/
function help_module(mod_attributes, channel) {
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
		desc += '\`\`\`diff\n+ Beispiel(e) +\n';
		for (let example of cmd.examples) {
			desc += example + '\n';
		}
		desc += '\`\`\`';
		for (let par_name in cmd.par_desc_map) {
			let c = cmd.par_desc_map[par_name];
			desc +=
				`\`\`\`diff\n` +
				`${par_name} [${c.type}` +
				(c.default_construct == true
					? `; default: ${c.default_args.toString().replace(",", " ")}]\n`
					: "]\n") +
				` ${c.description}\n` +
				(c.dependent_params.length > 0
					? `+ hängt von diesen Parametern ab: [${c.dependent_params}]`
					: "") +
				`\`\`\``;
		}
		embed.addField(`cmd: ${cmd.name}`, desc, false);
	}
	channel.send(embed);
}

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
	shortcut for creating discordjs embeds
**/
function emb(title, description, channel) {
	if (!channel || channel.deleted == true) return; //maybe log to server log channel
	try {
		channel.send(create_embed(title, description));
	} catch (error) {
		log.logMessage(`Error: ${error}`);
	}
}

/**
	can be used to create embeds with simulaniously logging it to a logging channel
**/
function embl(title, description, channel, logging_channel = undefined) {
	if (!channel || channel.deleted == true) return; //maybe log to server log channel
	let embed = create_embed(title, description);
	channel.send(embed);
	if (!logging_channel || logging_channel.deleted == true) return;
	logging_channel.send(embed);
}

function channel_check(channel, req_list) {
	if (!channel) throw new err.BotError("Channel war nicht definiert.");
	for (req of req_list) {
		if (["dm", "text", "voice", "category", "news", "store"].indexOf(req) == -1)
			throw new err.BotError(`Der gesuchte Channel-Typ ${req} ist invalide.`);
		if (channel.type == req) return true;
	}
	return false;
}

/** 
	is Guild-Text Channel
**/
function isGT(channel) {
	return channel_check(channel, ["text", "category"]);
}
/**
	handle error
**/
function hErr(e, channel) {
	try {
		emb("Ein Fehler ist aufgetreten", e, channel);
		log.logMessage(`Ein Fehler ist aufgetreten ${e}`);
		log.logMessage(e.stack);
	} catch (error) {
		log.logMessage(`Ein Fehler ist aufgetreten ${error}`);
	}
}

/** CONFIG **/
/**
	a config is a dictionary with key and value pairs
	throws:
		Doublication if the key ends up more than one time in the database.
**/
function config_saveall(mod_attributes, guild_ID, config) {
	if (!config) {
		config = mod_attributes.default_config;
	} else {
		for (key in config) {
			if (!(key in mod_attributes.default_config))
				throw new err.BotError("Falscher key.");
		}
		for (key in mod_attributes.default_config) {
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

function config_update(mod_attributes, guild_ID, key, value) {
	const dbs = mod_attributes.modulename + "_config";
	let config = config_load(mod_attributes, guild_ID);
	if (!(key in config)) throw new err.BotError("Kein valider Key.");
	config[key] = value;
	config_saveall(mod_attributes, guild_ID, config);
}

function config_load(mod_attributes, guild_ID) {
	const dbs = mod_attributes.modulename + "_config";
	let config = mod_attributes.default_config;
	database_create_if_not_exists(dbs, ["guild", "key_value"]);
	try {
		let i = lookup_key_value(dbs, "guild", guild_ID);
		if (i.length > 1) throw new err.BotError("Zu viele Einträge.");
		config = lookup_index(dbs, i[0], "key_value");
	} catch (e) {}
	return config;
}

function config_get(mod_attributes, guild_ID, key) {
	let config = config_load(mod_attributes, guild_ID);
	if (!(key in config)) throw new err.BotError("Kein valider Key.");
	return config[key];
}

function config_toStr(mod_attributes, guild_ID) {
	let config = config_load(mod_attributes, guild_ID);
	let out = "";
	for (cfg_key in config) {
		out += `${cfg_key} = ${JSON.stringify(config[cfg_key])}\n`;
	}
	return out.trim();
}
/**
	throws:
		Bot-Error, if the user isn't an admin
**/
async function is_admin(user_ID, guild) {
	await has_permission(user_ID, guild, "ADMINISTRATOR");
}

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
	log,
	wait,
	hErr,
	config_load,
	config_saveall,
	config_update,
	config_toStr,
	config_get,
	is_admin,
	has_permission,
};
