const err = require.main.require("./api/errors/summary");

/**
 * Checks, if the user has the admin permission and throws an error.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @returns {Promise<void>} nothing.
 *
 * @throws {err.BotError}, if the user doesn't have the required permission. The error message can be displayed to
 * the user.
 */
async function is_admin(user_ID, guild) {
	await has_permission(user_ID, guild, "ADMINISTRATOR");
}

/**
 * Checks, if the user has a specific permission.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @param perm_name {typeof module:"discord.js".PermissionString}
 *
 * @returns {Promise<void>} nothing.
 *
 * @throws {err.BotError}, if the user doesn't have the required permission. The error message can be displayed to
 * the user.
 */
async function has_permission(user_ID, guild, perm_name) {
	let guildMember = await guild.members.fetch({
		user: user_ID,
		cache: true,
		force: true,
	});
	let has = guildMember.roles.highest.permissions.has(perm_name);
	if (!has || has === false)
		throw new err.BotError(
			`Du brauchst die ${perm_name} Berechtigung, um dies auszuführen.`
		);
}

/**
 * Gets the nickname/display-name of a person.
 *
 * @param user_ID {string}
 * @param guild {module:"discord.js".Guild}
 * @returns {Promise<string>}
 */
async function get_nickname(user_ID, guild) {
	let guildMember = await guild.members.fetch({
		user: user_ID,
		cache: true,
		force: true,
	});
	return guildMember.displayName;
}

module.exports = {
	is_admin,
	has_permission,
	get_nickname,
};
