const attributes = {
	modulename: "invite_manager",
	description:
		"Der Manger, der zu einer neuen Person den zugehörigen Invitelink findet.",
	default_config: {
		map: {},
	},
	commands: [
		new bot.api.Command(
			"config",
			"Lässt dich Werte Konfigurieren. Zum anzeigen der jetzigen und möglichen Schlüssel keine Parameter angeben.",
			[
				new bot.api.Parameter(
					"-key",
					"optional",
					["-value"],
					"Der Schlüssel. (momentan nur 'map'",
					(nr) => nr == 1,
					[],
					false
				),
				new bot.api.Parameter(
					"-value",
					"optional",
					["-key"],
					"Rollen-Link-Paare. Beispiel: -value 7z43i2e Rolle1",
					(nr) => nr >= 2 && nr % 2 == 0,
					[],
					false
				),
			],
			[`${bot.api.prefix}invite_manager config`, `${bot.api.prefix}invite_manager config -key map -value 7z43i2e Rolle1`]
		),
	],
};

module.exports = {
	attributes
};