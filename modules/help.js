const discord = require('discord.js');

function onMessage(message) {
    console.log(message.content);
}

module.exports.hooks = {
    'message': onMessage
};
