const discord       = require('discord.js');
const discordTTS    = require('discord-tts');
const fs            = require('fs');
const log           = require('./log.js');

// read in environment variables
require('dotenv').config();
const client = new discord.Client();

// read all modules from modules directory
let files = fs.readdirSync('./modules');
for (file of files) {
    const module = require('./modules/' + file);
    // TODO put this all into one list
    for (event in module.hooks) {
        log.logMessage(`Attached event hook '${event}' from module '${file}'`)
        client.on(event, module.hooks[event]);
    }
}

client.login(process.env.BOT_TOKEN);
