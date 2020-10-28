const Discord = require("discord.js");
const log = require("../log.js");
const err = require("../errors.js");
const { prefix } = require("../config.json");
const attributes = {
	modulename: "reacted",
	commands: ["add", "show", "remove", "test"],
};
const databases = [
	{
		name: attributes.modulename,
		keys: [
			"messageID",
			"emoji_map",
			"required_roles",
			"required_equal",
			"new_msg_id",
			"guild_id",
			"channel_id",
		],
	},
];

//TODO: make it possible to create reacted in other channels...
//TODO: add required_lower and required_higher for explicity

function help(channel) {
	//TODO: add possibility to just give yourself the role, not take it anmore. and the poss. to only take it, but not give it.
	channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <messageID> <emoji> <role> [<emoji_1 <role_1> ...] [-required <role> [<role2> ...]]'
	messageID: Um die MessageID von einer Nachricht zu bekommen, musst du den Developer-Modus in Discord aktivieren
		und anschließend auf deine Nachricht klicken.
	Nach messageID kommen Paare von je einem Emoji und einer Rolle, welche miteinander verknüpft werden.
	-required: Optionaler parameter. Falls nur Bestimmte Rollen die Möglichkeit haben sollen, auf die Message zu reacten.
    -required_equal: Wenn dieser Parameter gesetzt ist, dürfen auch nur exakt die rollen, welche mit -required angegeben wurden auf die Message reacten
        Ansonsten können alle Personen, die auch eine höhere Rolle haben auf sie Reacten.
    Anmerkung: 
        - das @ vor Rollen kann weggelassen werden.
        - Den Befehl mehrmalig auf die selbe Nachricht auszuführen ist nicht möglich. Einfach eine neue Nachricht kreieren.
!reacted show <messageID>
	Zeigt die Informationen (Metadata) zu der Nachricht an.
	messageID: Die MessageID, welche in der Einbettung der bot-Nachricht angezeigt wird.
!reacted remove <messageID>
	Löscht die Rollenzuweisungsnachricht auch Serverseitig, was zur Vorbeugung von Problemen mit der Datenbank dient.
`);
}

let collectors = {}; //messageID : lambda(args) //TODO:add args

async function initialize() {
	//go through every saved message to react to and add reactioncollector to it.
	bot["api"].database_create_if_not_exists(
		databases[0].name,
		databases[0].keys
	);
	await bot["api"].database_for_each(attributes.modulename, setupCollector);
}

async function setupCollector(data) {
	const orig_msgID = data[0],
		emoji_map = data[1],
		required_roles = data[2],
		required_equal = data[3],
		new_msg_id = data[4],
		guild_id = data[5],
		channel_id = data[6];
	if (orig_msgID in collectors) return; //no doublicates allowed. //TODO: decide if it should throw an error.
	collectors[orig_msgID] = async (type, guild, user_id, emoji, message_id) => {
		try {
			//when we find more than one row containing this messageID, also throw an error
			if (
				bot["api"].lookup_key_value(
					attributes.modulename,
					"messageID",
					orig_msgID
				).length > 1
			)
				throw Error; //this error should be thrown somewhere else (here it is too late)

			if (message_id != new_msg_id) return; //then it isn't for us

			//check, if user has the required role
			const guildMember = await guild.members.fetch({
				user: user_id,
				cache: true,
				force: true,
			}); //we have to force the

			let role_check = false;
			for (let role_id of required_roles) {
				let required_role = await guild.roles.fetch(role_id); //throws an error, if role couldn't be found
				if (
					(required_equal == true &&
						guildMember.roles.cache.has(required_role.id)) ||
					(required_equal == false &&
						guildMember.roles.highest.comparePositionTo(required_role) >= 0)
				) {
					//required equal could be string.... //TODO: refactor into one if statement
					//taking required_role.id instead of role_id, because errors are thrown in case role_id is wrong
					//-1 = guildmember has lower role 0 == they are the same 1 = guildmember is higher
					role_check = true;
					break;
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
			const assigned_role = guild.roles.cache.get(assigned_role_id);

			//depending on setting add, remove, or toggle the role.
			/* TOGGLE */
			if (!guildMember.roles.cache.has(assigned_role.id)) {
				//TODO: check the valididty of this check
				if (type == "MESSAGE_REACTION_ADD") {
					guildMember.roles.add(
						assigned_role,
						"reason: the bot gave you the role"
					);
				}
			} else if (type == "MESSAGE_REACTION_REMOVE") {
				guildMember.roles.remove(
					assigned_role,
					"reason: the bot took the role from you"
				);
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
	const user_id = raw.d.user_id,
		message_id = raw.d.message_id,
		channel_id = raw.d.channel_id,
		guild_id = raw.d.guild_id,
		emoji = raw.d.emoji;
	const guild = bot["client"].guilds.cache.get(guild_id);
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
		case attributes.commands[0]:
			if (!split[2] || split.length < 5) help(message.channel);
			let messageID = split[2];
			try {
				let i = bot["api"].lookup_key_value(
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

			let assigns_list = [];
			let required_roles = [];
			let required_equal = false;
			for (let req = false, i = 3; i < split.length; i++) {
				if (split[i] === "-required_equal") {
					required_equal = true;
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
				console.log(`Emojistr: ${emoji}`);
				e_r_t += `${emoji} -> ${message.guild.roles.cache.get(
					emoji_map[emoji]
				)}\n`; //for custom guild emojis it is <:testemoji:770631980496322590>, which is pretty similar to the idientifier of emojis
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
			const embed = new Discord.MessageEmbed()
				.setColor("#0099ff")
				.setTitle("Rollenvergabe")
				.setURL("https://discord.js.org/")
				.setAuthor(
					message.author.username,
					"https://i.imgur.com/wSTFkRM.png",
					"https://discord.js.org"
				)
				.setDescription(msg.content /*TODO: think about cleanContent*/)
				.addField("Emoji->Rolle", e_r_t.trim())
				.setImage("https://i.imgur.com/wSTFkRM.png")
				.setTimestamp()
				.setFooter(
					`Original MessageID: ${messageID}`,
					"https://i.imgur.com/wSTFkRM.png"
				)
				.setThumbnail("https://i.imgur.com/4AiXzf8.jpeg");
			const ret_msg = await message.channel.send(embed);
			const new_msg_id = ret_msg.id;
			bot["api"].database_create_if_not_exists(
				databases[0].name,
				databases[0].keys
			);
			const data = [
				messageID,
				emoji_map,
				required_roles,
				required_equal,
				new_msg_id,
				message.guild.id,
				message.channel.id,
			];
			try {
				bot["api"].database_row_add(attributes.modulename, data);
				setupCollector(data);
				message.channel.send(
					`Nachricht in Datenbank gespeichert. Erwarte Reaktionen.`
				);
			} catch (error) {
				message.channel.send("Etwas ist schief gelaufen. Siehe im Log.");
				log.logMessage(error);
			}
			break;
		case attributes.commands[1]:
			//show metadata
			break;
		case attributes.commands[2]:
			//remove message
			break;
		case attributes.commands[3]:
			//test, if all dc emojis have id == null. . Done instanceof does it

			console.log(message.guild.roles.cache);
			break;
		default:
			help(message.channel);
			return;
	}
}

module.exports.hooks = {
	message: onMessage,
	raw: onRaw,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
