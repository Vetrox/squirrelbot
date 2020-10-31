const discord = require("discord.js");
const { prefix } = require("../config.json");
const err = require("../errors.js");
const log = require("../log.js");
const attributes = {
	modulename: "help",
	description:
		"Das Help-Modul. Hier kannst Du vieles über Commands und andere Module erfahren.",
	commands: [
		new bot.api.Command(
			"modulehelp",
			"Zeigt die Hilfeseite von dem angegebenen Modul",
			[
				new bot.api.Parameter(
					"-name",
					"required",
					[],
					"Der Name des Moduls.",
					(nr) => nr == 1,
					["help"],
					true
				),
			]
		),
		new bot.api.Command("listmodules", "Zeigt alle verfügbaren Module an", []),
	],
};

function help(channel) {
	bot.api.help_module_commands(attributes, channel);
}

function initialize() {}

function onMessage(message) {
	try {
		let res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
			case "modulehelp": {
				for (mod of bot.modules) {
					if (
						mod.help &&
						mod?.attributes?.modulename === res.params["-name"][0]
					) {
						mod.help(message.channel);
						return;
					}
				}
				message.channel.send(
					`Konnte keine Hilfeseite für das Modul ${res.params["-name"][0]} finden.`
				);
				break;
			}
			case "listmodules": {
				let desc = "";
				for (mod of bot.modules) {
					if (mod?.attributes?.modulename) {
						desc += "\n🡒 " + mod.attributes.modulename;
					}
				}
				bot.api.emb("Alle Module", desc, message.channel);
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
