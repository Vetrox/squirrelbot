const discord		= require('discord.js');
const { prefix }	= require('../config.json');
const log			= require('../log.js');
const attributes	= {modulename : 'invite_manager', commands: ['create_invite', 'log_here']};

const wait = require('util').promisify(setTimeout); //doesn't block the execution
let log_channel;
let invites = {};


function help(channel){
	channel.send('invite_manager');
}

async function initialize(){
	await wait(1000); //we need to wait for about a second+, just to make sure the 'fetchInvites' function does actually return a value. Why? IDK!!!'
	log.logMessage('Fetching invites...');
	//console.log(bot['client'].guilds.cache);
	/*for([id, g] of bot['client'].guilds.cache) {
		g.fetchInvites().then(guildInvites => {
			invites[g.id] = guildInvites;
		}, reason => {
			log.logMessage("Guild: " + g.id + " doesn't provide the required permissions...");
		});
	}*/

	//TODO: get guilds first
	bot['client'].guilds.cache.each(guild => {
		//let guild = bot['client'].guilds.cache[key];
		guild.fetchInvites().then(guildInvites => {
			invites[guild.id] = guildInvites;
		}, reason => {
			log.logMessage("Guild: " + guild.id + " doesn't provide the required permissions to fetch invites...");
		});
	});
	await wait(1000);
}

function onMessage(message) {
	if (message.content[0] != prefix) return;
	let split = message.content.substring(1).split(' ');
	if (!split[0] || split[0] != attributes.modulename || !split[1]) return;

	switch (split[1]) {
		case attributes.commands[1]:
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
		let ei = invites[member.guild.id];
		// Look through the invites, find the one for which the uses went up.
		const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);
			// Get the log channel (change to your liking)
			// const logChannel = member.guild.channels.find(channel => channel.name === "join-logs");
		// Update the cached invites for the guild.
		invites[member.guild.id] = guildInvites;
		// A real basic message with the information we need. 
		log.logMessage(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
		log_channel?.send(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
	});

}

module.exports.hooks = {
	'message' : onMessage,
	'guildMemberAdd' : onGuildMemberAdd
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;