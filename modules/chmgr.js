const discord = require("discord.js");
const { prefix } = require("../config.json");
const err = require("../errors.js");
const log = require("../log.js");
const attributes = {
	modulename: "chmgr",
	description:
		"Der Channel-Manager. Hier kannst Du Channels kreieren und löschen. Auch ganze Bereiche, die nur Du und deine Freunde betreten können, kannst du hier erschaffen. Die Administratoren können mithilfe des setup Commands Rollen für jeden Command angeben, die diesen Ausführen dürfen.",
	commands: [
		new bot.api.Command(
			"create",
			"Kreiert einen Text oder Voicechannel. Dies ist eine Top-Level Funktionalität.",
			[
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
					"Der Typ des Channels (text/voice/category).",
					(nr) => nr == 1,
					["text"],
					true
				),
				new bot.api.Parameter(
					"-parentID",
					"optional",
					[],
					"Wenn Du den Channel an eine Kategorie anknüpfen möchtest.",
					(nr) => nr == 1,
					[],
					false
				),
			]
		),
		new bot.api.Command(
			"delete",
			"Löscht einen Text oder Voicechannel. Dies kann per definition immer nur der Owner.",
			[
				new bot.api.Parameter(
					"-channelID",
					"required",
					[],
					"Die ID des Channels. Du musst den Developermodus aktivieren, um die Channel ID mittels eines Rechtsklicks erfahren zu können. Eventuell wirst du später auch mittels eines Commands alle dir gehörenden Channel anzeigen lassen können.",
					(nr) => nr == 1,
					[],
					false
				),
			]
		),
	],
};

const databases = [
	{
		name: attributes.modulename + "_userchannels",
		keys: [
			"channelID",
			"ownerID",
			"permission_type", //role managed / userid managed
			"allowed", // [list of userids or list of roles]
		],
	},
	{
		name: attributes.modulename + "_permissions",
		keys: [
			"create", //list of Roles allowed to use the create command to create themselves a channel
			//TODO: add more commands and therefor the permissions for them too
		],
	},
];

function help(channel) {
	bot.api.help_module_commands(attributes, channel);
}

function initialize() {
	for (let dbs of databases) {
		bot.api.database_create_if_not_exists(dbs.name, dbs.keys);
	}
}

async function onMessage(message) {
	try {
		let res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
			case "create": {
				let channelMgr = message.guild.channels;
				let parentID = res.params["-parentID"]?.[0];
				let opt = {};
				opt.type = res.params["-type"][0];
				if (parentID) opt.parent = parentID;
				try {
					let channel = await channelMgr.create(res.params["-name"][0], opt);
					bot.api.database_row_add(databases[0].name, [
						channel.id,
						message.author.id,
						"role", //placeholder
						["Verified"], //placeholder
					]);
					message.channel.send('Channel erfolgreich kreiert.');
				} catch (error) {
					message.channel.send(
						`Konnte den Channel leider nicht erschaffen: ${error.message}`
					);
				}

				break;
			}
			case "delete": {
				let channelMgr = message.guild.channels;
				let chID = res.params["-channelID"]?.[0];
				try {
					let channel = await channelMgr.cache.get(chID);
					let i = bot.api.lookup_key_value(
						databases[0].name,
						databases[0].keys[0],
						channel.id
					);
					bot.api.database_row_delete(databases[0].name, i[0]);
					channel.delete();
					message.channel.send("Channel erfolgreich gelöscht.");
				} catch (error) {
					message.channel.send(
						`Beim löschen des Channels mit der ID ${chID} ist ein Fehler aufgetreten. Prüfe bitte auch die Permissions. Error: ${error.message}`
					);
				}
				break;
			}
		}
	} catch (error) {
		message.channel.send(`Etwas ist schief gelaufen: ${error.message}`);
	}
}

module.exports.hooks = {
	message: onMessage,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
