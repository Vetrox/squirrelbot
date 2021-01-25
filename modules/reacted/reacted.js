const Discord = require("discord.js");
const { attributes } = require("./attributes.js");
const { databases } = require("./database.js");
const LOGGER = require.main.require("./log.js")("reacted");

let collectors = {}; //messageID : lambda(args)

async function initialize() {
	bot.api.databases.functions.database_create_if_not_exists(databases[0].name, databases[0].keys);
	await bot.api.databases.functions.database_for_each(attributes.modulename, setupCollector);
}

async function setupCollector(data) {
	let orig_msgID = data[0],
		emoji_map = data[1],
		required_roles = data[2],
		required_type = data[3],
		new_msg_id = data[4];
	if (orig_msgID in collectors) return; //no duplicates allowed. //TODO: decide if it should throw an error.
	collectors[orig_msgID] = async (type, guild, user_id, emoji, message_id) => {
		try {
			//when we find more than one row containing this messageID, also throw an error
			if (
				bot.api.databases.functions.lookup_key_value(attributes.modulename, "messageID", orig_msgID)
					.length > 1
			) {
				throw Error; //this error should be thrown somewhere else (here it is too late)
			}

			if (message_id != new_msg_id) { return; } //then it isn't for us

			//check if user has the required role
			let guildMember = await guild.members.fetch({
				user: user_id,
				cache: true,
				force: true,
			}); //we have to force the new request over the api. the cache may have the old user state

			// https://discord.js.org/#/docs/main/stable/class/User?scrollTo=bot
			if (guildMember.user.bot) { return; } //a bot cannot get the role this way
			let role_check = false;
			if (required_roles.length > 0) {
				for (let role_id of required_roles) {
					let required_role = await guild.roles.fetch(role_id); //throws an error, if role couldn't be found
					if (
						(required_type == "equal" &&
                            guildMember.roles.cache.has(required_role.id)) ||
                        (required_type == "not_equal" &&
                            !guildMember.roles.cache.has(required_role.id)) ||
                        (required_type == "higher" &&
                            guildMember.roles.highest.comparePositionTo(required_role) >=
                            0) ||
                        (required_type == "lower" &&
                            guildMember.roles.highest.comparePositionTo(required_role) <= 0)
					) {
						//-1 = guildmember has lower role 0 == they are the same 1 = guildmember is higher
						role_check = true;
						break;
					}
				}
			}
			if (required_roles.length > 0 && !role_check) {
				//if there are required roles and the user has failed the check
				LOGGER.warn(`${guildMember} has not passed the test.`);
				return false;
			}
			let assigned_role_id;
			if (emoji.id != null) {
				assigned_role_id = emoji_map["<:" + emoji.name + ":" + emoji.id + ">"];
			} else {
				assigned_role_id = emoji_map[emoji.name];
			}
			let assigned_role = guild.roles.cache.get(assigned_role_id);

			//depending on setting add, remove, or toggle the role.
			/* TOGGLE */
			if (!guildMember.roles.cache.has(assigned_role.id)) {
				if (type == "MESSAGE_REACTION_ADD") {
					guildMember.roles.add(assigned_role);
				}
			} else if (type == "MESSAGE_REACTION_REMOVE") {
				guildMember.roles.remove(assigned_role);
			}
		} catch (error) {
			//delete collector
			if (error instanceof bot.api.errors.BotError) {
				if (orig_msgID in collectors) {
					//TODO When the code should never be executed? Why it exists?
					//should never be executed tho
					delete collectors[orig_msgID];
					LOGGER.error("Dieser Code sollte unerreichbar sein?!?!");
					return false;
				}
			} else {
				LOGGER.error(error.stack);
				throw error;
			}
		}
	};
}

async function onRaw(raw) {
	try {
		if (raw.t !== "MESSAGE_REACTION_ADD" && raw.t !== "MESSAGE_REACTION_REMOVE")
			return;

		let user_id = raw.d.user_id,
			message_id = raw.d.message_id,
			guild_id = raw.d.guild_id,
			emoji = raw.d.emoji;
		let guild = bot["client"].guilds.cache.get(guild_id);

		for (let orig_msgID in collectors) {
			await collectors[orig_msgID](raw.t, guild, user_id, emoji, message_id);
		}
	} catch (error) {
		LOGGER.error(error.stack);
	}
}

async function handleAdd(message, res) {
	await bot.api.utility.users.functions.has_permission(
		message.author.id,
		message.guild,
		"MANAGE_ROLES"
	);
	let messageID = res.params["-messageID"][0];
	try {
		bot.api.databases.functions.lookup_key_value(
			attributes.modulename,
			"messageID",
			messageID
		);
		//if no error is thrown -> the message is in the database.
		await bot.api.utility.embeds.functions.emb(
			"Fehler",
			"Die Datenbank beinhaltet diese Nachricht schon.",
			message.channel
		);
		return;
		//TODO solve this line
		// eslint-disable-next-line no-empty
	} catch (error) {

	}

	let msg;
	try {
		msg = await message.channel.messages.fetch(messageID);
	} catch (error) {
		await bot.api.utility.embeds.functions.emb(
			"Fehler",
			`Konnte die Nachricht mit der id ${messageID} nicht finden.`,
			message.channel
		);
		return; //ensures msg has a value;
	}

	let assigns_list = res.params["-map"];
	let required_roles = [];
	for (let i in res.params["-wl"]) {
		let rl = res.params["-wl"][i];
		try {
			let rl_id = message.guild.roles.cache.get(rl)?.id; //try getting it by id in case it has whitespaces.
			if (!rl_id) {
				rl_id = message.guild.roles.cache.find(
					(role) =>
						role.name.toLowerCase() == rl.toLowerCase() ||
                  role.name.toLowerCase() == "@" + rl.toLowerCase()
				)?.id;
			}
			if (!rl_id) {
				throw new Error();
			}
			required_roles.push(rl_id);
		} catch (error) {
			await bot.api.utility.embeds.functions.emb(
				"Fehler",
				"Konnte die Rolle " + rl + " nicht finden.",
				message.channel
			);
			return;
		}
	}
	let required_type = res.params["-wl_mode"]?.[0];
	if (
		required_type != "equal" &&
          required_type != "not_equal" &&
          required_type != "lower" &&
          required_type != "higher"
	)
		throw new bot.api.errors.BotError(`Falscher wl_mode. ${required_type}`);

	let guildMember = await message.guild.members.fetch({
		user: message.author.id,
		cache: true,
		force: true,
	});
	let emoji_map = {};
	for (let i = 0; i <= assigns_list.length - 2; i += 2) {
		try {
			let cached_role = message.guild.roles.cache.get(
				assigns_list[i + 1]
			);
			if (!cached_role || !cached_role?.id) {
				cached_role = message.guild.roles.cache.find(
					(role) =>
						role.name.toLowerCase() ==
                    assigns_list[i + 1].toLowerCase() ||
                    role.name.toLowerCase() ==
                    "@" + assigns_list[i + 1].toLowerCase()
				);
			}
			if (!cached_role || !cached_role?.id) throw new Error();

			if (guildMember.roles.highest.comparePositionTo(cached_role) <= 0) {
				await bot.api.utility.embeds.functions.emb(
					"Fehler",
					"Du hast eine zu niedrige Rolle. Wende dich an einen Admin.",
					message.channel
				);
				return;
			}
			emoji_map[assigns_list[i]] = cached_role.id;
		} catch (error) {
			await bot.api.utility.embeds.functions.emb(
				"Fehler",
				"Konnte die Rolle " + assigns_list[i + 1] + " nicht finden.",
				message.channel
			);
			return;
		}
	}
	let e_r_t = "";
	for (let emoji in emoji_map) {
		e_r_t += `${emoji} 🡒 ${message.guild.roles.cache.get(
			emoji_map[emoji]
		)}\n`;
	}
	let embed = new Discord.MessageEmbed()
		.setColor("#99ff00")
		.setTitle("Rollenvergabe")
		.setAuthor(
			msg.author.username,
			msg.author.displayAvatarURL({ size: 256 })
		)
		.setDescription(msg.content)
		.addField("Emoji 🡒 Rolle", e_r_t.trim())
		.setTimestamp()
		.setFooter(
			`Originale MessageID: ${messageID}`,
			bot["client"].user.displayAvatarURL({ size: 32 })
		);
	if (required_roles.length > 0) {
		let req_roles_text_head = "";
		let req_roles_text = "";
		switch (required_type) {
		case "equal":
			req_roles_text_head += "Benötigte Rollen";
			req_roles_text +=
                "Du brauchst mindestens eine dieser Rollen, um abstimmen zu können:\n";
			break;
		case "higher":
			req_roles_text_head += "Mindest-Voraussetzung Rollen";
			req_roles_text +=
                "Deine höchste Rolle muss mindestens eine dieser Rollen (oder eine höhere) sein, um abstimmen zu können:\n";
			break;
		case "lower":
			req_roles_text_head += "Höchst-Voraussetzung Rollen";
			req_roles_text +=
                "Deine höchste Rolle muss mindestens eine dieser Rollen sein (oder darunter liegen) um abstimmen zu können:\n";
			break;
		case "not_equal":
			req_roles_text_head += "Ausgeschlossene Rollen";
			req_roles_text +=
                "Du darfst keine dieser Rollen besitzen, um abstimmen zu können:\n";
			break;
		}
		for (let role of required_roles) {
			req_roles_text += `• ${message.guild.roles.cache.get(role)}\n`;
		}
		embed.addField(req_roles_text_head.trim(), req_roles_text.trim());
	}

	let ret_msg = await message.channel.send(embed);

	/*react to the message with the emoji*/
	for (let emoji in emoji_map) {
		ret_msg.react(emoji);
	}

	let data = [
		messageID,
		emoji_map,
		required_roles,
		required_type,
		ret_msg.id,
		message.guild.id,
		message.channel.id,
	];
	try {
		bot.api.databases.functions.database_row_add(attributes.modulename, data);
		setupCollector(data);
		await bot.api.utility.embeds.functions.emb(
			"Erfolgreich",
			"Nachricht in Datenbank gespeichert. Erwarte Reaktionen.",
			message.channel
		);
	} catch (error) {
		await bot.api.utility.embeds.functions.emb(
			"Etwas ist schief gelaufen",
			error,
			message.channel
		);
	}
}

async function handleRemove(message, res) {
	//remove message
	let messageID = res.params["-messageID"][0];
	try {
		let i = bot.api.databases.functions.lookup_key_value(
			attributes.modulename,
			databases[0].keys[0],
			messageID
		);

		if (i.length > 1) throw new Error();

		//check the permission of this user. He has to have a higher role than all of the roles specified.
		let mapped = bot.api.databases.functions.lookup_index(
			attributes.modulename,
			i[0],
			databases[0].keys[1]
		);
		let guildMember = await message.guild.members.fetch({
			user: message.author.id,
			cache: true,
			force: true,
		});
		for (let emoji in mapped) {
			let cached_role = await message.guild.roles.fetch(mapped[emoji]);
			if (guildMember.roles.highest.comparePositionTo(cached_role) <= 0) {
				await bot.api.utility.embeds.functions.emb(
					"Fehler",
					"Du hast eine zu niedrige Rolle. Wende dich an einen Admin.",
					message.channel
				);
				return;
			}
		}

		let new_msg_id = bot.api.databases.functions.lookup_index(
			attributes.modulename,
			i[0],
			databases[0].keys[4]
		);
		message.channel.messages
			.fetch(new_msg_id)
			.then((msg) => msg.delete());
		bot.api.databases.functions.database_row_delete(attributes.modulename, i[0]);
		await bot.api.utility.embeds.functions.emb(
			"Erfolgreich",
			"Nachricht erfolgreich aus der Datenbank gelöscht.",
			message.channel
		);
	} catch (error) {
		if (error instanceof bot.api.errors.Find) {
			await bot.api.utility.embeds.functions.emb(
				"Fehler",
				"Konnte die Nachricht in der Datenbank nicht finden.",
				message.channel
			);
		} else {
			throw error;
		}
	}
}

async function onMessage(message) {
	try {
		let res = bot.api.commands.functions.parse_message(message, attributes);
		if (!res) {
			return;
		}

		switch (res.name) {
		case "add": {
			await handleAdd(message, res);
			break;
		}
		case "remove": {
			await handleRemove(message, res);
			break;
		}
		}
	} catch (error) {
		bot.api.functions.hErr(error, message.channel);
	}
}

module.exports = {
	hooks: {
		message: onMessage,
		raw: onRaw,
	},
	initialize,
	attributes,
};
