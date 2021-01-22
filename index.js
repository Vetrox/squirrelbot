#!/usr/bin/env node
import api from "./api/summary.js";
import LOGGER from "./log.js";
import Discord from "discord.js";
import fs from "fs";

require("dotenv").config();

/**
 * Can be accessed by any module to share information
 * */
global.bot = { client: new Discord.Client(), running: true , api : api, err : api.errors, LOGGER: LOGGER};

/**
 * Read all modules from ./modules
 * */
function readModulesFromSource() {
	let modules = [];
	let files = fs.readdirSync("./modules");
	for (let file of files) {
		const mod = require("./modules/" + file + "/" + file);
		for (let event in mod.hooks) {
			bot.client.on(event, mod.hooks[event]);
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
	bot.api.functions.initialize();
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
