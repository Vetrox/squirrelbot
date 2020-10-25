const discord		= require('discord.js');
const { prefix }	= require('../config.json');
const log			= require('../log.js');
const attributes	= {modulename : 'invite_manager', commands: ['create_invite', 'log_here', 'stop_logging_here', 'on_join_give_role']};

const wait = require('util').promisify(setTimeout); //doesn't block the execution
let invites = {};


function help(channel){
	channel.send('invite_manager');
}

async function initialize(){
	await wait(1000); //we need to wait for about a second+, just to make sure the 'fetchInvites' function does actually return a value. Why? IDK!!!'
	log.logMessage('Fetching invites...');

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
			bot['api'].database_create_if_not_exists(attributes.modulename, ['guild_id', 'log_channel_id']);
			let i_ = bot['api'].lookup_key(attributes.modulename, 'guild_id', message.guild.id.toString());
			if(typeof i_ == 'string') { //when key not in index
				bot['api'].database_row_add(attributes.modulename, [message.guild.id.toString(), message.channel.id.toString()]);
			} else {
				bot['api'].database_row_change(attributes.modulename, i_, 'log_channel_id', message.channel.id.toString());
			}
			message.channel.send('Attached this channel to log invites to. :)');
			break;
		case attributes.commands[2]:
			bot['api'].database_create_if_not_exists(attributes.modulename, ['guild_id', 'log_channel_id']);
			bot['api'].database_row_delete(attributes.modulename, bot['api'].lookup_key(attributes.modulename, 'guild_id', message.guild.id.toString())?.[0]);
			message.channel.send('Detatched this channel from logging here.');
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

		log.logMessage(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
		bot['api'].database_create_if_not_exists(attributes.modulename, ['guild_id', 'log_channel_id']);
		let i_ = bot['api'].lookup_key(attributes.modulename, 'guild_id', member.guild.id.toString()); //-> should be unique. if not, we have a conflict
		if(typeof i_ === 'string'){
			log.logMessage('No logging channel specified for guild ' + member.guild.id);
			return;
		}
		let ir = i_[0];
		let ied= bot['api'].lookup_index(attributes.modulename, ir, 'log_channel_id');
		if(!ied.startsWith('error')){
			member.client.channels.fetch(ied).then(log_channel => {
				log_channel.send(`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`);
			});
		}
	});

}

module.exports.hooks = {
	'message' : onMessage,
	'guildMemberAdd' : onGuildMemberAdd
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;