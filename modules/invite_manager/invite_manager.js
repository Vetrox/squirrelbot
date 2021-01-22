const { attributes } = require("./attributes.js");
const LOGGER = require.main.require("./log.js");


async function initialize() {
	await fetchInvites();
}

let invites = {};
let expected_responses = 0;
async function fetchInvites() {
	if (bot.client.guilds.cache.keyArray().length === 0) {
		LOGGER.logMessage(
			"Vielleicht ist das nicht so schlimm, aber es gibt keine guilds im Cache"
		);
		return;
	}
	LOGGER.logMessage("Einladungen abrufen...");
	bot.client.guilds.cache.each((guild) => {
		expected_responses++;
		guild.fetchInvites().then(
			(guildInvites) => {
				invites[guild.id] = guildInvites;
				expected_responses--;
			},
			() => {
				expected_responses--;
				LOGGER.logMessage(
					`Guild: ${guild.id} bietet nicht die erforderliche Berechtigung zum Abrufen von Einladungen.`
				);
			}
		);
	});
	while (isReady() === false) await bot.api.constants.wait(10);
	LOGGER.logMessage("Fertig.");
}

function isReady() {
	return expected_responses === 0;
}

async function onMessage(message) {
	try {
		if (bot.api.utility.channels.functions.isGT(message.channel) === false) return;
		let res = bot.api.commands.functions.parse_message(message, attributes);
		if (res === false) return;
		switch (res.name) {
		case "config": {
			let key = res.params["-key"]?.[0];
			if (key && key === "map") {
				let value = {};
				for (let i = 0; i < res.params["-value"].length - 1; i += 2) {
					value[res.params["-value"][i]] = res.params["-value"][i + 1];
				}
				bot.api.configs.functions.config_update(attributes, message.guild.id, key, value);
			}
			await bot.api.utility.embeds.functions.emb(
				"Konfiguation",
				`Die Werte sind\n${bot.api.configs.functions.config_toStr(
					attributes,
					message.guild.id
				)}`,
				message.channel
			);
			break;
		}
		}
	} catch (error) {
		bot.api.functions.hErr(error, message.channel);
	}
}

function onGuildMemberAdd(member) {
	try {
		member.guild.fetchInvites().then(async (guildInvites) => {
			try {
				let ei = invites[member.guild.id];
				// Look through the invites, find the one for which the uses went up.
				const invite = guildInvites.find((i) => ei.get(i.code).uses < i.uses);
				invites[member.guild.id] = guildInvites;
				if (!invite) {
					return;
				}
				LOGGER.logMessage(
					`${member.user.tag} joined dem Server und nutzt den Invite-Code ${invite.code} von ${invite.inviter.tag}. Invite-Code wurde bereits ${invite.uses} genutzt.`
				);
				let cfg = bot.api.configs.functions.config_load(attributes, member.guild.id).map;
				if (!(invite.code in cfg)) {
					LOGGER.logMessage("Kein passender Einladungscode");
					return;
				}
				let role_name = cfg[invite.code];
				let role_id = member.guild.roles.cache.find(
					(role) =>
						role.name.toLowerCase() === role_name.toLowerCase() ||
						role.name.toLowerCase() === "@" + role_name.toLowerCase()
				).id;
				member.roles.add(role_id);
				LOGGER.logMessage(
					`Gab dem Benutzer ${member.user.tag} die Rolle ${role_name}.`
				);
			} catch (error) {
				LOGGER.logMessage(error);
				LOGGER.logMessage(error.stack);
			}
		},
		(reason) => {
			LOGGER.logMessage(
				`Guild: ${member.guild.id} bietet nicht die erforderliche Berechtigung zum Abrufen von Einladungen..\n ${reason}`
			);
		});
	} catch (error) {
		LOGGER.logMessage(
			"Es ist ein Fehler im invite_manager onGuildMemberAdd aufgetreten."
		);
		LOGGER.logMessage(error);
	}
}
module.exports = {
	hooks: {
		message: onMessage,
		guildMemberAdd: onGuildMemberAdd,
	},
	initialize,
	attributes,
};
