const discord       = require('discord.js');
const { prefix }    = require('../config.json');
const attributes = {modulename : 'reacted', commands : ['add', 'show']};


function help(channel){
    channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <messageID> <emoji> <role> [<emoji_1 <role_1> ...] [-required <role> [<role2> ...]]'
	messageID: Um die MessageID von einer Nachricht zu bekommen, musst du den Developer-Modus in Discord aktivieren
		und anschließend auf deine Nachricht klicken.
	Nach messageID kommen Paare von je einem Emoji und einer Rolle, welche miteinander verknüpft werden.
	-required: Optionaler parameter. Falls nur Bestimmte Rollen die Möglichkeit haben sollen, auf die Message zu reacten.
!reacted show <messageID>
	Zeigt die Informationen (Metadata) zu der Nachricht an.
	messageID: Die MessageID, welche in der Einbettung der bot-Nachricht angezeigt wird.
!reacted remove <messageID>
	Löscht die Rollenzuweisungsnachricht auch Serverseitig, was zur Vorbeugung von Problemen mit der Datenbank dient.
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
    /*
    	if(!split[2] || split.length < 5) help(message.channel);
    	let assigns_list = [];
    	let required_roles = [];
    	for(let req = false, i = 3; i < split.length; i++){
    		if(req == false && split[i] === '-required') req = true;
    		if(req == false) {
    			assigns_list.push(split[i]);
    		}else if(req == true){
    			required_roles.push(split[i]);
    		}else{
    			throw Error;
    		}
    	}
    	let role 
    	if(assigns_list.length % 2 != 0) throw Error;
    	for(let i = 0; i < split.length / 2; i+=2){

    	}
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
