const discord = require("discord.js");
const { prefix } = require("../config.json");
const err = require("../errors.js");
const log = require("../log.js");
const attributes = {
	modulename: "help",
	commands: [
		new bot.api.Command("modulehelp", [
			new bot.api.Parameter(
				"-name",
				"required",
				[],
				"Der Name des Moduls.",
				(nr) => nr == 1,
				["help"],
				true
			),
		]),
	],
};

function help(channel) {
	channel.send(` --- Das ist die Hilfeseite vom Squirrelbot ---

🡒 Um für ein bestimmtes Modul eine Hilfeseite angezeigt zu bekommen, gib einfach !help <modulname> ein.
🡒 Um alle module aufgelistet zu bekommen, gib !listmodules ein.

----------------`);
}

function initialize() {}

function onMessage(message) {
	try {
		let res = bot.api.parse_message(message, attributes);
		if(res == false) return;
		//log.logC(res);
		switch (res.name) {
			case 'modulehelp': {
				for (mod of bot.modules) {
					if (mod.help && mod?.attributes?.modulename === res.params['-name'][0]) {
						mod.help(message.channel);
						return;
					}
				}
				message.channel.send(`Konnte keine Hilfeseite für das Modul ${res.params['-name'][0]} finden.`);
				break;
			}
		}
	} catch (error) {
		if (error instanceof err.Command) {
			message.channel.send(`Something went wrong: ${error.message}`);
		} else if (error instanceof err.CommandNameNotFound) {
			message.channel.send(`Wrong command-name: ${error.message}`);
		} else {
			throw error;
		}
	}
}

module.exports.hooks = {
	message: onMessage,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
