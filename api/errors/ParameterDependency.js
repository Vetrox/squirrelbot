const Command = require("./Command");

module.exports = class ParameterDependency extends Command {
	constructor(param, depends) {
		super(
			`Der Parameter ${param} hängt vom Parameter ${depends} ab, der so konfiguriert ist, dass er nicht standardmäßig initialisiert wird`
		);
	}
};