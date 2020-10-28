const discord = require("discord.js");
const { prefix } = require("../config.json");
const log = require("../log.js");
const err = require("../errors.js");
const attributes = {
	modulename: "invite_manager",
	commands: [
		"create_invite",
		"log_here",
		"stop_logging_here",
		"on_join_give_role",
	],
};

const wait = require("util").promisify(setTimeout); //doesn't block the execution
let invites = {};

function help(channel) {
	channel.send("invite_manager");
}

async function initialize() {
	await wait(1000); //we need to wait for about a second+, just to make sure the 'fetchInvites' function does actually return a value. Why? IDK!!!'
	log.logMessage("Fetching invites...");

	bot["client"].guilds.cache.each((guild) => {
		//let guild = bot['client'].guilds.cache[key];
		guild.fetchInvites().then(
			(guildInvites) => {
				invites[guild.id] = guildInvites;
			},
			(reason) => {
				log.logMessage(
					"Guild: " +
						guild.id +
						" doesn't provide the required permissions to fetch invites..."
				);
			}
		);
	});
	await wait(1000);
}

function onMessage(message) {
	if (message.content[0] != prefix) return;
	let split = message.content.substring(1).split(/\s+/);
	if (!split[0] || split[0] != attributes.modulename || !split[1]) return;

	switch (split[1]) {
		case attributes.commands[1]:
			try {
				bot["api"].database_create_if_not_exists(attributes.modulename, [
					"guild_id",
					"log_channel_id",
				]);
				try {
					let i = bot["api"].lookup_key_value(
						attributes.modulename,
						"guild_id",
						message.guild.id.toString()
					)[0];
					bot["api"].database_row_change(
						attributes.modulename,
						i,
						"log_channel_id",
						message.channel.id.toString()
					);
				} catch (error) {
					//either key not in keys, or [LIKELY] value not in index
					if (error instanceof err.Find)
						bot["api"].database_row_add(attributes.modulename, [
							message.guild.id.toString(),
							message.channel.id.toString(),
						]);
					else throw error;
				}
				message.channel.send("Attached this channel to log invites to. :)");
			} catch (error) {
				throw error;
			}
			break;
		case attributes.commands[2]: //TODO: test
			try {
				bot["api"].database_create_if_not_exists(attributes.modulename, [
					"guild_id",
					"log_channel_id",
				]);
				bot["api"].database_row_delete(
					attributes.modulename,
					bot["api"].lookup_key_value(
						attributes.modulename,
						"guild_id",
						message.guild.id.toString()
					)[0]
				);
				message.channel.send("Detatched this channel from logging here.");
			} catch (error) {
				throw error;
			}
			break;
		default:
			help(message.channel);
	}
}

function onGuildMemberAdd(member) {
	// To compare, we need to load the current invite list.
	member.guild.fetchInvites().then(async (guildInvites) => {
		// This is the *existing* invites for the guild.
		let ei = invites[member.guild.id];
		// Look through the invites, find the one for which the uses went up.
		const invite = guildInvites.find((i) => ei.get(i.code).uses < i.uses);
		// Get the log channel (change to your liking)
		// const logChannel = member.guild.channels.find(channel => channel.name === "join-logs");
		// Update the cached invites for the guild.
		invites[member.guild.id] = guildInvites;

		log.logMessage(
			`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
		);
		try {
			bot["api"].database_create_if_not_exists(attributes.modulename, [
				"guild_id",
				"log_channel_id",
			]);
			let i = bot["api"].lookup_key_value(
				attributes.modulename,
				"guild_id",
				member.guild.id.toString()
			)[0]; //-> should be unique. if not, we have a conflict
			let ch_id = bot["api"].lookup_index(
				attributes.modulename,
				i,
				"log_channel_id"
			);
			member.client.channels.fetch(ch_id).then((log_channel) => {
				log_channel.send(
					`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
				);
			});
		} catch (error) {
			if (error instanceof err.Find) {
				log.logMessage(
					"No logging channel specified for guild " + member.guild.id
				);
			} else {
				throw error;
			}
		}
	});
}

module.exports.hooks = {
	message: onMessage,
	guildMemberAdd: onGuildMemberAdd,
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
