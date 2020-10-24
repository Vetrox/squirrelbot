const discord       = require('discord.js');
const { prefix }    = require('../config.json');
const attributes = {modulename : 'reacted', commands : ['add', 'remove']};


function help(channel){
    channel.send(`Managed Nachrichten, mit denen ein User sich Rollen geben kann.
!reacted add <id> '<message>' ['<emoji>':'<role>',...] ['<required_role>',...]
    id : Eine eigens angegebene id der Nachricht, mit der später die Message sicher entfernt werden kann.
        Beim simplen Löschen ist momentan noch keine Funktion eingebaut, die auch die Serverdaten löscht.
    message : Die Nachricht, die den Benutzern angezeigt wird.
    emoji : Emojiname. Also z.B. :smile:
    role : Der Name der Rolle, welche zu dem Emoji korrespondiert.
    required_role : Eine Liste an Rollen, bei denen eine Reaction eine auswirkung auf den User hat. (restriction)
!reacted remove <id>'`);
}

function initialize(){
    
}

async function onMessage(message) {
    if (message.content[0] != prefix) return;
    let split = message.content.substring(1).split(' ');
    if (split[0] != attributes.modulename) return;

    switch(split[1]){
    case attributes.commands[0]:
        if(split[2] && split[3]){
            //save message metadata in file.
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
