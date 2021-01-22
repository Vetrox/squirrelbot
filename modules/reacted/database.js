const { attributes } = require("./attributes.js");

module.exports.databases = [
	{
		name: attributes.modulename,
		keys: [
			"messageID",
			"emoji_map",
			"required_roles",
			"required_type", // 'lower'/'equal'/'not_equal'/'higher'
			"new_msg_id",
			"guild_id",
			"channel_id",
		],
	},
];