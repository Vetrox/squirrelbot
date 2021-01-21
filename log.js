const winstonLoggerConf = require("winston");
require("winston-daily-rotate-file");
const {format, transports} = require("winston");

const logger = function(filename) {
	return new winstonLoggerConf.createLogger({
		transports: [
			new transports.Console({
				level: "info",
				colorize: true,
				format: format.combine(
					format.timestamp({
						format: "YYYY-MM-DD HH:mm:ss",
					}),
					format.printf(info => `${info.timestamp} ${formatFilename(filename)} [${info.level}]: ${info.message}`)
				)
			}),
			new transports.DailyRotateFile({
				filename: "./logs/%DATE%-standard.log",
				maxSize: "1g",
				maxDays: "3d",
				zippedArchive: true,
				datePattern: "YYYY-MM-DD",
				format: format.combine(
					format.timestamp({
						format: "YYYY-MM-DD HH:mm:ss"
					}),
					format.printf(info => `${info.timestamp} ${formatFilename(filename)} [${info.level}]: ${info.message}`)
				)
			})
		],
		exitOnError: false,
	});
};

function formatFilename(filename) {
	let maxFilenameLength = 8;
	let trimmedFilename =
		filename.length > maxFilenameLength
			? filename.substring(0, maxFilenameLength - 2) + ".."
			: filename;
	trimmedFilename = `[${trimmedFilename}]`;
	trimmedFilename = trimmedFilename.padEnd(maxFilenameLength + 2, " ");
	return trimmedFilename;
}

module.exports = logger;