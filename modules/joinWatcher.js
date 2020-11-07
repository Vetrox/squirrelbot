const discord = require("discord.js");
const discordTTS = require("discord-tts");
const { prefix } = require("../config.json");
const attributes = {
  modulename: "joinWatcher",
  commands: ["listenhere", "leave"],
};

let connection;

function initialize() {}

async function onVoiceStateUpdate(oldState, newState) {
  // truthy when user is in a voice channel now
  const ttsStr = `${
    newState.member.nickname ?? newState.member.user.username
  } ${newState.channel ? "joined the channel" : "left the channel"}.`;
  const channelID = oldState.channelID ?? newState.channelID;

  if (connection?.channel.id == channelID) {
    const stream = discordTTS.getVoiceStream(ttsStr);
    const dispatcher = connection.play(stream, { volume: 0.5 });
  }
}

async function onMessage(message) {
  if (message.content[0] != prefix) return;
  let split = message.content.substring(1).split(/\s+/);
  if (split[0] != attributes.modulename) return;

  switch (split[1]) {
    case attributes.commands[0]:
      connection = await message.member.voice.channel.join();
      break;
    case attributes.commands[1]:
      connection = await connection?.channel.leave();
      break;
  }
}

module.exports = {
  hooks: {
    voiceStateUpdate: onVoiceStateUpdate,
    message: onMessage,
  },
  initialize,
  attributes,
};
