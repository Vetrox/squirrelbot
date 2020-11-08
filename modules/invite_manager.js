const discord = require("discord.js");
const { prefix } = require("../config.json");
const log = require("../log.js");
const attributes = {
  modulename: "invite_manager",
  description:
    "Der Manger, der zu einer neuen Person den zugehörigen Invitelink findet.",
  default_config: {
    test: "def",
  },
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
async function fetchInvites() {
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
  try {
    if (bot.api.isGT(message.channel) == false) return;
    let res = bot.api.parse_message(message, attributes);
    if (res == false) return;
    switch (res.name) {
      case "config": {
        let key = res.params["-key"]?.[0];
        if (key) {
          bot.api.config_update(attributes, key, res.params["-value"][0]);
        }
        bot.api.emb(
          "Konfiguation",
          `Die Werte sind\n${bot.api.config_toStr(attributes)}`,
          message.channel
        );
        break;
      }
    }
  } catch (error) {
    bot.api.hErr(error, message.channel);
  }
}

function onGuildMemberAdd(member) {
  member.guild.fetchInvites().then(async (guildInvites) => {
    let ei = invites[member.guild.id];
    // Look through the invites, find the one for which the uses went up.
    const invite = guildInvites.find((i) => ei.get(i.code).uses < i.uses);
    invites[member.guild.id] = guildInvites;
    log.logMessage(
      `${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
    );
    //TODO add possibility to give user a role based on the invite link.
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
