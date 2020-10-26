/*REQUIRE*/
const discord		= require('discord.js');
const discordTTS	= require('discord-tts');
const fs			= require('fs');
const log			= require('./log.js');
const api			= require('./api.js');
require('dotenv').config(); // read in environment variables


/*CONSTANTS*/
const client = new discord.Client();

/*GLOBAL VARIABLES*/
global.bot = {'client': client, 'running' : true}; // the bot variable can be accessed by any module to share information across modules. constants can easily be written in the declaration.

/*CLASSES*/

/*FUNCTIONS*/
function initialize_modules() {
	let modules = [];
	/* read all modules from modules directory */
	let files = fs.readdirSync('./modules'); 
	for (file of files) {
		const mod = require('./modules/' + file);
		/* add event hooks */
		for (event in mod.hooks) {
			client.on(event, mod.hooks[event]);
			log.logMessage(`Attached event hook '${event}' from module '${file}'`);
		}
		modules.push(mod);
	}
	bot['modules'] = modules;
}


function initialize(){
	log.logMessage('Initializing the bot...');
	bot['api'] = api;
	bot['api'].initialize();
	initialize_modules();
	client.once('ready', async () => {
		await on_ready();
	});
}

async function on_ready(){
	log.logMessage('Discordjs ready!');
	for(mod of bot['modules']){
		await mod.initialize(); //this function lets each module initialize its local variables, in case they need to.
	}
	log.logMessage('Bot ready!');
}


/*EXECUTION*/
initialize();
client.login(process.env.BOT_TOKEN); //-> triggers the event-handlers

