const discord		= require('discord.js');
const { prefix }	= require('../config.json');
const attributes	= {modulename : 'help'};


function help(channel){
	channel.send(` --- Das ist die Hilfeseite vom Squirrelbot ---

🡒 Um für ein bestimmtes Modul eine Hilfeseite angezeigt zu bekommen, gib einfach !help <modulname> ein.
🡒 Um alle module aufgelistet zu bekommen, gib !listmodules ein.

----------------`)

}

function initialize(){
	
}

function onMessage(message) {
    if (message.content[0] != prefix) return;
    let split = message.content.substring(1).split(/\s+/);
    if (split[0] != attributes.modulename) return;

    for(mod of bot.modules){
    	if(mod.help){
	    	if(mod?.attributes?.modulename === split[1]){
	    		mod.help(message.channel);
	    		return;
	    	}
	    }else{
	    	message.channel.send("This module doesn't have a help page attached to it!");
	    	return;
	    }
    }
    help(message.channel);
}

module.exports.hooks = {
    'message': onMessage
};
module.exports.help = help;
module.exports.initialize = initialize;
module.exports.attributes = attributes;