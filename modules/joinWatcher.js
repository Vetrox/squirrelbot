const discord       = require('discord.js');
const discordTTS    = require('discord-tts');
const { prefix }    = require('../config.json');

let connection;

async function onVoiceStateUpdate(oldState, newState) {
    // truthy when user is in a voice channel now
    const ttsStr = `${newState.member.nickname ?? newState.member.user.username} ${newState.channel ? 'joined the channel' : 'left the channel'}.`;
    const channelID = oldState.channelID ?? newState.channelID;

    if (connection?.channel.id == channelID) {
        const stream = discordTTS.getVoiceStream(ttsStr);
        const dispatcher = connection.play(stream,  { volume: 0.5 });
    }
};

async function onMessage(message) {
    if (message.content[0] === prefix) {
        let split = message.content.substring(1).split(' ');
        if (split[0] === 'listenhere') {
            connection = await message.member.voice.channel.join();
        }
    }
}

module.exports.hooks = {
    'voiceStateUpdate': onVoiceStateUpdate,
    'message': onMessage
}
