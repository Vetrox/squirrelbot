const discord = require("discord.js");
const { prefix } = require("../config.json");
const err = require("../errors.js");
const log = require("../log.js");
const attributes = {
	modulename: "chmgr",
	description:
		"Der Channel-Manager. Hier kannst Du Channels kreieren und löschen. Auch ganze Bereiche, die nur Du und deine Freunde betreten können, kannst du hier erschaffen. Die Administratoren können mithilfe des setup Commands Rollen für jeden Command angeben, die diesen Ausführen dürfen.",
	commands: [
		new bot.api.Command("create", "Kreiert einen Text oder Voicechannel. ", [
			new bot.api.Parameter(
				"-name",
				"required",
				[],
				"Der Name des Channels.",
				(nr) => nr == 1,
				[],
				false
			),
			new bot.api.Parameter(
				"-type",
				"required",
				[],
				"Der Typ des Channels (text oder voice).",
				(nr) => nr == 1,
				["text"],
				true
			),
		]),
		new bot.api.Command("delete", "Löscht einen Text oder Voicechannel.", [
			new bot.api.Parameter(
				"-channelID",
				"required",
				[],
				"Die ID des Channels. Du musst den Developermodus aktivieren, um die Channel ID mittels eines Rechtsklicks erfahren zu können. Eventuell wirst du später auch mittels eines Commands alle dir gehörenden Channel anzeigen lassen können.",
				(nr) => nr == 1,
				[],
				false
			),
		]),
	],
};

function help(channel) {
	bot.api.help_module_commands(attributes, channel);
}

function initialize() {
	//load database with permissions
	//load database with user->channels
}

function onMessage(message) {
	try {
		let res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
			case "create": {
				
				break;
			}
			case "delete": {
				
				break;
			}
		}
	} catch (error) {
		if (error instanceof err.Command) {
			message.channel.send(`Something went wrong: ${error.message}`);
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
