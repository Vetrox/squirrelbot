const discord = require('discord.js');
const { Command, Argument } = require('discord-akairo');

const { handleCreate } = require('./create');
const { handleDelete } = require('./delete');
const { handleCreateArea } = require('./create_area');
const { handleDeleteArea } = require('./delete_area');

class ChmgrCommand extends Command {
    constructor() {
        super('chmgr', {
            aliases: ['chmgr']
        });
    }

    *args() {
        const sub = yield {
            type: ['create', 'create_area', 'delete_area', 'invite', 'delete', 'config'],
        };

        switch (sub) {
            case 'create': {
                const name      = yield { id: 'name' };
                const type      = yield { id: 'type', type: ['text', 'voice'], default: 'text' };
                const parent    = yield { id: 'parent', };
                return { sub, name, type, parent };
            }

            case 'delete': {
                const channel   = yield { id: 'channel', type: 'channel' };
                return { sub, channel };
            }

            case 'create_area': {
                const name          = yield { id: 'name' };
                return { sub, name }
            }
        }

        return { sub };
    }

    async exec(message, args) {
        if (!args.sub) {
            await message.channel.send('What is my purpose');
            return;
        }

        try {
            switch (args.sub) {
                case 'create':
                    await handleCreate(message, args);
                    break;
                case 'delete':
                    await handleDelete(message, args);
                    break;
                case 'create_area':
                    await handleCreateArea(message, args);
                    break;
                case 'delete_area':
                    await handleDeleteArea(message, this.client);
                    break;
            }
        } catch (err) {
            await message.channel.send('Something went wrong. Did you forget some arguments?');
            // TODO add proper log
            console.error(err);
        }
    }
}

module.exports = ChmgrCommand;
