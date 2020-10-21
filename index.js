const Discord = require('discord.js');
const { prefix } = require('./config.json');
const discordTTS=require("discord-tts");


const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});
let connection;

let old_list = [];
let new_list = [];

client.on('message', async message => {
	// Join the same voice channel of the author of the message
	if (message.content === '!listenhere' && message.member.voice.channel) {
		connection = await message.member.voice.channel.join();
	} else if (message.content === '!leave' && message.member.voice.channel) {
		connection = await message.member.voice.channel.leave();
	}
});

client.on('voiceStateUpdate', async (oldState, newState) => {
	let channelID = oldState.channelID;
	if (channelID == null){
		channelID = newState.channelID;
	}
	const channel = await client.channels.fetch(channelID);
	let text = getChangeUsername(channel.members);
	if(text != null && connection && connection.channelID != channelID){
		const stream = discordTTS.getVoiceStream(text);
    	const dispatcher = connection.play(stream,  { volume: 0.5 });
	}
});

function getChangeUsername(members){
	old_list = new_list;
	new_list = [];
	for (var f of members) {
		let name = f[1].nickname;
		if(name == null){
			name = f[1].user.username;
		}
		new_list.push(name);
	};

	console.log(old_list);
	console.log(new_list);

	for (var f of old_list){
		if(!(new_list.includes(f))){
			//left the voicechat.
			return f + ' left the channel';
		}
	}

	for (var f of new_list){
		if(!(old_list.includes(f))){
			//joined the voicechat.
			return f + ' joined the channel';
		}
	}
	return null;
}

client.login(process.env.BOT_TOKEN);