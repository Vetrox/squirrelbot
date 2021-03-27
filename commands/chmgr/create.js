const { MongoConnection } = require('../../mongo_client');

handleCreate = async (message, args) => {
    // check permissions
    if (!message.member.permissions.has("ADMINISTRATOR")) {
        await message.channel.send('You do not have permission to execute this command.');
        return;
    }

    // create channel
    let options = {
        type: args.type
    };

    if (args.parent) {
        options.parent = args.parent;
    }

    try {
        let channel = await message.guild.channels.create(args.name, options);
    } catch (err) {
        await message.channel.send('Could not create channel. Please check your arguments.');
        return;
    }

    // update database
    const db = await MongoConnection.open();
    const channelCollection = db.collection('private_channels');
    channelCollection.insertOne({ channel_id: channel.id, owner_id: message.author.id });

    message.channel.send(`Channel ${args.name} created!`);
}

module.exports = { handleCreate };
