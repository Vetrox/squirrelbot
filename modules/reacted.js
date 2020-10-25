const discord       = require('discord.js');
const { prefix }    = require('../config.json');
const attributes = {modulename : 'reacted', commands : ['add', 'remove']};


function help(channel){
    channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted work_here
	Beobachtet alle Nachrichten in dem channel. Wenn auf eine Nachricht reagiert wurde, weist der Bot der Person die Rolle zu,
		welche ihr mit !reacted assign zugewiesen wurde.
!reacted assign <emoji> <role>'
	Weist dem emoji die beschriebene Rolle zu.
	- Wenn die Methode ohne parameter aufgerufen wird zeigt sie alle Zuweisungen an
	`);
}

function initialize(){
    
}

async function onMessage(message) {
    if (message.content[0] != prefix) return;
    let split = message.content.substring(1).split(' ');
    if (split[0] != attributes.modulename) return;

    switch(split[1]){
    case attributes.commands[0]:
		//listen in this channel.
		/*let ch_id = message.channel.id.toString(); 
		bot['api'].database_create_if_not_exists(attributes.modulename + '_listening', ['guild_id', 'channel_id']); //lässt nur einen channel der Rollenvergabe zu.
    	let bot['api'].lookup_key(attributes.modulename + '_listening', 'guild_id', message.guild.id.toString());
    	let index = 
        */
        break;
    case attributes.commands[1]:
        //remove message
        break;
    default:
        help(message.channel);
        return;
    }
}

module.exports.hooks = {
    'message': onMessage
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;
