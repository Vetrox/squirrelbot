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
 * Read all modules from ./modules
 * */
function readModulesFromSource() {
	let modules = [];
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

/**
 * Initialize the application
 * */
function initialize() {
	LOGGER.logMessage("Initialisere ...");
	bot.api = api;
	bot.err = errors;
	bot.api.initialize();
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
	LOGGER.logMessage("Bot ready!");
}

/**
 * Execute the application
 * */
initialize();
LOGGER.logMessage("Logging in");
client.login(process.env.BOT_TOKEN).catch((error) => {
	LOGGER.logMessage("Fehler beim Einloggen: " + error);
});
