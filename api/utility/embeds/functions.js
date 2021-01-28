const Discord = require("discord.js");
const LOGGER = require.main.require("./log.js")("embeds");
/**
 * Creates an embed with title and description.
 *
 * @param title
 * @param description
 * @returns {module:"discord.js".MessageEmbed} the embed.
 */
function create_embed(title, description) {
	return new Discord.MessageEmbed()
		.setColor("#ff9900")
		.setTitle(title)
		.setDescription(description)
		.setTimestamp()
		.setFooter(
			bot.client.user.username,
			bot.client.user.displayAvatarURL({ size: 32 })
		);
}

/**
 * Shortcut for creating discord.js embeds in a specific channel. This checks for the channel to exist and catches
 * any errors.
 *
 * @param title {string}
 * @param description {string}
 * @param channel {module:"discord.js".TextChannel} the channel to send the message in.
 *
 * @returns {Promise<void>} nothing.
 */
async function emb(title, description, channel) {
	if (!channel || channel.deleted === true) return; //maybe log to server log channel
	try {
		await channel.send(create_embed(title, description));
	} catch (error) {
		LOGGER.error(`Error: ${error}`);
	}
}

/**
 * Creates embeds and logs them to a specified logging channel.
 * If logging channel is not defined, it sends the embed but returns without logging.
 *
 * @param title {string}
 * @param description {string}
 * @param channel {module:"discord.js".TextChannel}
 * @param logging_channel {module:"discord.js".TextChannel}
 */
function embl(title, description, channel, logging_channel = undefined) {
	// TODO: make async
	if (!channel || channel.deleted === true) return; //maybe log to server log channel
	let embed = create_embed(title, description);
	channel.send(embed);
	if (!logging_channel || logging_channel.deleted === true) return;
	logging_channel.send(embed);
}

/**
 * Creates an embed containing all useful information about a module.
 *
 * @param mod_attributes {{modulename: string, description : string, commands: Command[]}}
 * @param channel {module:"discord.js".TextChannel} the channel to post the embed in
 * @returns {Promise<void>} nothing.
 *
 * @throws may throw an error, depending on discord permissions
 */
async function help_module(mod_attributes, channel) {
	const embed = new Discord.MessageEmbed()
		.setColor("#ffaaff")
		.setAuthor("Hilfeseite")
		.setTitle(`Modul: ${mod_attributes.modulename}`)
		.setDescription(mod_attributes.description)
		.setTimestamp()
		.setFooter(
			bot.client.user.username,
			bot.client.user.displayAvatarURL({ size: 32 })
		);

	for (let cmd of mod_attributes.commands) {
		let desc = `${cmd.description}\n`;
		desc += "```diff\n+ Beispiel(e) +\n";
		for (let example of cmd.examples) {
			desc += example + "\n";
		}
		desc += "```";
		for (let par_name in cmd.par_desc_map) {
			let c = cmd.par_desc_map[par_name];
			desc +=
				"```diff\n" +
				`${par_name} [${c.type}` +
				(c.default_construct === true
					? `; default: ${c.default_args.toString().replace(",", " ")}]\n`
					: "]\n") +
				` ${c.description}\n` +
				(c.dependent_params.length > 0
					? `+ hängt von diesen Parametern ab: [${c.dependent_params}]`
					: "") +
				"```";
		}
		embed.addField(`cmd: ${cmd.name}`, desc, false);
	}
	await channel.send(embed);
}

module.exports =  {
	create_embed,
	emb,
	embl,
	help_module,
};