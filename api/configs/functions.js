const err = require.main.require("./api/errors/errors");
const LOGGER = require.main.require("./log.js")("configs");

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
	bot.api.databases.functions.database_create_if_not_exists(dbs, ["guild", "key_value"]);
	try {
		let i = bot.api.databases.functions.lookup_key_value(dbs, "guild", guild_ID);
		bot.api.databases.functions.database_row_change(dbs, i[0], "key_value", config);
	} catch (e) {
		bot.api.databases.functions.database_row_add(dbs, [guild_ID, config]);
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
 * @param modAttributes {{default_config: {}, modulename: string}}
 * @param guildID {string}
 *
 * @returns {{}}
 */
function config_load(modAttributes, guildID) {
	const dbs = modAttributes.modulename + "_config";
	let config = modAttributes.default_config;
	bot.api.databases.functions.database_create_if_not_exists(dbs, ["guild", "key_value"]);
	try {
		let i = bot.api.databases.functions.lookup_key_value(dbs, "guild", guildID);
		if (i.length > 1) {
			LOGGER.error(`Zu viele Einträge in Konfigurationsdatenbank ${dbs} für guild ${guildID}. Standarddatenbank wird zurückgegeben.`);
			return config;
		}
		config = bot.api.databases.functions.lookup_index(dbs, i[0], "key_value");
	} catch (e) {
		/* if it crashes, there is a database with this key. */
		LOGGER.info(`Standardinitialisierung der Config-Datei: ${dbs} für guild ${guildID}`);
	}
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

module.exports = {
	config_get,
	config_update,
	config_toStr,
	config_load,
};