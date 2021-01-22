import Database from "./Database";
import fs from "fs";

const err = bot.err;
const LOGGER = bot.LOGGER;
const wait = bot.api.wait;

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


export function initialize() {
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
export async function save_databases_wait() {
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
export function database_create_if_not_exists(database, keys) {
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
export async function database_for_each(database, lambda) {
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
export function database_row_add(database, data) {
	prepare_request(database);
	return databases[database].add_row(data);
}

/**
 * Deletes an entire row of a database.
 *
 * @param database the name of the database
 * @param index the row number
 */
export function database_row_delete(database, index) {
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
export function database_row_change(database, data_index, key, new_value) {
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
export function lookup_key_value(database, key, value) {
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
export function lookup_index(database, index, key) {
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
