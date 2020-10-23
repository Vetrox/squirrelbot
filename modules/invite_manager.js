const discord		= require('discord.js');
const { prefix }	= require('../config.json');
const log			= require('../log.js');
const attributes	= {modulename : 'invite_manager', commands: ['create', 'delete', 'info_here', 'test']};

let log_channel;

function help(channel){
	channel.send('invite_manager');
}

function onMessage(message) {
	if (!message.content[0] || message.content[0] != prefix) return;
	let split = message.content.substring(1).split(' ');
	if (!split[0] || split[0] != attributes.modulename || !split[1]) return;

	switch (split[1]) {
		case attributes.commands[3]:
			bot.invites.then(result => console.log(result));
			break;
		case attributes.commands[2]:
			log_channel = message.channel;
			message.channel.send('Attached this channel to log invites to. :)');
			break;
		default:
			help(message.channel);
	}
}

function onGuildMemberAdd(member) {
	// To compare, we need to load the current invite list.
	member.guild.fetchInvites().then(async guildInvites => {
		// This is the *existing* invites for the guild.
		let ei;
		bot.invites.then(l => {
			ei = l[member.guild.id];
			console.log(l);
			console.log(member.guild.id);
		});
		await ei;
		// Look through the invites, find the one for which the uses went up.
		console.log(ei);

		const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);
		//const inviter = bot.client.users.fetch(invite.inviter.id); // (inviter doesn't have a tag property)
			// Get the log channel (change to your liking)
			// const logChannel = member.guild.channels.find(channel => channel.name === "join-logs");
		// Update the cached invites for the guild.
		bot.invites[member.guild.id] = guildInvites;
		// A real basic message with the information we need. 
		log.logMessage(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
		log_channel.send(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
	});

}

module.exports.hooks = {
	'message' : onMessage,
	'guildMemberAdd' : onGuildMemberAdd
};
module.exports.help = help;
module.exports.attributes = attributes;