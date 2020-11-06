const discord = require("discord.js");
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
			[
				new bot.api.Parameter(
					"-here",
					"optional",
					[],
					"Falls Du ein Admin bist, und diesen Kanal löschen willst.",
					(nr) => nr == 1,
					["true"],
					true
				),
			]
		),
		new bot.api.Command("invite", "Läd Personen ein/aus.", [
			new bot.api.Parameter(
				"-name",
				"required",
				[],
				"Der user, mit einem @ davor",
				(nr) => nr == 1,
				[],
				false
			),
			new bot.api.Parameter(
				"-remove",
				"required",
				[],
				"Ob der User aus deinem Channel ausgeladen werden soll. Wenn weggelassen, dann wird er hinzugefügt.",
				(nr) => nr == 1,
				["false"],
				true
			),
		]),
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
					["-value"],
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
			"is_category_parent", // when it's the parent of a private user channel. false by default
			"manage_type", //role or userID. important for deletion and change
		],
	},
	{
		name: attributes.modulename + "_settings",
		keys: ["key", "value"],
		/**all keys:
			<cmdname>: role_ids // per command setting of minimum role to execute it.

			collecting_category : categoryID // the category under which all user created areas will be collected
			area_role_attributes: roleid // eine Vorlagenrolle, die zum setzen der berechtigungen für die category teilnehmer benutzt wird. TODO: setze @everyone das komplement dessen
			logging_channel: channelID // der channel, in den alle creations geloggt werden sollen.
		**/
	},
];

function help(channel) {
	bot.api.help_module_commands(attributes, channel);
}

function initialize() {
	for (let dbs of databases) {
		bot.api.database_create_if_not_exists(dbs.name, dbs.keys);
	}
	updateCFG();
}

let cfg = {
	collecting_category: "undefined", // the category under which all user created areas will be collected //TODO: this isnt possible i think, because there are only top level categories allowed
	area_role_attributes: "undefined", // eine Vorlagenrolle (name), die zum setzen der berechtigungen für die category teilnehmer benutzt wird. TODO: setze @everyone das komplement dessen
	logging_channel: "undefined", // der channel, in den alle creations geloggt werden sollen.
};

function updateCFG() {
	//add modified listener here to save unneccessary overhead
	/*add every config key to database and update cfg with real data*/
	for (cfg_key in cfg) {
		try {
			let i = bot.api.lookup_key_value(
				databases[1].name,
				databases[1].keys[0],
				cfg_key
			);
			cfg[cfg_key] = bot.api.lookup_index(
				databases[1].name,
				i[0],
				databases[1].keys[1]
			);
		} catch (error) {
			bot.api.database_row_add(databases[1].name, [cfg_key, cfg[cfg_key]]);
		}
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
						true,
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
				let permissions = gatherPermissions(message.guild);
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
							category.createOverwrite(own_role, permissions);
						});
				} else if (access_type == "userID") {
					category.createOverwrite(message.author, permissions);
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
					true,
					access_type,
				]);
				bot.api.database_row_add(databases[0].name, [
					text.id,
					message.author.id,
					true,
					false,
					access_type,
				]);
				bot.api.database_row_add(databases[0].name, [
					voice.id,
					message.author.id,
					true,
					false,
					access_type,
				]);

				bot.api.save_databases(); //TODO: remove
				break;
			}
			case "delete_area": {
				await check_role(message.author, message.guild, "delete_area");
				let channelMgr = message.guild.channels;
				let owner_id = message.author.id;
				if (res.params["-here"] == "true") {
					let owner_of_this_channel_id;
					try {
						owner_of_this_channel_id = bot.api.lookup_index(
							databases[0].name,
							bot.api.lookup_key_value(
								databases[0].name,
								"channelID",
								message.channel.id
							)[0],
							"ownerID"
						);
					} catch (error) {
						bot.api.emb(
							"Datenbank-Fehler",
							"Konnte den Owner von diesem Channel nicht finden.",
							message.channel
						);
						return;
					}
					let is_admin = message.member.roles.highest.permissions.has(
						"ADMINISTRATOR"
					);
					if (is_admin == true) {
						owner_id = owner_of_this_channel_id;
					} else if (owner_of_this_channel_id == message.author.id) {
						//proceed because the channel belongs to the owner. the argument was probably passed by accident tho
					} else {
						bot.api.emb(
							"Berechtigungsfehler",
							"Du hast nicht die Berechtigungen, um Channel zu löschen, die dir nicht gehören. Frag bitte einen Administrator.",
							message.channel
						);
						return;
					}
				}
				try {
					let deleted = await deleteArea(message, owner_id, channelMgr);
					bot.api.emb(
						"Erfolgreich gelöscht",
						`${deleted} Channel wurden erfolgreich gelöscht.`,
						message.channel
					);
					bot.api.save_databases(); //TODO: remove
				} catch (error) {
					bot.api.emb(
						"Nicht gefunden",
						"Konnte keine Category-Channel in der Datenbank finden, die dir gehören.",
						message.channel
					);
					console.log(error);
					return;
				}
				break;
			}
			case "invite": {
				await check_role(message.author, message.guild, "invite");
				let index, category;
				let thischannel = await message.channel.fetch(true); //get the full version of this channel
				/*check, if user is owner of this channel and get the parent category of it, if its a child*/
				try {
					index = bot.api.lookup_key_value(
						databases[0].name,
						"channelID",
						message.channel.id
					)[0];
					let owner = bot.api.lookup_index(databases[0].name, index, "ownerID");
					if (owner != message.author.id) throw new Error();
					if (thischannel.type != "category") {
						//could be replaced by channel.type == 'category' because there are only top level categories.
						category = thischannel.parent;
					} else {
						category = thischannel;
					}
				} catch (error) {
					bot.api.emb(
						"Berechtigungsfehler",
						"Du bist nicht der Owner des Channels."
					);
					return;
				}

				let remove = res.params["-remove"][0];
				let guildMember;
				try {
					let user_str = res.params["-name"][0];
					guildMember = await message.guild.members.fetch(
						user_str.substring(3, user_str.length - 1)
					);
				} catch (error) {
					bot.api.emb("Falscher User", "Der User ist mir nicht bekannt.");
					return;
				}

				if (
					bot.api.lookup_index(databases[0].name, index, "manage_type") ==
					"role"
				) {
					category.permissionOverwrites.each((r) => {
						if (r.type == "role" && r.id != message.guild.roles.everyone.id) {
							if (
								remove == "false" &&
								guildMember.roles.cache.has(r.id) == false
							) {
								guildMember.roles.add(r.id);
								bot.api.emb(
									"Erfolgreich",
									`${guildMember.toString()} ist jetzt per Rolle eingeladen.`,
									message.channel
								);
								return;
							} else if (
								remove == "true" &&
								guildMember.roles.cache.has(r.id) == true
							) {
								guildMember.roles.remove(r.id);
								bot.api.emb(
									"Erfolgreich",
									`${guildMember.toString()} ist jetzt per Rolle ausgeladen.`,
									message.channel
								);
								return;
							} else {
								bot.api.emb(
									"Fehler",
									`${guildMember.toString()} wurde entweder schon entfernt oder hinzugefügt.`,
									message.channel
								);
							}
						}
					});
				} else {
					if (remove == "false") {
						let permissions = gatherPermissions(message.guild);
						category.updateOverwrite(guildMember, permissions);
						bot.api.emb(
							"Erfolgreich",
							`${guildMember.toString()} ist jetzt per userID eingeladen.`,
							message.channel
						);
						return;
					} else if (remove == "true") {
						/* theoretically we could re-set all permissions to hide blacklisted users*/
						category.updateOverwrite(guildMember, { VIEW_CHANNEL: false });
						bot.api.emb(
							"Erfolgreich",
							`${guildMember.toString()} ist jetzt per userID ausgeladen.`,
							message.channel
						);
						return;
					}
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
						"channelID",
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
					bot.api.emb(
						"Erfolg!",
						"Channel erfolgreich gelöscht.",
						message.channel
					);
				} catch (error) {
					bot.api.emb(
						"Lösch Fehler",
						`Beim löschen des Channels mit der ID ${chID} ist ein Fehler aufgetreten. Prüfe bitte auch die Permissions. Error: ${error.message}`,
						message.channel
					);
				}
				break;
			}
			case "config": {
				let guildMember = await message.guild.members.fetch({
					user: message.author.id,
					cache: true,
					force: true,
				});
				let is_admin = guildMember.roles.highest.permissions.has(
					"ADMINISTRATOR"
				);
				if (!is_admin) {
					bot.api.emb(
						"Berechtigungsfehler",
						"Du musst ein Administrator sein, um diesen Command ausführen zu können",
						message.channel
					);
					return;
				}
				updateCFG(); //maybe redundant
				if (!res.params["-key"]?.length || res.params["-key"]?.length == 0) {
					bot.api.emb("Konfiguration", JSON.stringify(cfg), message.channel); //TODO: rework
				} else {
					let key = res.params["-key"][0];
					let value = res.params["-value"][0];
					if (!key || !value) {
						bot.api.emb(
							"Invalide Daten",
							"Die angegebenen Daten waren nicht richtig."
						);
						return;
					}
					if (!(key in cfg)) {
						bot.api.emb("Fehler", "Unbekannter Schlüssel", message.channel);
						return;
					}
					//HINWEIS: hier werden die Daten nicht auf Richtigkeit geprüft, das muss bei jedem individuellen anwendungsfall passieren
					let i = bot.api.lookup_key_value(
						databases[1].name,
						databases[1].keys[0],
						key
					);
					bot.api.database_row_change(
						databases[1].name,
						i[0],
						databases[1].keys[1],
						value
					);
					updateCFG();
					bot.api.emb(
						"Eintrag erfolgreich.",
						`Der Schlüssel ${key} besitzt jetzt den Wert ${value}`,
						message.channel
					);
				}
				bot.api.save_databases(); //TODO: remove

				break;
			}
			case "setup_cmd_permissions": {
				let guildMember = await message.guild.members.fetch({
					user: message.author.id,
					cache: true,
					force: true,
				});
				let is_admin = guildMember.roles.highest.permissions.has(
					"ADMINISTRATOR"
				);
				if (!is_admin) {
					bot.api.emb(
						"Berechtigungsfehler",
						"Du musst ein Administrator sein, um diesen Command ausführen zu können",
						message.channel
					);
					return;
				}
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
		bot.api.emb("Etwas ist schief gelaufen", error, message.channel);
	}
}

async function deleteArea(message, owner_id, channelMgr) {
	let data = [];
	let child_ch_nr = 0;
	for (ind of bot.api.lookup_key_value(
		databases[0].name,
		"ownerID",
		owner_id
	)) {
		let c = [];
		let skip = false;
		for (key of databases[0].keys) {
			let value = bot.api.lookup_index(databases[0].name, ind, key);
			if (key == "is_part_of_category" && value == false) {
				skip = true;
				break;
			}
			if (key == "is_category_parent" && value == false) {
				child_ch_nr++;
			}
			c.push(value);
		}
		if (skip == true) continue;
		data.push(c);
	}
	console.log(data);
	console.log(child_ch_nr);

	let i = 0;
	let deleted = 0;
	while (data.length > 0) {
		i = i >= data.length ? 0 : i;
		let is_parent = data[i][3];
		if (child_ch_nr > 0 && is_parent == true) {
			i++;
			continue;
		}
		let channel = await channelMgr.cache.get(data[i][0]);
		if (!channel || channel.deleted == true) {
			i++;
			continue;
		}
		let manage_type = data[i][4];
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
			//i think nothing needs to be implemented here
		} else {
			bot.api.emb(
				"Datenbank fehler.",
				"Der manage_type war weder role noch userID",
				message.channel
			);
		}
		/*get the row of this channel in the database */
		let row = bot.api.lookup_key_value(
			databases[0].name,
			"channelID",
			channel.id
		);
		bot.api.database_row_delete(databases[0].name, row);
		console.log("deleted " + channel.id);
		channel.delete();
		data.splice(i, 1);
		if (is_parent == false) {
			child_ch_nr--;
		}
		deleted++;
		i++;
	}
	return deleted;
}

function gatherPermissions(guild) {
	updateCFG();
	let permissions = {
		VIEW_CHANNEL: true,
		ADD_REACTIONS: true,
		STREAM: true,
		SEND_MESSAGES: true,
		SEND_TTS_MESSAGES: true,
		EMBED_LINKS: true,
		ATTACH_FILES: true,
		READ_MESSAGE_HISTORY: true,
		USE_EXTERNAL_EMOJIS: true,
		CONNECT: true,
		SPEAK: true,
	};
	if (cfg.area_role_attributes != "undefined") {
		let role_name = cfg.area_role_attributes;
		let role = guild.roles.cache.find(
			(role) =>
				role.name.toLowerCase() == role_name.toLowerCase() ||
				role.name.toLowerCase() == "@" + role_name.toLowerCase()
		);
		permissions = { VIEW_CHANNEL: true };
		for (perm of role.permissions.toArray()) {
			permissions[perm] = true;
		}
	}
	return permissions;
}

module.exports.hooks = {
	message: onMessage,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
