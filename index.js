const discord       = require('discord.js');
const discordTTS    = require('discord-tts');
const fs            = require('fs');
const log           = require('./log.js');
// read in environment variables
require('dotenv').config();
class Bot{
	constructor(modules, client){
		this.modules = modules;
		this.client = client;
	}
	modules(){
		return this.modules;
	}
	client(){
		return this.client;
	}
}

const client = new discord.Client();
let modules = [];
let bot;

function getBot(){
	return bot;
}
// read all modules from modules directory
let files = fs.readdirSync('./modules');
for (file of files) {
    const mod = require('./modules/' + file);
    // TODO put this all into one list
    /*add event hooks*/
    for (event in mod.hooks) {
        log.logMessage(`Attached event hook '${event}' from module '${file}'`);
        client.on(event, (...args) => mod.hooks[event](getBot(), ...args));

    }
    modules.push(mod);
}
bot = new Bot(modules, client);

client.login(process.env.BOT_TOKEN);
