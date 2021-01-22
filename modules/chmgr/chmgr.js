const {attributes}  = require("./attributes.js");
const {databases} = require("./database.js");
const LOGGER = bot.api.log;

function initialize() {
	for (const dbs of databases)
		bot.api.database_create_if_not_exists(dbs.name, dbs.keys);

	delete_unused_categories_interval();
}

async function delete_unused_categories_interval() {
	try {
		LOGGER.info("Ungenutzte Kategorien löschen...");
		bot.client.guilds.cache.each((guild, guild_ID) => {
			try {
				LOGGER.info(`Checking guild ${guild_ID}:${guild.name}`);

				const inactivity_H = bot.api.config_get(
					attributes,
					"" + guild_ID, //needs to be converted to string
					"category_inactivity_cap_hours"
				)?.[0]; //can throw due to non existing key on older configs
				if (inactivity_H == undefined || !inactivity_H || inactivity_H <= 0)
					return;

				guild.channels.cache.each(async (channel, channel_ID) => {
					if (
						channel.deleted ||
                        channel.type != "text" ||
                        !channel.viewable ||
                        channel.parentID == undefined ||
                        !channel.deletable
					)
						return;

					let lastMsgDate;
					try {
						lastMsgDate = (await channel.messages.fetch(channel.lastMessageID)
						)?.createdAt;
						//TODO solve this line
						// eslint-disable-next-line no-empty
					} catch (error) {}


					let compTime = lastMsgDate?.getTime() ?? channel.createdAt.getTime();

					const diff_H = (Date.now() - compTime) / 1000 / 60 / 60;
					if (diff_H < inactivity_H) return;

					let index;
					try {
						index = bot.api.lookup_key_value(
							databases[0].name,
							"channelID",
							channel_ID
						)[0];
					} catch (error) {
						// add error logging
						return;
					}

					const is_part_of_category = bot.api.lookup_index(
						databases[0].name,
						index,
						"is_part_of_category"
					);
					if (!is_part_of_category) return;

					const owner_id = bot.api.lookup_index(
						databases[0].name,
						index,
						"ownerID"
					);

					try {
						LOGGER.info(
							`Probiere den Channel ${channel.name} von guild ${guild.name}:${guild_ID} zu löschen`
						);
						const deleted = await deleteArea_1(guild, owner_id);
						LOGGER.info(
							`${deleted} Channels von ${owner_id} gelöscht`
						);
					} catch (error) {
						LOGGER.info(
							"Es ist ein Fehler beim Löschen von inaktiven Channels aufgetreten: "
						);
						LOGGER.info(error);
					}
				});
			} catch (error) {
				LOGGER.info(
					"Es ist ein Fehler beim Löschen von inaktiven Channels aufgetreten: "
				);
				LOGGER.info(error);
			}
		});
	} catch (error) {
		LOGGER.info(
			"Es ist ein Fehler beim Löschen von inaktiven Channels aufgetreten: "
		);
		LOGGER.info(error);
	}

	setTimeout(delete_unused_categories_interval, 5 * 60 * 1000); // every 5 mins
}

async function check_role(user, guild, cmd) {
	if (user.bot) {
		throw new bot.err.BotError("Der User darf kein Bot sein.");
	}

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

async function handleCreate(message, res) {
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
		message.guild.id,
	]);
	await bot.api.emb(
		"Erfolgreich",
		"Channel erfolgreich kreiert.",
		message.channel
	);
}

async function handleCreateArea(message, res) {
	await check_role(message.author, message.guild, "create_area");

	try {
		const indices = bot.api.lookup_key_value(
			databases[0].name,
			"ownerID",
			message.author.id
		);
		try {
			let amount = 0;
			for(let index of indices) {
				const guild_ID = bot.api.lookup_index(
					databases[0].name,
					index,
					"guildID"
				);
				if(guild_ID == message.guild.id) amount++;
			}

			if(amount >= 1) {
				await bot.api.emb(
					"Fehler: Konnte keine Kategorie erstellen",
					"Du hast bereits eine Kategorie für dich. :P",
					message.channel
				);
				return;
			}
		} catch (error) {
			// add error logging
			bot.api.hErr(error, message.channel);
			return;
		}
		//TODO solve this line
		// eslint-disable-next-line no-empty
	} catch (error) {} // no problem. there is no entry in the database for that user


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
				deny: ["VIEW_CHANNEL", "CONNECT"], // quote: Disabling this (both) will make voice channels also private.
			},
			{
				id: bot.client.user.id,
				allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT", "SPEAK", "MANAGE_ROLES", "MANAGE_CHANNELS"],
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
		await bot.api.emb(
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
		message.guild.id,
	]);
	bot.api.database_row_add(databases[0].name, [
		text.id,
		message.author.id,
		true,
		false,
		access_type,
		message.guild.id,
	]);
	bot.api.database_row_add(databases[0].name, [
		voice.id,
		message.author.id,
		true,
		false,
		access_type,
		message.guild.id,
	]);
	await bot.api.emb(
		"Erfolgreich",
		"Alle Channel wurden kreiert!",
		message.channel
	);
}

async function handleDeleteArea(message, res) {
	await check_role(message.author, message.guild, "delete_area");
	let owner_id = message.author.id;
	if (res.params["-here"] == "true") {
		await bot.api.is_admin(message.author.id, message.guild); // throws
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
		const deleted = await deleteArea_1(message.guild, owner_id);
		await bot.api.emb(
			"Erfolgreich gelöscht",
			`${deleted} Channel wurden erfolgreich gelöscht.`,
			message.channel
		);
	} catch (error) {
		await bot.api.emb(
			"Nicht gefunden",
			"Konnte keine Category-Channel in der Datenbank finden, die dir gehören.",
			message.channel
		);
		return;
	}
}

async function handleInvite(message, res) {
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
		await bot.api.emb(
			"Berechtigungsfehler",
			"Du bist nicht der Owner des Channels."
		);
		return;
	}

	const remove = res.params["-remove"][0];
	let guildMember;
	try {
		// user_str can start with <@ or <@!, so we should use a regex here
		const user_str = res.params["-name"][0].replace( /^\D+/g, "").slice(0, -1);
		guildMember = await message.guild.members.fetch(user_str);
	} catch (error) {
		// add error logging
		await bot.api.emb("Falscher User", "Der User ist mir nicht bekannt.");
		return;
	}

	if (
		bot.api.lookup_index(databases[0].name, index, "manage_type") ==
        "role"
	) {
		category.permissionOverwrites.each(async (r) => {
			if (r.type == "role" && r.id != message.guild.roles.everyone.id) {
				if (
					remove == "false" &&
                    guildMember.roles.cache.has(r.id) == false
				) {
					guildMember.roles.add(r.id);
					await bot.api.emb(
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
					await bot.api.emb(
						"Erfolgreich",
						`${guildMember.toString()} ist jetzt per Rolle ausgeladen.`,
						message.channel
					);
					return;
				} else {
					await bot.api.emb(
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
			await bot.api.emb(
				"Erfolgreich",
				`${guildMember.toString()} ist jetzt per userID eingeladen.`,
				message.channel
			);
			return;
		} else if (remove == "true") {
			/* theoretically we could re-set all permissions to hide blacklisted users*/
			category.updateOverwrite(guildMember, { VIEW_CHANNEL: false });
			await bot.api.emb(
				"Erfolgreich",
				`${guildMember.toString()} ist jetzt per userID ausgeladen.`,
				message.channel
			);
			return;
		}
	}
}

async function handleDelete(message, res) {
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
			await bot.api.emb(
				"Kann nicht gelöscht werden",
				"Der angegebene Channel gehört zu einer Kategorie und kann somit nicht mit diesem Command gelöscht werden.",
				message.channel
			);
			return;
		}
		bot.api.database_row_delete(databases[0].name, i[0]);
		channel.delete();
		await bot.api.emb(
			"Erfolg!",
			"Channel erfolgreich gelöscht.",
			message.channel
		);
	} catch (error) {
		await bot.api.emb(
			"Lösch Fehler",
			`Beim löschen des Channels mit der ID ${chID} ist ein Fehler aufgetreten. Prüfe bitte auch die Permissions. Error: ${error.message}`,
			message.channel
		);
	}
}
async function handleConfig(message, res) {
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
	await bot.api.emb(
		"Konfiguration",
		bot.api.config_toStr(attributes, message.guild.id),
		message.channel
	);
}

async function onMessage(message) {
	try {
		await log_message_in_user_channels(message);

		const res = bot.api.parse_message(message, attributes);
		if (res == false) return;

		switch (res.name) {
		case "create": {
			await handleCreate(message, res);
			break;
		}
		case "create_area": {
			await handleCreateArea(message, res);
			break;
		}
		case "delete_area": {
			await handleDeleteArea(message, res);
			break;
		}
		case "invite": {
			await handleInvite(message, res);
			break;
		}
		case "delete": {
			await handleDelete(message, res);
			break;
		}
		case "config": {
			await handleConfig(message, res);
			break;
		}
		}
	} catch (error) {
		bot.api.hErr(error, message.channel);
	}
}

async function deleteArea_1(guild, ownerID) {
	LOGGER.info(`Versuche alle channel von ${ownerID} auf Guild ${guild.id}:${guild.name} zu löschen.`);
	const del_channels = [];
	try{
		const indices = bot.api.lookup_key_value(
			databases[0].name,
			"ownerID",
			ownerID
		);
		for(const index of indices) {
			try{
				const is_part_of_category = bot.api.lookup_index(databases[0].name, index, "is_part_of_category");
				if(is_part_of_category == false) continue;
				const guild_ID = bot.api.lookup_index(databases[0].name, index, "guildID");
				if(guild_ID != guild.id) continue;
				const owner_ID = bot.api.lookup_index(databases[0].name, index, "ownerID");
				if(owner_ID != ownerID) continue;
				const channel_ID = bot.api.lookup_index(databases[0].name, index, "channelID");
				const channel = await guild.channels.cache.get(channel_ID);
				if(!channel || channel.deleted == true) continue;
				if(channel.deletable == false) {
					LOGGER.info(`Darf channel ${channel.id}:${channel.name} auf Guild ${guild.id}:${guild.name} nicht löschen.`);
				}
				const manage_type = bot.api.lookup_index(databases[0].name, index, "manage_type");

				if(manage_type == "role") {
					try{
						await channel.permissionOverwrites.find(
							(role, role_ID) => role.type == "role" && role_ID != guild.roles.everyone.id
						).delete();
					}catch(error) {
						LOGGER.info(`Konnte die Rolle vom channel ${channel_ID}:${channel.name} nicht löschen.`);
					}
				}
				try{
					await channel.delete();
				}catch(error) {
					LOGGER.info(`Konnte den channel ${channel_ID}:${channel.name} nicht löschen.`);
				}
				del_channels.push(channel_ID);
			}catch (error) {
				LOGGER.info(`Fehler beim Löschen von channels von ${ownerID} auf Guild ${guild.id}:${guild.name}:`);
				LOGGER.info(error);
			}
		}

	}catch (error) {
		LOGGER.info(`Konnte keinen Datenbank Eintrag zu ${ownerID} finden. Oder ein anderer Fehler ist aufgetreten`);
		LOGGER.info(error);
	}

	for(const channel_ID of del_channels) {
		try{
			const index = bot.api.lookup_key_value(
				databases[0].name,
				"channelID",
				channel_ID,
			)[0];
			bot.api.database_row_delete(databases[0].name, index);
		}catch(error){
			LOGGER.info(`Fehler beim Auffinden von ${channel_ID} in der Datenbank.`);
			LOGGER.info(error);
		}
	}
	LOGGER.info(`${del_channels.length} channel wurden von ${ownerID} gelöscht.`);
	return del_channels.length;
}

// async function deleteArea(guild, owner_id) { //TODO: rework
// 	const data = [];
// 	let child_ch_nr = 0;
// 	for (const ind of bot.api.lookup_key_value(
// 		databases[0].name,
// 		"ownerID",
// 		owner_id
// 	)) {
// 		const c = [];
// 		let skip = false;
// 		for (const key of databases[0].keys) {
// 			const value = bot.api.lookup_index(databases[0].name, ind, key);
// 			if (key == "is_part_of_category" && value == false) {
// 				skip = true;
// 				break;
// 			}
// 			if (key == "is_category_parent" && value == false) {
// 				child_ch_nr++;
// 			}
// 			c.push(value);
// 		}
// 		if (skip == true) continue;
// 		data.push(c);
// 	}

// 	let i = 0;
// 	let deleted = 0;
// 	while (data.length > 0) {
// 		i = i >= data.length ? 0 : i;
// 		const is_parent = data[i][3];
// 		if (child_ch_nr > 0 && is_parent == true) {
// 			i++;
// 			continue;
// 		}
// 		const channel = await guild.channels.cache.get(data[i][0]);
// 		if (!channel || channel.deleted == true) {
// 			i++;
// 			continue;
// 		}
// 		const manage_type = data[i][4];
// 		if (manage_type == "role") {
// 			let role_id;
// 			channel.permissionOverwrites.each((r) => {
// 				if (r.type == "role" && r.id != guild.roles.everyone.id) role_id = r.id;
// 			});
// 			guild.roles
// 				.fetch(role_id)
// 				.then((role) => role.delete())
// 				.catch((w) => undefined);
// 			//message.member.roles.remove(role_id).catch((w) => undefined); // TODO the role is deleted, why whould we remove it still???
// 		} else if (manage_type == "userID") {
// 			//i think nothing needs to be implemented here
// 		} else {
// 			log.info(
// 				"Datenbank fehler.\n Der manage_type war weder role noch userID"
// 			);
// 		}
// 		/*get the row of this channel in the database */
// 		const row = bot.api.lookup_key_value(
// 			databases[0].name,
// 			"channelID",
// 			channel.id
// 		);
// 		bot.api.database_row_delete(databases[0].name, row);
// 		await channel.delete().catch((e) => undefined);
// 		data.splice(i, 1);
// 		if (is_parent == false) {
// 			child_ch_nr--;
// 		}
// 		deleted++;
// 		i++;
// 	}
// 	return deleted;
// }

async function log_message_in_user_channels(message) {
	try {
		const logging_channel_id = bot.api.config_get(
			attributes,
			message.guild.id,
			"category_logging_channel"
		)?.[0];
		const channel = await message.guild.channels.cache.get(logging_channel_id);
		if (!channel) {
			LOGGER.info("DEBUG: logging Channel in chmgr ist null");
			return; // intuition, maybe redundant
		}

		// check, if the message came from a dedicated area channel
		try {
			const indices = bot.api.lookup_key_value(
				databases[0].name,
				"channelID",
				message.channel.id
			);
			if (indices.length != 1) return; // intuition, maybe redundant
			const is_part_of_category = bot.api.lookup_index(
				databases[0].name,
				indices[0],
				"is_part_of_category"
			);
			const owner_id = bot.api.lookup_index(
				databases[0].name,
				indices[0],
				"ownerID"
			);
			const message_channel = await message.channel.fetch(true);
			const category = message_channel.parent;

			if (is_part_of_category && is_part_of_category == true) {
				await bot.api.emb(
					`Channel: ${message_channel.name}, Kategorie: ${
						category.name
					}, Besitzer: ${await bot.api.get_nickname(owner_id, message.guild)}`,
					`Nachricht von: ${await bot.api.get_nickname(
						message.author.id,
						message.guild
					)}\n${message.cleanContent}`,
					channel
				); // cleanContent gets the message without mentions
			}
		} catch (e) {
			// find error. doesn't matter at all
		}
	} catch (e) {
		LOGGER.info(e);
		//suppress any error here!!
	}
}

module.exports = {
	hooks: {
		message: onMessage,
	},
	initialize,
	attributes,
};
