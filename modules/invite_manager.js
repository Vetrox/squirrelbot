const discord = require("discord.js");
const { prefix } = require("../config.json");
const log = require("../log.js");
const err = require("../errors.js");
const attributes = {
  modulename: "invite_manager",
  description:
    "Der Manger, der zu einer neuen Person den zugehörigen Invitelink findet.",
  commands: [
    new bot.api.Command(
      "config",
      "Lässt dich Werte Konfigurieren. Zum anzeigen der jetzigen und möglichen Schlüssel keine Parameter angeben.",
      [
        new bot.api.Parameter(
          "-key",
          "optional",
          ["-value"],
          "Der Schlüssel.",
          (nr) => nr == 1,
          [],
          false
        ),
        new bot.api.Parameter(
          "-value",
          "optional",
          ["-key"],
          "Der Wert.",
          (nr) => nr == 1,
          [],
          false
        ),
      ]
    ),
  ],
};
//TODO: rework this module

async function initialize() {
  await fetchInvites();
}

let invites = {};
let expected_responses = 0;
async function fetchInvites(){
  if (bot.client.guilds.cache.keyArray().length == 0) {
    bot.api.log.logMessage(
      "Maybe this isn't that bad, but there aren't any guilds in the cache"
    );
    return;
  }
  bot.api.log.logMessage("Fetching invites...");
  bot.client.guilds.cache.each((guild) => {
    expected_responses++;
    guild.fetchInvites().then(
      (guildInvites) => {
        invites[guild.id] = guildInvites;
        expected_responses--;
      },
      (reason) => {
        expected_responses--;
        bot.api.log.logMessage(
          `Guild: ${guild.id} doesn't provide the required permission to fetch invites.`
        );
      }
    );
  });
  while (isReady() == false) await bot.api.wait(10);
  bot.api.log.logMessage("Finished.");
}

function isReady() {
  return expected_responses == 0;
}

function onMessage(message) {
  if (message.content[0] != prefix) return;
  let split = message.content.substring(1).split(/\s+/);
  if (!split[0] || split[0] != attributes.modulename || !split[1]) return;

  switch (split[1]) {
    case attributes.commands[1]:
      try {
        bot["api"].database_create_if_not_exists(attributes.modulename, [
          "guild_id",
          "log_channel_id",
        ]);
        try {
          let i = bot["api"].lookup_key_value(
            attributes.modulename,
            "guild_id",
            message.guild.id.toString()
          )[0];
          bot["api"].database_row_change(
            attributes.modulename,
            i,
            "log_channel_id",
            message.channel.id.toString()
          );
        } catch (error) {
          //either key not in keys, or [LIKELY] value not in index
          if (error instanceof err.Find)
            bot["api"].database_row_add(attributes.modulename, [
              message.guild.id.toString(),
              message.channel.id.toString(),
            ]);
          else throw error;
        }
        bot.api.emb(
          "Erfolgreich",
          "Attached this channel to log invites to. :)",
          message.channel
        );
      } catch (error) {
        throw error;
      }
      break;
    case attributes.commands[2]:
      try {
        bot["api"].database_create_if_not_exists(attributes.modulename, [
          "guild_id",
          "log_channel_id",
        ]);
        bot["api"].database_row_delete(
          attributes.modulename,
          bot["api"].lookup_key_value(
            attributes.modulename,
            "guild_id",
            message.guild.id.toString()
          )[0]
        );
        bot.api.emb(
          "Erfolgreich",
          "Detatched this channel from logging here.",
          message.channel
        );
      } catch (error) {
        throw error;
      }
      break;
    default:
      help(message.channel);
  }
}

function onGuildMemberAdd(member) {
  // To compare, we need to load the current invite list.
  member.guild.fetchInvites().then(async (guildInvites) => {
    // This is the *existing* invites for the guild.
    let ei = invites[member.guild.id];
    // Look through the invites, find the one for which the uses went up.
    const invite = guildInvites.find((i) => ei.get(i.code).uses < i.uses);
    // Get the log channel (change to your liking)
    // const logChannel = member.guild.channels.find(channel => channel.name === "join-logs");
    // Update the cached invites for the guild.
    invites[member.guild.id] = guildInvites;

    log.logMessage(
      `${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
    );
    try {
      bot["api"].database_create_if_not_exists(attributes.modulename, [
        "guild_id",
        "log_channel_id",
      ]);
      let i = bot["api"].lookup_key_value(
        attributes.modulename,
        "guild_id",
        member.guild.id.toString()
      )[0]; //-> should be unique. if not, we have a conflict
      let ch_id = bot["api"].lookup_index(
        attributes.modulename,
        i,
        "log_channel_id"
      );
      member.client.channels.fetch(ch_id).then((log_channel) => {
        log_channel.send(
          `${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
        );
      });
    } catch (error) {
      if (error instanceof err.Find) {
        log.logMessage(
          "No logging channel specified for guild " + member.guild.id
        );
      } else {
        throw error;
      }
    }
  });
}

module.exports = {
  hooks: {
    message: onMessage,
    guildMemberAdd: onGuildMemberAdd,
  },
  initialize,
  attributes,
};
