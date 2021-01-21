#!/usr/bin/env node

const Discord = require("discord.js");
const fs = require("fs");
const LOGGER = require("./log.js");
const api = require("./api.js");
const errors = require("./errors.js");
require("dotenv").config();
const client = new Discord.Client();

/**
 * Can be accessed by any module to share information
 * */
global.bot = { client: client, running: true };

/**
 * Maps a discord event to a map containing the modulename and the assigned event function of that module.
 * @type {{in Discord.Constants.Event: {modulename : string, eventFunc : Promise | Function}[]}}
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
		for (let e in mod.hooks) {
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

function initializeDiscordEventCaptures() {
	const events = Discord.Constants.Events;
	for(const event in events) {
		const eventname = events[event];
		client.on(eventname, (...args) => handleEvent(eventname, ...args));
	}
}

/**
 * Handle events from discord.
 */
function handleEvent(eventName, ...args) {
	if(!(eventName in hooks)) return;
	LOGGER.logC(hooks[eventName]);
	for(const { modulename, eventFunc } of hooks[eventName]) {
		console.log("Going to call " + modulename + " " + eventName);
		if (eventFunc.constructor.name === "AsyncFunction") { // when it's an async function setup .then and
			// .catch in case something happens.
			eventFunc(...args).then(result => {
				if(result) { // in case modules want to use return for information sharing
					LOGGER.logMessage(`Finished execution of hook ${eventName} in module ${modulename}. The result was:`);
					LOGGER.logMessage(result);
				}
			}).catch(error => {
				LOGGER.logMessage(`An error occured during execution of hook ${eventName} in module ${modulename}`);
				LOGGER.logMessage(error);
			});
		} else { // all module functions should be async to make function calls easier
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
	bot.err = errors;
	bot.api.initialize();
	initializeDiscordEventCaptures();
	readModulesFromSource();
	client.once("ready", async () => {
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
client.login(process.env.BOT_TOKEN).catch((error) => {
	LOGGER.logMessage("Fehler beim Einloggen: " + error);
});
