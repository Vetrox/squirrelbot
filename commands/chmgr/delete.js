const { MongoConnection } = require ('../../mongo_client');

handleDelete = async (message, args) => {
    // check permissions (user has to be owner)
    const db = await MongoConnection.open();
    const channelCollection = db.collection('private_channels');
    const channels = await channelCollection
        .find({ channel_id: args.channel.id })
        .toArray();

    if (message.author.id != channels[0]?.owner_id) {
        console.log('You can only delete channels you created yourself.');
        await message.channel.send('You can only delete channels you created yourself.');
        return;
    }

    // delete channel
    try {
        await args.channel.delete();
    } catch (err) {
        message.channel.send('Something went wrong.');
        // TODO add proper log
        console.error(err);
        return;
    }

    // update database
    await channelCollection.deleteMany({channel_id: args.channel.id});

    message.channel.send(`Channel ${args.channel.name} deleted!`);
}

module.exports = { handleDelete };
