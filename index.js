#!/usr/bin/env node

/*REQUIRE*/
const Discord = require("discord.js");
const fs = require("fs");
const log = require("./log.js");
const api = require("./api.js");
const errors = require("./errors.js");
require("dotenv").config(); // read in environment variables

/*CONSTANTS*/
const client = new Discord.Client();

/*GLOBAL VARIABLES*/
global.bot = { client: client, running: true }; // the bot variable can be accessed by any module to share information across modules. constants can easily be written in the declaration.

/*CLASSES*/

/*FUNCTIONS*/
function initialize_modules() {
  let modules = [];
  /* read all modules from modules directory */
  let files = fs.readdirSync("./modules");
  for (let file of files) {
    const mod = require("./modules/" + file + "/" + file);
    for (let event in mod.hooks) {
      client.on(event, mod.hooks[event]);
    }
    modules.push(mod);
  }
  bot.modules = modules;
}

function initialize() {
  log.logMessage("Initializing the bot...");
  bot.api = api;
  bot.err = errors;
  bot.api.initialize();
  initialize_modules();
  client.once("ready", async () => {
    await on_ready();
  });
}

async function on_ready() {
  log.logMessage("Discordjs ready!");
  for (mod of bot["modules"]) {
    try {
      await mod.initialize();
    } catch (error) {
      log.logMessage(
        `Error while initializing module ${mod.attributes.modulename}\n${error}`
      );
      log.logMessage(error.stack);
      process.exit();
    }
  }
  log.logMessage("Bot ready!");
}

/*EXECUTION*/
initialize();
log.logMessage("Logging in");
client.login(process.env.BOT_TOKEN); //-> triggers the event-handlers
