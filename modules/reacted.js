const Discord = require("discord.js");
const log = require("../log.js");
const err = require("../errors.js");
const { prefix } = require("../config.json");
const attributes = {
	modulename: "reacted",
	commands: ["add", "remove", "test"],
};
const databases = [
	{
		name: attributes.modulename,
		keys: [
			"messageID",
			"emoji_map",
			"required_roles",
			"required_type", // 'lower'/'equal'/'higher'
			"new_msg_id",
			"guild_id",
			"channel_id",
		],
	},
];

//TODO: make it possible to create reacted in other channels...
//TODO: add 'not_equal' (blacklisting)

function help(channel) {
	//TODO: add possibility to just give yourself the role, not take it anmore. and the poss. to only take it, but not give it.
	channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <messageID> <emoji> <role> [<emoji_1 <role_1> ...] [-required <role> [<role2> ...]]'
	messageID: Um die MessageID von einer Nachricht zu bekommen, musst du den Developer-Modus in Discord aktivieren
		und anschließend auf deine Nachricht klicken.
		Die Nachricht muss sich im gleichen Channel befinden. Danach kannst du sie löschen.
	Nach messageID kommen Paare von je einem Emoji und einer Rolle, welche miteinander verknüpft werden.
	-required: Optionaler parameter. Falls nur Bestimmte Rollen die Möglichkeit haben sollen, auf die Message zu reacten.
    <-required_equal|-required_lower|-required_higher>: Wenn dieser Parameter gesetzt ist,
    	bekommen <nur die Personen mit den Rollen| alle (discordmäßig) darunter liegenden Personen mit den Rollen| alle darüber liegenden Personen mit den Rollen>,
    	welche mit -required angegeben wurden die angegebe Rolle. Dabei werden die angegeben Rollen immer mit eingeschlossen
    	und im falle lower und higher die höchste Rolle eines Users genommen. Equal checkt eins zu eins die Rollen ab.
    	Required_equal ist der Standardwert, falls keiner angegeben wurde.
    Anmerkung: 
        - das @ vor Rollen kann weggelassen werden.
        - Den Befehl mehrmalig auf die selbe Nachricht auszuführen ist nicht möglich. Einfach eine neue Nachricht kreieren.
!reacted remove <messageID>
	Löscht die Rollenzuweisungsnachricht auch Serverseitig, was zur Vorbeugung von Problemen mit der Datenbank dient.
`);
}

let collectors = {}; //messageID : lambda(args) //TODO:add args

async function initialize() {
	//go through every saved message to react to and add reactioncollector to it.
	bot.api.database_create_if_not_exists(databases[0].name, databases[0].keys);
	await bot.api.database_for_each(attributes.modulename, setupCollector);
}

async function setupCollector(data) {
	let orig_msgID = data[0],
		emoji_map = data[1],
		required_roles = data[2],
		required_type = data[3],
		new_msg_id = data[4],
		guild_id = data[5],
		channel_id = data[6];
	if (orig_msgID in collectors) return; //no doublicates allowed. //TODO: decide if it should throw an error.
	collectors[orig_msgID] = async (type, guild, user_id, emoji, message_id) => {
		try {
			//when we find more than one row containing this messageID, also throw an error
			if (
				bot.api.lookup_key_value(attributes.modulename, "messageID", orig_msgID)
					.length > 1
			)
				throw Error; //this error should be thrown somewhere else (here it is too late)

			if (message_id != new_msg_id) return; //then it isn't for us

			//check, if user has the required role
			let guildMember = await guild.members.fetch({
				user: user_id,
				cache: true,
				force: true,
			}); //we have to force the new request over the api. the cache may have the old user state

			if (guildMember.user.bot == true) return; //a bot cannot get the role this way
			let role_check = false;
			if (required_roles.length > 0) {
				for (let role_id of required_roles) {
					let required_role = await guild.roles.fetch(role_id); //throws an error, if role couldn't be found
					if (
						(required_type == "equal" &&
							guildMember.roles.cache.has(required_role.id)) ||
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
			if (required_roles.length > 0 && role_check === false) {
				//if there are required roles and the user has failed the check
				log.logMessage(`${guildMember} has not passed the test.`);
				return false;
			}
			let assigned_role_id;
			if (emoji.id != null) {
				//hopefully this check works.
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
			if (error instanceof err.BotError) {
				if (orig_msgID in collectors) {
					//should never be executed tho
					delete collectors[orig_msgID];
					log.logMessage("This code should be unreachable");
					return false;
				}
			} else {
				log.logMessage(error.name);
				log.logMessage(error.message);
				log.logMessage(error.toString());
				throw error;
			}
		}
	};
}

async function onRaw(raw) {
	if (raw.t != "MESSAGE_REACTION_ADD" && raw.t != "MESSAGE_REACTION_REMOVE")
		return;
	let user_id = raw.d.user_id,
		message_id = raw.d.message_id,
		channel_id = raw.d.channel_id,
		guild_id = raw.d.guild_id,
		emoji = raw.d.emoji;
	let guild = bot["client"].guilds.cache.get(guild_id);
	//const channel = guild.channels.cache.get(channel_id); //not needed
	//const message = await channel.messages.fetch(message_id); //not needed

	for (orig_msgID in collectors) {
		await collectors[orig_msgID](raw.t, guild, user_id, emoji, message_id); //emoji is again just the raw {name: unicode, if dc; id=null if dc.}
	}
}

async function onMessage(message) {
	if (message.content[0] != prefix) return;
	let split = message.content.substring(1).split(/\s+/); //TODO test regex hell here
	if (split[0] != attributes.modulename) return;

	switch (split[1]) {
		case attributes.commands[0]: {
			if (!split[2] || split.length < 5) help(message.channel);
			let messageID = split[2];
			try {
				let i = bot.api.lookup_key_value(
					attributes.modulename,
					"messageID",
					messageID
				);
				//if no error is thrown, eg. the message is in the database.
				message.channel.send(`Die Datenbank beinhaltet diese Nachricht schon.`);
				return;
			} catch (error) {
				if (!(error instanceof err.Find)) {
					throw error;
				}
			}

			let msg;
			try {
				msg = await message.channel.messages.fetch(messageID);
			} catch (error) {
				message.channel.send(
					`Konnte die Nachricht mit der id ${messageID} nicht finden.`
				);
				return; //ensures msg has a value;
			}

			let assigns_list = [];
			let required_roles = [];
			let required_type = "equal"; //equal by default.
			for (let req = false, i = 3; i < split.length; i++) {
				switch (split[i]) {
					case "-required_equal":
						required_type = "equal";
						continue;
					case "-required_lower":
						required_type = "lower";
						continue;
					case "-required_higher":
						required_type = "higher";
						continue;
				}
				if (req == false && split[i] === "-required") {
					req = true;
					continue;
				}
				if (req == false) assigns_list.push(split[i]);
				else
					required_roles.push(
						message.guild.roles.cache.find(
							(role) =>
								role.name.toLowerCase() == split[i].toLowerCase() ||
								role.name.toLowerCase() == "@" + split[i].toLowerCase()
						).id
					); //find roleid or throw error
			}
			if (assigns_list.length <= 0 || assigns_list.length % 2 != 0)
				throw new err.CommandParameter("Wrong number of assignments made");
			let emoji_map = {};
			for (let i = 0; i <= assigns_list.length - 2; i += 2) {
				emoji_map[assigns_list[i]] = message.guild.roles.cache.find(
					(role) =>
						role.name.toLowerCase() === assigns_list[i + 1].toLowerCase()
				).id;
			}
			// embed Message and send to channel.

			let e_r_t = "";
			for (emoji in emoji_map) {
				e_r_t += `${emoji} 🡒 ${message.guild.roles.cache.get(
					emoji_map[emoji]
				)}\n`;
			}

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
				/*case 'not_equal':
					req_roles_text_head += 'Ausgeschlossene Rollen';
					req_roles_text += 'Du darfst keine dieser Rollen besitzen, um abstimmen zu können:\n';
					break;*/
			}
			for (role of required_roles) {
				req_roles_text += `• ${message.guild.roles.cache.get(role)}\n`;
			}
			let embed = new Discord.MessageEmbed()
				.setColor("#ff9900")
				.setTitle("Rollenvergabe")
				.setAuthor(
					msg.author.username,
					msg.author.displayAvatarURL({ size: 256 })
				)
				.setDescription(msg.content) //other option: cleanContent
				.addField("Emoji 🡒 Rolle", e_r_t.trim())
				.addField(req_roles_text_head.trim(), req_roles_text.trim())
				.setTimestamp()
				.setFooter(
					`Original MessageID: ${messageID}`,
					bot["client"].user.displayAvatarURL({ size: 32 })
				);
			let ret_msg = await message.channel.send(embed);

			/*react to the message with the emoji*/
			for (emoji in emoji_map) {
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
				bot.api.database_row_add(attributes.modulename, data);
				setupCollector(data);
				message.channel.send(
					`Nachricht in Datenbank gespeichert. Erwarte Reaktionen.`
				);
			} catch (error) {
				message.channel.send("Etwas ist schief gelaufen. Siehe im Log.");
				log.logMessage(error);
			}
			break;
		}
		case attributes.commands[1]: {
			//remove message
			if (!split[2]) help(message.channel);
			let messageID = split[2];
			try {
				let i = bot.api.lookup_key_value(
					attributes.modulename,
					databases[0].keys[0],
					messageID
				);

				if (i.length > 1) throw new Error();

				let new_msg_id = bot.api.lookup_index(
					attributes.modulename,
					i[0],
					databases[0].keys[4]
				);
				message.channel.messages.fetch(new_msg_id).then((msg) => msg.delete());
				bot.api.database_row_delete(attributes.modulename, i[0]);
				message.channel.send(
					"Nachricht erfolgreich aus der Datenbank gelöscht."
				);
			} catch (error) {
				if (error instanceof err.Find) {
					message.channel.send(
						"Konnte die Nachricht in der Datenbank nicht finden"
					);
				} else {
					throw error;
				}
			}
			break;
		}
		case attributes.commands[2]: {
			//test

			console.log(message.guild.roles.cache);
			break;
		}
		default: {
			help(message.channel);
			return;
		}
	}
}

module.exports.hooks = {
	message: onMessage,
	raw: onRaw,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
