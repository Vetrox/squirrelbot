/*REQUIRE*/
const discord		= require('discord.js');
const discordTTS	= require('discord-tts');
const fs			= require('fs');
const log			= require('./log.js');
require('dotenv').config(); // read in environment variables


/*CONSTANTS*/
const client = new discord.Client();
const wait = require('util').promisify(setTimeout); //doesn't block the execution

/*VARIABLES*/
global.bot;

/*CLASSES*/
class Bot{
	constructor(modules, client, invites){
		this.modules = modules;
		this.client = client;
		this.invites = invites;
	}
}


/*FUNCTIONS*/
function getBot() {
	return bot;
}

function initialize_modules1() {
	let modules = [];
	/* read all modules from modules directory */
	let files = fs.readdirSync('./modules'); 
	for (file of files) {
		const mod = require('./modules/' + file);
		// TODO put this all into one list
		/*add event hooks*/
		for (event in mod.hooks) {
			log.logMessage(`Attached event hook '${event}' from module '${file}'`);
			client.on(event, mod.hooks[event]);
		}
		modules.push(mod);
	}
	return modules;
}

function initialize_modules2(){
	/*for(mod in bot.modules){
		mod.initialize();
	}*/
}

async function gather_invite_cache() {
	let invites = {};
	log.logMessage('Fetching invites...');
	for([id, g] of client.guilds.cache) {
		g.fetchInvites().then(guildInvites => {
			invites[g.id] = guildInvites;
		}, reason => {
			log.logMessage("Guild: " + g.id + " doesnt provide the required permissions...");
		});
	}
	return invites;
}

function initialize(){
	client.once('ready', async () => {
		await on_ready();
	});
}

async function on_ready(){
	log.logMessage('Discordjs ready!');
	await wait(1000);
	bot = new Bot(initialize_modules1(), client, gather_invite_cache());
	initialize_modules2();
	log.logMessage('Bot ready!');
}




/*EXECUTION*/
initialize();
client.login(process.env.BOT_TOKEN); //-> triggers the event-handlers

