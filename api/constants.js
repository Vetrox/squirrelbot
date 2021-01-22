const {prefix} = require("../config.json");
module.exports.prefix = prefix;
module.exports.wait = require("util").promisify(setTimeout); //async wait