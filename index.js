#!/usr/bin/env node

const Discord = require("discord.js");
const fs = require("fs");
const LOGGER = require("./log.js")("index");
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
	LOGGER.info("Initialisere ...");
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
	LOGGER.info("Discordjs ready!");
	for (const mod of bot["modules"]) {
		try {
			await mod.initialize();
		} catch (error) {
			LOGGER.info(
				`Error beim Initialiseren Module: ${mod.attributes.modulename}\n${error}`
			);
			LOGGER.info(error.stack);
			process.exit();
		}
	}
	LOGGER.info("Bot bereit!");
}

/**
 * Execute the application
 * */
initialize();
LOGGER.info("Einloggen");
client.login(process.env.BOT_TOKEN).catch((error) => {
	LOGGER.info("Fehler beim Einloggen: " + error);
});
