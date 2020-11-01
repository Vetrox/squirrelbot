const discord = require("discord.js");
const attributes = { modulename: "shutdown" };
const log = require("../log.js");

const wait = require("util").promisify(setTimeout); //doesn't block the execution

function help(channel) {
  channel.send(`Shutdowns the client and saves the databases.`);
}

function initialize() {}

async function onMessage(message) {
  //TODO: add permissions
  /*if (!bot["api"].check_message(message, attributes.modulename)) return;
	bot["client"].destroy();
	log.logMessage("Shutting down...");
	bot["api"].save_databases();
	bot["running"] = false;
	await wait(1000); //make sure the files were saved
	log.logMessage("Done!");
	process.exit(0);*/
}

module.exports.hooks = {
  message: onMessage,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
