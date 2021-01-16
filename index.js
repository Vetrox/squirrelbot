#!/usr/bin/env node

const Discord = require("discord.js");
const fs = require("fs");
const log = require("./log.js");
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
	log.logMessage("Initializing the bot...");
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
	log.logMessage("Discordjs ready!");
	for (const mod of bot["modules"]) {
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

/**
 * Execute the application
 * */
initialize();
log.logMessage("Logging in");
client.login(process.env.BOT_TOKEN).catch((error) => {
	log.logMessage("Error while login: " + error);
});
