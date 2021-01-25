const fs = require("fs");

const LOGGER = require.main.require("./log.js")("database");
const err = require.main.require("./api/errors/errors");

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
module.exports = class Database {
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
		LOGGER.info(`Indexing Datenbank ${this.name}`);
		this.index = new Array(this.keys.length);
		this.index.fill({});
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
			if (typeof args[i] !== args[i + 1]) {
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
		if (param_keys.length !== this.keys.length) throw new err.InvalidData();
		for (let i = 0; i < this.keys.length; i++) {
			if (this.keys[i] !== param_keys[i]) throw new err.InvalidData();
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
		if (data.length !== this.keys.length) data_valid = false;
		data.forEach(() => {
			try {
				for (let d of data) {
					JSON.stringify(d);
				}
			} catch (error) {
				data_valid = false;
				LOGGER.error(error.message);
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
		if (i === -1) throw new err.Find("key", "keys of the database");
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
		LOGGER.info("Starte Speichern der Datenbank " + this.name);
		while (this.is_saving === true) await bot.api.constants.wait(10); //wait for other async task
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
				LOGGER.error(err);
				LOGGER.error(err.stack);
			} else {
				LOGGER.info(`Die Datenbank ${this.name} wurde gespeichert!`);
				try {
					typeof callback === "function" && callback();
					//TODO solve this line
					// eslint-disable-next-line no-empty
				} catch (error) {}
			}
			this.is_saving = false;
			if (this.isEqual(cached_data, this.data) === true) {
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
		if (!data1 || !data2 || data1.length !== data2.length) return false;
		for (let i = 0; i < data1.length; i++) {
			if (data1[i] !== data2[i]) return false;
		}
		return true;
	}
};