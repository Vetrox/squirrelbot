const discord = require('discord.js');
const { Command, Argument } = require('discord-akairo');

const { handleGet } = require('./get');
const { handleSet } = require('./set');

class InviteManagerCommand extends Command {
    constructor() {
        super('invite_manager', {
            aliases: ['invite_manager'],
            clientPermissions: ['MANAGE_GUILD'],
            userPermissions: ['MANAGE_GUILD']
        });
    }

    *args() {
        const sub = yield {
            type: ['get', 'set']
        };

        switch (sub) {
            case 'set': {
                const url = yield { id: 'link', type: 'url' };
                const role = yield { id: 'role', type: 'role' };
                return { sub, url, role };
            }

            case 'get': {
                const url = yield { id: 'link', type: 'url' };
                return { sub, url };
            }
        }

        return { sub };
    }

    async exec(message, args) {
        if (!args.sub) {
            await message.channel.send('You need to give me a subcommand.');
            return;
        }

        try {
            switch (args.sub) {
                case 'get':
                    await handleGet(message, args);
                    break;
                case 'set':
                    await handleSet(message, args);
                    break;
            }
        } catch (err) {
            await message.channel.send('Something went wrong. Please check your arguments.');
            // TODO add proper log
            console.error(`ERROR in invite_manager.js: ${err}`);
        }
    }
}

module.exports = InviteManagerCommand;
