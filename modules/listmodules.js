const discord		= require('discord.js');
const { prefix }	= require('../config.json');
const attributes	= {modulename : 'listmodules'};


function help(channel){
	channel.send("Listet alle Module auf!");
}

function onMessage(message) {
    if (message.content[0] != prefix) return;
    let split = message.content.substring(1).split(' ');
    if (split[0] != attributes.modulename) return;

    let text = "Alle Module:";
    for(mod of bot.modules){
    	if(mod.attributes.modulename){
    		text += "\n🡒 " + mod.attributes.modulename;
    	}
    }
    message.channel.send(text);
}

module.exports.hooks = {
    'message': onMessage
};
module.exports.help = help;
module.exports.attributes = attributes;