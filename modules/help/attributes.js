const attributes = {
	modulename: "help",
	description:
		"Das Help-Modul. Hier kannst Du vieles über Commands und andere Module erfahren.",
	commands: [
		new bot.api.Command(
			"modulehelp",
			"Zeigt die Hilfeseite von dem angegebenen Modul",
			[
				new bot.api.Parameter(
					"-name",
					"required",
					[],
					"Der Name des Moduls.",
					(nr) => nr == 1,
					["help"],
					true
				),
			],
			["!help modulehelp -name chmgr"]
		),
		new bot.api.Command(
			"listmodules",
			"Zeigt alle verfügbaren Module an",
			[],
			["!help listmodules"]
		),
	],
};

module.exports = {
	attributes
};