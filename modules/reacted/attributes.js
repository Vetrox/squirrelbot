const attributes = {
	modulename: "reacted",
	description: "Das Modul zum managen von Reactions auf Nachrichten und der dazugehörigen Vergabe von Rollen.",
	commands: [
		new bot.api.Command(
			"add",
			"Kreiert eine Nachricht mit den angegebenen Funktionen.",
			[
				new bot.api.Parameter(
					"-messageID",
					"required",
					[],
					"Die Nachricht muss sich im gleichen Channel befinden. Danach kannst du sie löschen.",
					(nr) => nr == 1,
					[],
					false
				),
				new bot.api.Parameter(
					"-map",
					"required",
					[],
					"Argumente: Immer ein Emoji gefolgt von einer Rolle. Das @ vor Rollen kann/sollte weggelassen werden.",
					(nr) => nr >= 2 && nr % 2 == 0,
					["✅", "Verified"],
					true
				),
				new bot.api.Parameter(
					"-wl",
					"required",
					[],
					"Die Whitelist an Rollen, die ein User benötigt, damit der Bot ihm eine Rolle gibt.",
					(nr) => nr > 0,
					["everyone"],
					true
				),
				new bot.api.Parameter(
					"-wl_mode",
					"required",
					["-wl"],
					"Der Modus der Whitelist. Zugelassen sind: lower, equal, not_equal (blacklisting), higher.",
					(nr) => nr == 1,
					["equal"],
					true
				),
			],
			[
				"!reacted add -messageID 696969696969",
				"!reacted add -messageID 696969696969 -map ✅ Verified",
				"!reacted add -messageID 696969696969 -map ✅ Verified -wl everyone -wl_mode lower",
			]
		),
		new bot.api.Command(
			"remove",
			"Löscht eine Nachricht anhand der Originalen MessageID",
			[
				new bot.api.Parameter(
					"-messageID",
					"required",
					[],
					"Die originale MessageID steht unten in der Bot-Nachricht",
					(nr) => nr == 1,
					[],
					false
				),
			],
			["!reacted remove -messageID 696969696969"]
		),
	],
};

module.exports = {
	attributes
};