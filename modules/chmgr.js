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
			"Kreiert einen einzelnen Text- oder Voicechannel. Du kannst die Rollen, die ihn sehen können später hier auch angeben",
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
			"create_area",
			"Kreiert deinen eigenen Bereich, auf den nur eingeladene Personen Zugriff haben. Zum hinzufügen/entfernen von Personen siehe change_area. Jeder Bereich hat eine maximale Nutzeranzahl, die in den Permissions festgelegt werden kann (TODO)",
			[
				new bot.api.Parameter(
					"-name",
					"required",
					[],
					"Der Name des Bereichs.",
					(nr) => nr == 1,
					[],
					false
				),
				new bot.api.Parameter(
					"-access_type",
					"required",
					[],
					"Der Zugriffs-Management-Typ. 'role' oder 'userID'",
					(nr) => nr == 1,
					["role"],
					true
				),
			]
		),
		new bot.api.Command(
			"delete_area",
			"Löscht alle deine Areas. Eigentlich solltest du nicht mehrere Haben können.",
			[]
		),
		new bot.api.Command(
			"delete",
			"Löscht einen Text oder Voicechannel. Dies kann per Definition immer nur der Owner.",
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
		new bot.api.Command(
			"setup_cmd_permissions",
			"Setzt permissions. Aus Sicherheitsgründen dürfen dies nur die Administratoren des Servers ausführen",
			[
				new bot.api.Parameter(
					"-cmdname",
					"required",
					[],
					"Der name des Commands (delete/create/...)",
					(nr) => nr == 1,
					[],
					false
				),
				new bot.api.Parameter(
					"-roles",
					"optional",
					[],
					"Die Rollen, die diesen Command ausführen dürfen. Wenn dieser Parameter weggelassen wird, werden die bisherigen erlaubten Rollen angezeigt.",
					(nr) => nr > 0,
					["everyone"],
					true
				),
			]
		),
		new bot.api.Command(
			"config",
			"Setzt Konfigurationen. Wenn du keinen Parameter angibst, werden dir alle Gespeicherten Keys und auch die möglichen Keys angezeigt.",
			[
				new bot.api.Parameter(
					"-key",
					"optional",
					[],
					"Die Einstellung, die Du bearbeiten möchtest.",
					(nr) => nr == 1,
					[],
					false
				),
				new bot.api.Parameter(
					"-value",
					"optional",
					["-key"],
					"Der Wert, auf den die Einstellung gesetzt wird.",
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
			"is_part_of_category", //true or false
			"manage_type", //role or userID. important for deletion and change
			//"allowed", // [list of roles] //TODO: remove. we can fetch permissions from category itself
		],
	},
	{
		name: attributes.modulename + "_settings",
		keys: ["key", "value"],
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

async function check_role(user, guild, cmd) {
	if (user.bot == true)
		throw new bot.err.BotError("Der User darf kein Bot sein.");
	try {
		let i = bot.api.lookup_key_value(
			databases[1].name,
			databases[1].keys[0],
			cmd
		);
		let required_roles = bot.api.lookup_index(
			databases[1].name,
			i[0],
			databases[1].keys[1]
		);
		let guildMember = await guild.members.fetch({
			user: user.id,
			cache: true,
			force: true,
		});
		for (role_id of required_roles) {
			let required_role = await guild.roles.fetch(role_id);
			if (guildMember.roles.cache.has(required_role.id)) return;
		}
		throw new bot.err.BotError("Der User hat keine der benötigten Rollen.");
	} catch (error) {
		if (error instanceof bot.err.Find) {
			return;
		}
		throw error;
	}
}

async function onMessage(message) {
	try {
		let res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
			case "create": {
				await check_role(message.author, message.guild, "create");
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
						false, //is not part of category
						"role",
					]);
					message.channel.send("Channel erfolgreich kreiert.");
				} catch (error) {
					message.channel.send(
						`Konnte den Channel leider nicht erschaffen: ${error.message}`
					);
				}
				break;
			}
			case "create_area": {
				await check_role(message.author, message.guild, "create_area");
				let channelMgr = message.guild.channels;
				let category = await channelMgr.create(res.params["-name"][0], {
					type: "category",
					permissionOverwrites: [
						{
							id: message.guild.roles.everyone,
							deny: ["VIEW_CHANNEL"],
						},
					],
				});
				let text = await channelMgr.create("chat", {
					type: "text",
					parent: category,
				});
				let voice = await channelMgr.create("voice", {
					type: "voice",
					parent: category,
				});
				let access_type = res.params["-access_type"][0];
				if (access_type == "role") {
					message.guild.roles
						.create({
							data: {
								name: `${message.author.username}'s Bereich`,
								color: 0x111111,
								hoist: false,
								mentionable: true,
							},
						})
						.then((own_role) => {
							message.guild.members
								.fetch({
									user: message.author.id,
									cache: true,
									force: true,
								})
								.then((guildMember) => guildMember.roles.add(own_role));
							category.createOverwrite(own_role, { VIEW_CHANNEL: true });
						});
				} else if (access_type == "userID") {
					//userid based access
				} else {
					bot.api.emb(
						"Falscher Zugriffs-Typ",
						`${access_type} ist weder 'role' noch 'userID'`,
						message.channel
					);
				}

				bot.api.database_row_add(databases[0].name, [
					category.id,
					message.author.id,
					true, //is part of category
					access_type,
				]);
				bot.api.database_row_add(databases[0].name, [
					text.id,
					message.author.id,
					true,
					access_type,
				]);
				bot.api.database_row_add(databases[0].name, [
					voice.id,
					message.author.id,
					true,
					access_type,
				]);

				bot.api.save_databases(); //TODO: remove
				break;
			}
			case "delete_area": {
				await check_role(message.author, message.guild, "delete_area");
				let channelMgr = message.guild.channels;
				let deleted = 0;
				while (true) {
					let index;
					try {
						index = bot.api.lookup_key_value(
							databases[0].name,
							databases[0].keys[1], //ownerID
							message.author.id
						)[0];
					} catch (error) {
						break;
					}
					let is_cat = bot.api.lookup_index(
						databases[0].name,
						index,
						"is_part_of_category"
					);
					if (is_cat == false) continue;
					let channelID = bot.api.lookup_index(
						databases[0].name,
						index,
						databases[0].keys[0]
					);
					let channel = await channelMgr.cache.get(channelID);
					//console.log("Would delete ");
					//console.log(channel);
					//unassign and delete role.
					let manage_type = bot.api.lookup_index(
						databases[0].name,
						index,
						"manage_type"
					);
					if (manage_type == "role") {
						let role_id;
						channel.permissionOverwrites.each((r) => {
							if (r.type == "role" && r.id != message.guild.roles.everyone.id)
								role_id = r.id;
						});
						message.guild.roles
							.fetch(role_id)
							.then((role) => role.delete())
							.catch((e) => undefined);
						message.member.roles.remove(role_id).catch((e) => undefined);
					} else if (manage_type == "userID") {
						//TODO implement
					} else {
						bot.api.emb(
							"Datenbank fehler.",
							"Der manage_type war weder role noch userID",
							message.channel
						);
					}
					bot.api.database_row_delete(databases[0].name, index);
					channel.delete();
					deleted++;
				}
				if (deleted == 0) {
					bot.api.emb(
						"Nicht gefunden",
						"Konnte keine Category-Channel in der Datenbank finden, die dir gehören.",
						message.channel
					);
				} else {
					bot.api.emb(
						"Erfolgreich gelöscht",
						`${deleted} Channel wurden erfolgreich gelöscht.`,
						message.channel
					);
					bot.api.save_databases(); //TODO: remove
				}
				break;
			}
			case "delete": {
				await check_role(message.author, message.guild, "delete");
				let channelMgr = message.guild.channels;
				let chID = res.params["-channelID"]?.[0];
				try {
					let channel = await channelMgr.cache.get(chID);
					let i = bot.api.lookup_key_value(
						databases[0].name,
						databases[0].keys[0],
						channel.id
					);
					if (
						bot.api.lookup_index(
							databases[0].name,
							i[0],
							"is_part_of_category"
						) == true
					) {
						bot.api.emb(
							"Kann nicht gelöscht werden",
							"Der angegebene Channel gehört zu einer Kategorie und kann somit nicht mit diesem Command gelöscht werden.",
							message.channel
						);
						return;
					}
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
			//TODO add config
			case "setup_cmd_permissions": {
				let guildMember = await message.guild.members.fetch({
					user: message.author.id,
					cache: true,
					force: true,
				});
				let is_admin = guildMember.roles.highest.permissions.has(
					"ADMINISTRATOR"
				);
				let cmd = res.params["-cmdname"][0];
				let roles = res.params["-roles"];
				let i;
				try {
					i = bot.api.lookup_key_value(
						databases[1].name,
						databases[1].keys[0],
						cmd
					);
				} catch (error) {}
				if (roles) {
					//set roles
					let parsed_roles = [];
					for (role of roles) {
						parsed_roles.push(
							message.guild.roles.cache.find(
								(r) =>
									r.name.toLowerCase() == role.toLowerCase() ||
									r.name.toLowerCase() == "@" + role.toLowerCase()
							).id
						);
					}
					if (i) {
						bot.api.database_row_change(
							databases[1].name,
							i[0],
							databases[1].keys[1],
							parsed_roles
						);
					} else {
						bot.api.database_row_add(databases[1].name, [cmd, parsed_roles]);
					}
					bot.api.emb(
						"Rollen erfolgreich geupdated",
						`Die benötigten Rollen sind jetzt:\n ${roles}`,
						message.channel
					);
				} else if (i) {
					let data = bot.api.lookup_index(
						databases[1].name,
						i[0],
						databases[1].keys[1]
					);
					let parsed_roles = [];
					for (r_id of data) {
						let required_role = await message.guild.roles.fetch(r_id);
						parsed_roles.push(required_role.name);
					}
					bot.api.emb(
						"Erlaubte Rollen",
						parsed_roles.toString(),
						message.channel
					);
				} else {
					bot.api.emb(
						"Das tut mir leid",
						`Konnte den Command '${cmd}' nicht finden.`,
						message.channel
					);
				}
				break;
			}
			default:
				help(message.channel);
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
