const { attributes } = require("./attributes.js");

function initialize() {}

async function handleModulehelp(message, res) {
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
}

async function handleListmodules(message) {
	let desc = "";
	for (let mod of bot.modules) {
		if (mod?.attributes?.modulename) {
			desc += "\n→ " + mod.attributes.modulename;
		}
	}
	await bot.api.utility.embeds.functions.emb("Alle Module", desc, message.channel);
}

async function onMessage(message) {
	try {
		if (bot.api.utility.channels.functions.isGT(message.channel) === false) return;
		let res = bot.api.commands.functions.parse_message(message, attributes);
		if (res === false) return;
		switch (res.name) {
		case "modulehelp": {
			await handleModulehelp(message, res);
			break;
		}
		case "listmodules": {
			await handleListmodules(message, res);
			break;
		}
		}
	} catch (error) {
		if (error instanceof bot.api.errors.CommandNameNotFound) {
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
		messageCreate: onMessage,
	},
	initialize,
	attributes,
};
