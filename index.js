#!/usr/bin/env node
const api = require("./api/api");
const LOGGER = require("./log.js");
const Discord = require("discord.js");
const fs = require("fs");

require("dotenv").config();

/**
 * Can be accessed by any module to share information
 * */
global.bot = { client: new Discord.Client(), running: true};

/**
 * Maps a discord event to a map containing the modulename and the assigned event function of that module.
 * @type {{in Discord.Constants.Event: {modulename : string, eventFunc : Promise}[]}}
 */
let hooks = {};

/**
 * Read all modules from ./modules
 * */
function readModulesFromSource() {
	let modules = [];
	let files = fs.readdirSync("./modules");
	for (let file of files) {
		const mod = require("./modules/" + file + "/" + file);
		const modname = mod.attributes.modulename;
		for (const e in mod.hooks) {
			if(mod.hooks[e].constructor.name !== "AsyncFunction") {
				LOGGER.logMessage(`Das Event ${e}/${mod.hooks[e].name} vom Modul ${modname} ist keine asynchrone
				 Funktion und wird nicht ausgeführt werden.`);
			}
			if(!hooks[e] || hooks[e]?.length === 0) hooks[e] = [];
			hooks[e].push({modulename: modname, eventFunc: mod.hooks[e]});
		}
		modules.push(mod);
	}
	bot.modules = modules;
}

/**
 * Hooks up all discord events with the handleEvent function.
 */
function initializeDiscordEventCaptures() {
	const events = Discord.Constants.Events;
	for(const event in events) {
		const eventname = events[event];
		bot.client.on(eventname, (...args) => handleEvent(eventname, ...args));
	}
}

/**
 * Handle events from discord.
 */
function handleEvent(eventName, ...args) {
	if(!(eventName in hooks)) return;
	for(const { modulename, eventFunc } of hooks[eventName]) {
		if (eventFunc.constructor.name === "AsyncFunction") {
			eventFunc(...args).then(resultOfEventHook => {
				if(resultOfEventHook) {
					LOGGER.logMessage(`Finished execution of hook ${eventName} in module ${modulename}. The result was:`);
					LOGGER.logMessage(resultOfEventHook);
				}
			}).catch(error => {
				LOGGER.logMessage(`An error occured during execution of hook ${eventName} in module ${modulename}`);
				LOGGER.logMessage(error);
			});
		} else {
			LOGGER.logMessage(`The event-hook ${eventName} of module ${modulename} is not async and won't be called.`);
		}
	}
}


/**
 * Initialize the application
 * */
function initialize() {
	LOGGER.logMessage("Initialisere ...");
	bot.api = api;
	bot.api.functions.initialize();
	initializeDiscordEventCaptures();
	readModulesFromSource();
	bot.client.once("ready", async () => {
		await on_ready();
	});
}

/**
 * Start the application
 * */
async function on_ready() {
	LOGGER.logMessage("Discordjs ready!");
	for (const mod of bot["modules"]) {
		try {
			await mod.initialize();
		} catch (error) {
			LOGGER.logMessage(
				`Error beim Initialiseren Module: ${mod.attributes.modulename}\n${error}`
			);
			LOGGER.logMessage(error.stack);
			process.exit();
		}
	}
	LOGGER.logMessage("Bot bereit!");
}

/**
 * Execute the application
 * */
initialize();
LOGGER.logMessage("Einloggen");
bot.client.login(process.env.BOT_TOKEN).catch((error) => {
	LOGGER.logMessage("Fehler beim Einloggen: " + error);
});
