const { attributes } = require("./attributes.js");

const databases = [
	{
		name: attributes.modulename + "_userchannels",
		keys: [
			"channelID",
			"ownerID",
			"is_part_of_category", // true or false
			"is_category_parent", // when it's the parent of a private user channel. false by default
			"manage_type", // role or userID. important for deletion and change
		],
	},
];

module.exports = {
	databases
};