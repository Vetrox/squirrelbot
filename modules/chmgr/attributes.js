const Command = bot.api.commands.Command;
const Parameter = bot.api.commands.Parameter;
const prefix = bot.api.constants.prefix;

module.exports.attributes = {
	modulename: "chmgr",
	description:
		"Der Channel-Manager. Hier kannst Du Channels kreieren und löschen. Auch ganze Bereiche, die nur Du und deine Freunde betreten können, kannst du hier erschaffen. Die Administratoren können mithilfe des setup Commands Rollen für jeden Command angeben, die diesen Ausführen dürfen.",
	default_config: {
		area_role_attributes: {
			VIEW_CHANNEL: true,
			ADD_REACTIONS: true,
			STREAM: true,
			SEND_MESSAGES: true,
			SEND_TTS_MESSAGES: true,
			EMBED_LINKS: true,
			ATTACH_FILES: true,
			READ_MESSAGE_HISTORY: true,
			USE_EXTERNAL_EMOJIS: true,
			CONNECT: true,
			SPEAK: true,
		},
		create: ["everyone"],
		create_area: ["everyone"],
		delete_area: ["everyone"],
		invite: ["everyone"],
		delete: ["everyone"],
		category_logging_channel: null,
		category_inactivity_cap_hours: -1, // all negative values mean it's not checked
	},
	commands: [
		new Command(
			"create",
			"Kreiert einen einzelnen Text- oder Voicechannel. Du kannst die Rollen, die ihn sehen können später hier auch angeben",
			[
				new Parameter(
					"-name",
					"required",
					[],
					"Der Name des Channels.",
					(nr) => nr === 1,
					[],
					false
				),
				new Parameter(
					"-type",
					"required",
					[],
					"Der Typ des Channels (text/voice/category).",
					(nr) => nr === 1,
					["text"],
					true
				),
				new Parameter(
					"-parentID",
					"optional",
					[],
					"Wenn Du den Channel an eine Kategorie anknüpfen möchtest.",
					(nr) => nr === 1,
					[],
					false
				),
			],
			[
				`${prefix}chmgr create -name MeinChannel`,
				`${prefix}chmgr create -name MeinChannel -type text`,
				`${prefix}chmgr create -name MeinChannel -type voice`,
				`${prefix}chmgr create -name MeinChannel -type category`,
				`${prefix}chmgr create -name MeinUnterChannel -parentID 69696969696969`,
			]
		),
		new Command(
			"create_area",
			"Kreiert deinen eigenen Bereich, auf den nur eingeladene Personen Zugriff haben. Zum hinzufügen/entfernen von Personen siehe invite.",
			[
				new Parameter(
					"-name",
					"required",
					[],
					"Der Name des Bereichs.",
					(nr) => nr === 1,
					[],
					false
				),
				new Parameter(
					"-access_type",
					"required",
					[],
					"Der Zugriffs-Management-Typ. 'role' oder 'userID'",
					(nr) => nr === 1,
					["userID"],
					true
				),
			],
			[
				`${prefix}chmgr create_area -name Mein_Bereich`,
				`${prefix}chmgr create_area -name Mein_Bereich -access_type role`,
			]
		),
		new Command(
			"delete_area",
			"Löscht alle deine Areas. Eigentlich solltest du nicht mehrere haben können.",
			[
				new Parameter(
					"-here",
					"optional",
					[],
					"Falls Du ein Admin bist, und diesen Kanal löschen willst.",
					(nr) => nr === 1,
					["true"],
					true
				),
			],
			[`${prefix}chmgr delete_area`, `${prefix}chmgr delete_area -here`]
		),
		new Command(
			"invite",
			"Läd Personen ein/aus.",
			[
				new Parameter(
					"-name",
					"required",
					[],
					"Der user, mit einem @ davor",
					(nr) => nr === 1,
					[],
					false
				),
				new Parameter(
					"-remove",
					"required",
					[],
					"Ob der User aus deinem Channel ausgeladen werden soll. Wenn weggelassen, dann wird er hinzugefügt.",
					(nr) => nr === 1,
					["false"],
					true
				),
			],
			[`${prefix}chmgr invite -name @Max`, `${prefix}chmgr invite -name @Max -remove true`]
		),
		new Command(
			"delete",
			"Löscht einen Text oder Voicechannel. Dies kann per Definition immer nur der Owner.",
			[
				new Parameter(
					"-channelID",
					"required",
					[],
					"Die ID des Channels. Du musst den Developermodus aktivieren, um die Channel ID mittels eines Rechtsklicks erfahren zu können. Eventuell wirst du später auch mittels eines Commands alle dir gehörenden Channel anzeigen lassen können.",
					(nr) => nr === 1,
					[],
					false
				),
			],
			[`${prefix}chmgr delete -channelID 69696969696969`]
		),
		new Command(
			"config",
			"Setzt Konfigurationen. Wenn du keinen Parameter angibst, werden dir alle Gespeicherten Keys und auch die möglichen Keys angezeigt. Du musst ein Admin sein, um diesen Command ausführen zu können.",
			[
				new Parameter(
					"-key",
					"optional",
					["-value"],
					"Die Einstellung, die Du bearbeiten möchtest.",
					(nr) => nr === 1,
					[],
					false
				),
				new Parameter(
					"-value",
					"optional",
					["-key"],
					"Der Wert, auf den die Einstellung gesetzt wird.",
					(nr) => nr >= 1,
					[],
					false
				),
			],
			[
				`${prefix}chmgr config`,
				`${prefix}chmgr config -key create_area -value Rolle1 Rolle2 Rolle3`,
				`${prefix}chmgr config -key create_area -value everyone`,
			]
		),
	],
};
