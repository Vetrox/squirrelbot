const LOGGER = require.main.require("./log.js")("api");

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
	bot.api.databases.functions.initialize();
}

/**
 * Shuts down the whole process.
 * Saves the databases and waits for finishing.
 * Destroys the discord client
 *
 * @returns nothing.
 */
async function shutdown() {
	if (!bot.running || bot.running === false) return;
	LOGGER.info("Shutdown vorbereiten.");

	await bot.api.databases.functions.save_databases_wait();
	bot.client.destroy();
	bot.running = false; //not used at this time but hey
	LOGGER.info("Bye...");
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
		LOGGER.error(error);
		LOGGER.error(error.stack);
		shutdown();
	});
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
		LOGGER.error(`Ein Fehler ist aufgetreten ${e}`);
		LOGGER.error(e.stack);
		await bot.api.utility.embeds.functions.emb("Ein Fehler ist aufgetreten", e.toString(), channel);
	} catch (error) {
		LOGGER.error(`Ein Fehler ist aufgetreten ${error}`);
	}
}

module.exports = {
	initialize,
	hErr,
};