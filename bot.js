const { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } = require('discord-akairo');

// read in secret bot token
require('dotenv').config({path: __dirname + '/.credentials/.env'})

class Squirrelbot extends AkairoClient {
    constructor() {
        super({
            ownerID: '233599437635584000'
        }, {
            disableMentions: 'everyone'
        });

        // commands are executed by users and do useful stuff (in most cases)
        this.commandHandler = new CommandHandler(this, {
            directory: './commands/',
            prefix: '!',
            automateCategories: true
        });

        // inhibitors block certain messages from reaching the command handler
        this.inhibitorHandler = new InhibitorHandler(this, {
            directory: './inhibitors/'
        });

        // listeners allow responding to certain events
        this.listenerHandler = new ListenerHandler(this, {
            directory: './listeners/'
        });

        this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
        this.commandHandler.useListenerHandler(this.listenerHandler);

        this.inhibitorHandler.loadAll();
        this.listenerHandler.loadAll();
        this.commandHandler.loadAll();
    }
}

const squirrelbot = new Squirrelbot();
squirrelbot.login(process.env.BOT_TOKEN);
