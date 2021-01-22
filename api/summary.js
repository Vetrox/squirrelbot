import * as constants from "./constants.js"; // like the logger etc etc.
import * as functions from "./functions.js"; // like the initializers
import * as errors from "./errors/summary.js";
import * as utility from "./utility/summary.js";
import * as commands from "./commands/summary.js";
import * as databases from "./databases/summary.js";
import * as configs from "./configs/summary.js";


module.exports = {
	utility,
	commands,
	databases,
	configs,
	errors,
	constants,
	functions,
};