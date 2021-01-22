export const { prefix } = require("../config.json");
export const wait = require("util").promisify(setTimeout); //async wait