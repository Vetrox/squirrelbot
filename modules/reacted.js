const Discord       = require('discord.js');
const log           = require('../log.js');
const err           = require('../errors.js');
const { prefix }    = require('../config.json');
const attributes    = {modulename : 'reacted', commands : ['add', 'show', 'remove', 'test']};

function help(channel){ //TODO: add possibility to just give yourself the role, not take it anmore. and the poss. to only take it, but not give it.
    channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <messageID> <emoji> <role> [<emoji_1 <role_1> ...] [-required <role> [<role2> ...]]'
	messageID: Um die MessageID von einer Nachricht zu bekommen, musst du den Developer-Modus in Discord aktivieren
		und anschließend auf deine Nachricht klicken.
	Nach messageID kommen Paare von je einem Emoji und einer Rolle, welche miteinander verknüpft werden.
	-required: Optionaler parameter. Falls nur Bestimmte Rollen die Möglichkeit haben sollen, auf die Message zu reacten.
    -required_equal: Wenn dieser Parameter gesetzt ist, dürfen auch nur exakt die rollen, welche mit -required angegeben wurden auf die Message reacten
        Ansonsten können alle Personen, die auch eine höhere Rolle haben auf sie Reacten.
    Anmerkung: Den befehl mehrmalig auf die selbe Nachricht auszuführen ist nicht möglich. Einfach eine neue Nachricht kreieren.
!reacted show <messageID>
	Zeigt die Informationen (Metadata) zu der Nachricht an.
	messageID: Die MessageID, welche in der Einbettung der bot-Nachricht angezeigt wird.
!reacted remove <messageID>
	Löscht die Rollenzuweisungsnachricht auch Serverseitig, was zur Vorbeugung von Problemen mit der Datenbank dient.
`);
}

let collectors = {}; //messageID : collector

function initialize(){
    //go through every saved message to react to and add reactioncollector to it.

    bot['api'].database_create_if_not_exists(attributes.modulename, ['messageID', 'emoji_map', 'required_roles', 'required_equal']);
    bot['api'].database_for_each(attributes.modulename, async data => { 
        const msgID = data[0], emoji_map = data[1], required_roles = data[2], required_equal = data[3];
        const filter = (reaction, user) => {
            /* if there isn't any collector anymore for this message. (in theory this will never be true because the collector is stopped, if it doesnt exist) */
            if(!(msgID in collectors)) return false; 
            try{
                //when we find more than one row containing this messageID, also throw an error
                if(bot['api'].lookup_key_value(attributes.modulename, 'messageID', msgID).length > 1) throw Error;
                //check, if user has the required role
                const guildMember = await reaction.message.guild.members.fetch(user.id); 
                let role_check = false;
                for(let role_id of required_roles){
                    let required_role = await reaction.message.guild.roles.fetch(role_id); //TODO: check if id is a string or number, and what is needed //throws an error, if role couldn't be found
                    if(required_equal == true) { //required equal could be string.... //TODO: refactor into one if statement
                        if(guildMember.roles.highest.comparePositionTo(required_role) === 0) {//-1 = guildmember has lower role 0 == they are the same 1 = guildmember is higher
                            role_check = true;
                            break;
                        }
                    } else if(guildMember.roles.highest.comparePositionTo(required_role) >= 0) {
                        role_check = true;
                        break;
                    }
                }
                if(role_check === false) {
                    return false;
                }

                if(reaction.emoji instanceof Discord.GuildEmoji)
                    return '<' + reaction.emoji.identifier + '>' in emoji_map;
                else
                    return reaction.emoji.name in emoji_map;
            } catch (error) {
                //delete collector
                if(error instanceof err.BotError){ //then message is not in database anymore
                    if(msgID in collectors) {
                        collectors[msgID].stop();
                        delete collectors[msgID];
                        return false;
                    }   
                } else {
                    log.logMessage(error.name);
                    log.logMessage(error.message);
                    log.logMessage(error.toString());
                    throw error;
                }
            }
            return false; };


        const collector = message.createReactionCollector(filter);
        collector.on('collect', (reaction, user) => {
            //give the user the role
            const guildMember = await reaction.message.guild.members.fetch(user.id); 
            //get the assigned role of the reaction
            let assigned_role_id;
            if(reaction.emoji instanceof Discord.GuildEmoji) {
                assigned_role_id = emoji_map['<' + reaction.emoji.identifier + '>'];
            } else {
                assigned_role_id = emoji_map[reaction.emoji.name];
            }
            const assigned_role = await reaction.message.guild.roles.fetch(role_id);
            

            //depending on setting add, remove, or toggle the role.

            /* TOGGLE */

            console.log(`Rection: ${reaction.emoji.name} from ${user.tag}`)
        });
        collector.on('end', collected => console.log(`Collected ${collected.size} items`));

    });
    
    


}

/**
    referenced in the initialize method
**/
function reactionAdd(reaction, user){

}

async function onMessage(message) {
    if (message.content[0] != prefix) return;
    let split = message.content.substring(1).split(/\s+/); //TODO test regex hell here
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
    			required_roles.push(message.guild.roles.cache.find(role => role.name.toLowerCase() === split[i].toLowerCase()).id); //find roleid or throw error
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
                console.log(`Emojistr: ${emoji}`);
                e_r_t += `${emoji} -> ${emoji_map[emoji]}\n`; //for custom guild emojis it is <:testemoji:770631980496322590>, which is pretty similar to the idientifier of emojis
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
                
            message.channel.send(embed);

            //implement logic for reactions
        }catch (error){
            message.channel.send('Etwas ist schief gelaufen! Bitte im log nachschauen.');
            log.logMessage(error.message);
            return;
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

        /*const filter = (reaction, user) => true;
        const collector = message.createReactionCollector(filter, { time: 15000 });
        collector.on('collect', (reaction, user) => console.log(`Collected ${reaction.emoji.name} with the id ${reaction.emoji.id} and the identifier ${reaction.emoji.identifier} from ${user.tag}. Emoji is instanceof Discord.GuildEmoji? ${reaction.emoji instanceof Discord.GuildEmoji}`));
        collector.on('end', collected => console.log(`Collected ${collected.size} items`));*/
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
