const { attributes }  = require("./attributes.js");
const log = require("../../log.js");


async function initialize() {
	await fetchInvites();
}

let invites = {};
let expected_responses = 0;
async function fetchInvites() {
	if (bot.client.guilds.cache.keyArray().length == 0) {
		bot.api.log.logMessage(
			"Maybe this isn't that bad, but there aren't any guilds in the cache"
		);
		return;
	}
	bot.api.log.logMessage("Fetching invites...");
	bot.client.guilds.cache.each((guild) => {
		expected_responses++;
		guild.fetchInvites().then(
			(guildInvites) => {
				invites[guild.id] = guildInvites;
				expected_responses--;
			},
			(reason) => {
				expected_responses--;
				bot.api.log.logMessage(
					`Guild: ${guild.id} doesn't provide the required permission to fetch invites.`
				);
			}
		);
	});
	while (isReady() == false) await bot.api.wait(10);
	bot.api.log.logMessage("Finished.");
}

function isReady() {
	return expected_responses == 0;
}

async function onMessage(message) {
	try {
		if (bot.api.isGT(message.channel) == false) return;
		let res = bot.api.parse_message(message, attributes);
		if (res == false) return;
		switch (res.name) {
		case "config": {
			let key = res.params["-key"]?.[0];
			if (key && key == "map") {
				let value = {};
				for (let i = 0; i < res.params["-value"].length - 1; i += 2) {
					value[res.params["-value"][i]] = res.params["-value"][i + 1];
				}
				bot.api.config_update(attributes, message.guild.id, key, value);
			}
			await bot.api.emb(
				"Konfiguation",
				`Die Werte sind\n${bot.api.config_toStr(
					attributes,
					message.guild.id
				)}`,
				message.channel
			);
			break;
		}
		}
	} catch (error) {
		bot.api.hErr(error, message.channel);
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
				log.logMessage(
					`${member.user.tag} joined using invite code ${invite.code} from ${invite.inviter.tag}. Invite was used ${invite.uses} times since its creation.`
				);
				let cfg = bot.api.config_load(attributes, member.guild.id).map;
				if (!(invite.code in cfg)) {
					console.log("no matching invite code");
					return;
				}
				let role_name = cfg[invite.code];
				let role_id = member.guild.roles.cache.find(
					(role) =>
						role.name.toLowerCase() == role_name.toLowerCase() ||
						role.name.toLowerCase() == "@" + role_name.toLowerCase()
				).id;
				member.roles.add(role_id);
				log.logMessage(
					`Gave the user ${member.user.tag} the role ${role_name}.`
				);
			} catch (error) {
				log.logMessage(error);
				log.logMessage(error.stack);
			}
		},
		(reason) => {
			bot.api.log.logMessage(
				`Guild: ${member.guild.id} doesn't provide the required permission to fetch invites.`
			);
		});
	} catch (error) {
		bot.api.log.logMessage(
			"An error occured at invite_manager onGuildMemberAdd."
		);
		bot.api.log.logMessage(error);
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
