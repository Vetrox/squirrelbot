const fs = require('fs');

function logMessage(message) {
    const date = Date().toString();

    const logMessage = date + ': ' + message;
    console.log(logMessage);
    fs.appendFileSync('log.txt', logMessage + '\n');
}

module.exports.logMessage = logMessage;
