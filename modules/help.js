const discord = require("discord.js");
const attributes = {
  modulename: "help",
  description:
    "Das Help-Modul. Hier kannst Du vieles über Commands und andere Module erfahren.",
  commands: [
    new bot.api.Command(
      "modulehelp",
      "Zeigt die Hilfeseite von dem angegebenen Modul",
      [
        new bot.api.Parameter(
          "-name",
          "required",
          [],
          "Der Name des Moduls.",
          (nr) => nr == 1,
          ["help"],
          true
        ),
      ]
    ),
    new bot.api.Command("listmodules", "Zeigt alle verfügbaren Module an", []),
  ],
};

function initialize() {}

function onMessage(message) {
  try {
    if (bot.api.isGT(message.channel) == false) return;
    let res = bot.api.parse_message(message, attributes);
    if (res == false) return;
    switch (res.name) {
      case "modulehelp": {
        for (mod of bot.modules) {
          if (mod?.attributes?.modulename === res.params["-name"][0]) {
            bot.api.help_module(mod.attributes, message.channel);
            return;
          }
        }
        bot.api.emb(
          "Keine Hilfeseite",
          `Konnte keine Hilfeseite für das Modul ${res.params["-name"][0]} finden.`,
          message.channel
        );
        break;
      }
      case "listmodules": {
        let desc = "";
        for (mod of bot.modules) {
          if (mod?.attributes?.modulename) {
            desc += "\n→ " + mod.attributes.modulename;
          }
        }
        bot.api.emb("Alle Module", desc, message.channel);
        break;
      }
    }
  } catch (error) {
    if (error instanceof bot.err.CommandNameNotFound) {
      bot.api.help_module(attributes, message.channel);
      return;
    }
    bot.api.hErr(error, message.channel);
  }
}

module.exports = {
  hooks: {
    message: onMessage,
  },
  initialize,
  attributes,
};
