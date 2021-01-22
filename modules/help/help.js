const { attributes } = require("./attributes.js");

function initialize() {}

async function onMessage(message) {
	try {
		if (bot.api.utility.channels.functions.isGT(message.channel) === false) return;
		let res = bot.api.commands.functions.parse_message(message, attributes);
		if (res === false) return;
		switch (res.name) {
		case "modulehelp": {
			for (let mod of bot.modules) {
				if (mod?.attributes?.modulename === res.params["-name"][0]) {
					await bot.api.utility.embeds.functions.help_module(mod.attributes, message.channel);
					return;
				}
			}
			await bot.api.utility.embeds.functions.emb(
				"Keine Hilfeseite",
				`Konnte keine Hilfeseite für das Modul ${res.params["-name"][0]} finden.`,
				message.channel
			);
			break;
		}
		case "listmodules": {
			let desc = "";
			for (let mod of bot.modules) {
				if (mod?.attributes?.modulename) {
					desc += "\n→ " + mod.attributes.modulename;
				}
			}
			await bot.api.utility.embeds.functions.emb("Alle Module", desc, message.channel);
			break;
		}
		}
	} catch (error) {
		if (error instanceof bot.err.CommandNameNotFound) {
			try {
				await bot.api.utility.embeds.functions.help_module(attributes, message.channel);
			} catch (err) {
				bot.api.functions.hErr(err, message.channel);
			}
			return;
		}
		bot.api.functions.hErr(error, message.channel);
	}
}

module.exports = {
	hooks: {
		message: onMessage,
	},
	initialize,
	attributes,
};
