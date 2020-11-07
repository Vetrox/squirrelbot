const fs = require("fs");
const util = require("util");
const path = require("path");
/**
	Logs the message to the console using the console.log() command. Also saves the message at the end of the log.txt file
**/
function logMessage(message) {
	let filename = getCallerFile();
	filename = filename.substring(0, filename.length-3);
	let length = 8;
	let trm =
		filename.length > length
			? filename.substring(0, length - 2) + ".."
			: filename;
	trm = `[${trm}]`;
	trm = trm.padEnd(length+2, ' ');
	const m = `${DDMMYYYYHHMMSS()} ${trm} ${message}`;
	console.log(m);
	fs.appendFileSync("log.txt", m + "\n");
}

function DDMMYYYYHHMMSS() {
	const date = new Date();
	return `${date.getDate()}/${
		date.getMonth() + 1
	}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`.padEnd(19, ' ');
}

/**
	Logs the message only to the console. This is better than console.log(), beacause it shows infinite depth.
**/
function logC(obj) {
	console.log(util.inspect(obj, false, null, true));
}

function getCallerFile() {
	try {
		let err = new Error();
		let callerfile;
		let currentfile;

		Error.prepareStackTrace = function (err, stack) {
			return stack;
		};

		currentfile = err.stack.shift().getFileName();

		while (err.stack.length) {
			callerfile = err.stack.shift().getFileName();

			if (currentfile !== callerfile) return path.basename(callerfile);
		}
	} catch (err) {}
	return undefined;
}

module.exports = {
	logMessage,
	logC,
};
