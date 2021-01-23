const Command = bot.api.commands.Command;
const Parameter = bot.api.commands.Parameter;
const prefix = bot.api.constants.prefix;

module.exports.attributes = {
	modulename: "help",
	description:
		"Das Help-Modul. Hier kannst Du vieles über Commands und andere Module erfahren.",
	commands: [
		new Command(
			"modulehelp",
			"Zeigt die Hilfeseite von dem angegebenen Modul",
			[
				new Parameter(
					"-name",
					"required",
					[],
					"Der Name des Moduls.",
					(nr) => nr === 1,
					["help"],
					true
				),
			],
			[`${prefix}help modulehelp -name chmgr`]
		),
		new Command(
			"listmodules",
			"Zeigt alle verfügbaren Module an",
			[],
			[`${prefix}help listmodules`]
		),
	],
};