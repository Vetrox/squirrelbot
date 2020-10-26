const Discord       = require('discord.js');
const log           = require('../log.js');
const err           = require('../errors.js');
const { prefix }    = require('../config.json');
const attributes    = {modulename : 'reacted', commands : ['add', 'show']};


function help(channel){
    channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <messageID> <emoji> <role> [<emoji_1 <role_1> ...] [-required <role> [<role2> ...]]'
	messageID: Um die MessageID von einer Nachricht zu bekommen, musst du den Developer-Modus in Discord aktivieren
		und anschließend auf deine Nachricht klicken.
	Nach messageID kommen Paare von je einem Emoji und einer Rolle, welche miteinander verknüpft werden.
	-required: Optionaler parameter. Falls nur Bestimmte Rollen die Möglichkeit haben sollen, auf die Message zu reacten.
    Anmerkung: Den befehl mehrmalig auf die selbe Nachricht auszuführen ist nicht möglich. Einfach eine neue Nachricht kreieren.
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
    let split = message.content.substring(1).split(/\s+/); //TODO test regex hell here
    console.log(split);
    if (split[0] != attributes.modulename) return;

    switch(split[1]){
    case attributes.commands[0]:
    	if(!split[2] || split.length < 5) help(message.channel);
        let messageID = split[2];
    	let assigns_list = [];
    	let required_roles = [];
    	for(let req = false, i = 3; i < split.length; i++){
    		if(req == false && split[i] === '-required') {
                req = true;
                continue;
            }
    		if(req == false) {
    			assigns_list.push(split[i]);
    		}else if(req == true){
    			required_roles.push(split[i]);
    		}else{
    			throw Error;
    		}
    	}
    	let emoji_map = {};
    	if(assigns_list.length % 2 != 0) throw Error;
    	for(let i = 0; i <= assigns_list.length - 2; i+=2){
            emoji_map[assigns_list[i]] = assigns_list[i+1];
    	}
        try{
            bot['api'].database_create_if_not_exists(attributes.modulename, ['messageID', 'emoji_map', 'required_roles']);
            try{
                bot['api'].lookup_key_value(attributes.modulename, 'messageID', messageID);
                //die vorige zeile throwt einen error, bevor dies ausgeführt wird
                message.channel.send(`Die Datenbank beinhaltet diese Nachricht schon: ${i.length}`); 
            }catch (error) {
                if(error instanceof err.Find){
                    bot['api'].database_row_add(attributes.modulename, [messageID, emoji_map, required_roles]);
                    message.channel.send(`Nachricht in Datenbank gespeichert.`);
                }else{
                    throw error;
                }
            }

            // embed Message and send to channel.
            let msg = await message.channel.messages.fetch(messageID);
            let e_r_t = '';
            for(emoji in emoji_map) {
                e_r_t += `${emoji} -> ${emoji_map[emoji]}\n`;
            }
            const embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Rollenvergabe')
                .setURL('https://discord.js.org/')
                .setAuthor(message.author.username, 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
                .setDescription(msg.content /*TODO: think about cleanContent*/)
                .addField('Emoji->Rolle', e_r_t.trim())
                .setImage('https://i.imgur.com/wSTFkRM.png')
                .setTimestamp()
                .setFooter(`Original MessageID: ${messageID}`, 'https://i.imgur.com/wSTFkRM.png')
                .setThumbnail('https://i.imgur.com/4AiXzf8.jpeg');

           

                /*.addFields(
                    { name: 'Regular field title', value: 'Some value here' },
                    { name: '\u200B', value: '\u200B' },
                    /*{ name: 'Inline field title', value: 'Some value here', inline: true },
                    { name: 'Inline field title', value: 'Some value here', inline: true },
                )*/ //TODO: emoji role mappings as fields
                //.addField('Inline field title', 'Some value here', true)
                
            message.channel.send(embed);

            //implement logic for reactions
        }catch (error){
            message.channel.send('Etwas ist schief gelaufen! Bitte im log nachschauen.');
            log.logMessage(error.message);
            return;
        }
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
