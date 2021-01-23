const Command = bot.api.commands.Command;
const Parameter = bot.api.commands.Parameter;
const prefix = bot.api.constants.prefix;

const attributes = {
	modulename: "invite_manager",
	description:
		"Der Manger, der zu einer neuen Person den zugehörigen Invitelink findet.",
	default_config: {
		map: {},
	},
	commands: [
		new Command(
			"config",
			"Lässt dich Werte Konfigurieren. Zum anzeigen der jetzigen und möglichen Schlüssel keine Parameter angeben.",
			[
				new Parameter(
					"-key",
					"optional",
					["-value"],
					"Der Schlüssel. (momentan nur 'map'",
					(nr) => nr === 1,
					[],
					false
				),
				new Parameter(
					"-value",
					"optional",
					["-key"],
					"Rollen-Link-Paare. Beispiel: -value 7z43i2e Rolle1",
					(nr) => nr >= 2 && nr % 2 === 0,
					[],
					false
				),
			],
			[`${prefix}invite_manager config`, `${prefix}invite_manager config -key map -value 7z43i2e Rolle1`]
		),
	],
};

module.exports = {
	attributes
};