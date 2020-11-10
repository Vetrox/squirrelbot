// const discord = require("discord.js");
// const log = require("../log.js");
const attributes = {
	modulename: "chmgr",
	description:
		"Der Channel-Manager. Hier kannst Du Channels kreieren und löschen. Auch ganze Bereiche, die nur Du und deine Freunde betreten können, kannst du hier erschaffen. Die Administratoren können mithilfe des setup Commands Rollen für jeden Command angeben, die diesen Ausführen dürfen.",
	default_config: {
		area_role_attributes: {
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
		},
		create: ["everyone"],
		create_area: ["everyone"],
		delete_area: ["everyone"],
		invite: ["everyone"],
		delete: ["everyone"],
	},
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
			"Kreiert deinen eigenen Bereich, auf den nur eingeladene Personen Zugriff haben. Zum hinzufügen/entfernen von Personen siehe invite.",
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
					(nr) => nr >= 1,
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
			"is_part_of_category", // true or false
			"is_category_parent", // when it's the parent of a private user channel. false by default
			"manage_type", // role or userID. important for deletion and change
		],
	},
];

function initialize() {
	for (const dbs of databases)
		bot.api.database_create_if_not_exists(dbs.name, dbs.keys);
}

async function check_role(user, guild, cmd) {
	if (user.bot == true)
		throw new bot.err.BotError("Der User darf kein Bot sein.");
	const required_roles = bot.api.config_get(attributes, guild.id, cmd);
	const guildMember = await guild.members.fetch({
		user: user.id,
		cache: true,
		force: true,
	});
	for (const role_name of required_roles) {
		const required_role = guild.roles.cache.find(
			(role) =>
				role.name.toLowerCase() == role_name.toLowerCase() ||
				role.name.toLowerCase() == "@" + role_name.toLowerCase()
		);
		if (guildMember.roles.highest.comparePositionTo(required_role) >= 0) {
			return true;
		}
	}
	throw new bot.err.BotError("Der User hat keine der benötigten Rollen.");
}

async function onMessage(message) {
	try {
		const res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
			case "create": {
				await check_role(message.author, message.guild, "create");
				const channelMgr = message.guild.channels;
				const parentID = res.params["-parentID"]?.[0];
				const opt = {};
				opt.type = res.params["-type"][0];
				if (parentID) opt.parent = parentID;
				const channel = await channelMgr.create(res.params["-name"][0], opt);
				bot.api.database_row_add(databases[0].name, [
					channel.id,
					message.author.id,
					false, //is not part of category
					true,
					"role",
				]);
				bot.api.emb(
					"Erfolgreich",
					"Channel erfolgreich kreiert.",
					message.channel
				);
				break;
			}
			case "create_area": {
				await check_role(message.author, message.guild, "create_area");
				const channelMgr = message.guild.channels;
				const permissions = bot.api.config_get(
					attributes,
					message.guild.id,
					"area_role_attributes"
				);
				const category = await channelMgr.create(res.params["-name"][0], {
					type: "category",
					permissionOverwrites: [
						{
							id: message.guild.roles.everyone,
							deny: ["VIEW_CHANNEL"],
						},
					],
				});
				const text = await channelMgr.create("chat", {
					type: "text",
					parent: category,
				});
				const voice = await channelMgr.create("voice", {
					type: "voice",
					parent: category,
				});
				const access_type = res.params["-access_type"][0];

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
				bot.api.emb(
					"Erfolgreich",
					"Alle Channel wurden kreiert!",
					message.channel
				);
				break;
			}
			case "delete_area": {
				await check_role(message.author, message.guild, "delete_area");
				const channelMgr = message.guild.channels;
				let owner_id = message.author.id;
				if (res.params["-here"] == "true") {
					await bot.api.is_admin(message.author.id, message.guild); // throws
					let owner_of_this_channel_id;
					try {
						owner_id = bot.api.lookup_index(
							databases[0].name,
							bot.api.lookup_key_value(
								databases[0].name,
								"channelID",
								message.channel.id
							)[0],
							"ownerID"
						);
					} catch (error) {
						throw new bot.err.Find("Owner von diesem Channel", "Datenbank");
					}
				}
				try {
					const deleted = await deleteArea(message, owner_id, channelMgr);
					bot.api.emb(
						"Erfolgreich gelöscht",
						`${deleted} Channel wurden erfolgreich gelöscht.`,
						message.channel
					);
				} catch (error) {
					bot.api.emb(
						"Nicht gefunden",
						"Konnte keine Category-Channel in der Datenbank finden, die dir gehören.",
						message.channel
					);
					return;
				}
				break;
			}
			case "invite": {
				await check_role(message.author, message.guild, "invite");
				let index, category;
				const thischannel = await message.channel.fetch(true); //get the full version of this channel
				/*check, if user is owner of this channel and get the parent category of it, if its a child*/
				try {
					index = bot.api.lookup_key_value(
						databases[0].name,
						"channelID",
						message.channel.id
					)[0];
					const owner = bot.api.lookup_index(
						databases[0].name,
						index,
						"ownerID"
					);
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

				const remove = res.params["-remove"][0];
				let guildMember;
				try {
					const user_str = res.params["-name"][0];
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
						const permissions = bot.api.config_get(
							attributes,
							message.guild.id,
							"area_role_attributes"
						);
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
				const channelMgr = message.guild.channels;
				const chID = res.params["-channelID"]?.[0];
				try {
					const channel = await channelMgr.cache.get(chID);
					const i = bot.api.lookup_key_value(
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
				await bot.api.is_admin(message.author.id, message.guild);
				if ("-key" in res.params) {
					const key = res.params["-key"][0];
					const values = res.params["-value"];
					if (key == "area_role_attributes") {
						const role_name = values[0];
						const role = message.guild.roles.cache.find(
							(r) =>
								r.name.toLowerCase() == role_name.toLowerCase() ||
								r.name.toLowerCase() == "@" + role_name.toLowerCase()
						);
						const permissions = { VIEW_CHANNEL: true };
						for (const perm of role.permissions.toArray()) {
							permissions[perm] = true;
						}
						bot.api.config_update(
							attributes,
							message.guild.id,
							key,
							permissions
						);
					} else {
						bot.api.config_update(attributes, message.guild.id, key, values);
					}
				}
				bot.api.emb(
					"Konfiguration",
					bot.api.config_toStr(attributes, message.guild.id),
					message.channel
				);
				break;
			}
		}
	} catch (error) {
		bot.api.hErr(error, message.channel);
	}
}

async function deleteArea(message, owner_id, channelMgr) {
	const data = [];
	let child_ch_nr = 0;
	for (const ind of bot.api.lookup_key_value(
		databases[0].name,
		"ownerID",
		owner_id
	)) {
		const c = [];
		let skip = false;
		for (const key of databases[0].keys) {
			const value = bot.api.lookup_index(databases[0].name, ind, key);
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

	let i = 0;
	let deleted = 0;
	while (data.length > 0) {
		i = i >= data.length ? 0 : i;
		const is_parent = data[i][3];
		if (child_ch_nr > 0 && is_parent == true) {
			i++;
			continue;
		}
		const channel = await channelMgr.cache.get(data[i][0]);
		if (!channel || channel.deleted == true) {
			i++;
			continue;
		}
		const manage_type = data[i][4];
		if (manage_type == "role") {
			let role_id;
			channel.permissionOverwrites.each((r) => {
				if (r.type == "role" && r.id != message.guild.roles.everyone.id)
					role_id = r.id;
			});
			message.guild.roles
				.fetch(role_id)
				.then((role) => role.delete())
				.catch((w) => undefined);
			message.member.roles.remove(role_id).catch((w) => undefined);
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
		const row = bot.api.lookup_key_value(
			databases[0].name,
			"channelID",
			channel.id
		);
		bot.api.database_row_delete(databases[0].name, row);
		await channel.delete().catch((e) => undefined);
		data.splice(i, 1);
		if (is_parent == false) {
			child_ch_nr--;
		}
		deleted++;
		i++;
	}
	return deleted;
}

module.exports = {
	hooks: {
		message: onMessage,
	},
	initialize,
	attributes,
};
