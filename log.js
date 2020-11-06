const fs = require("fs");
const util = require("util");

/**
	Logs the message to the console using the console.log() command. Also saves the message at the end of the log.txt file
**/
function logMessage(message) {
  const date = Date().toString();

  const logMessage = date + ": " + message;
  console.log(logMessage);
  fs.appendFileSync("log.txt", logMessage + "\n");
}

/**
	Logs the message only to the console. This is better than console.log(), beacause it shows infinite depth.
**/
function logC(obj) {
  console.log(util.inspect(obj, false, null, true));
}

module.exports.logMessage = logMessage;
module.exports.logC = logC;
