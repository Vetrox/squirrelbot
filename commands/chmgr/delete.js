const { MongoConnection } = require ('../../mongo_client');

handleDelete = async (message, args) => {
    // check permissions (user has to be owner OR administrator)
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        const db = await MongoConnection.open();
        const channelCollection = db.collection('private_channels');
        const channel = await channelCollection
            .findOne({ channel_id: args.channel.id });

        if (message.author.id != channel?.owner_id) {
            console.log('You can only delete channels you created yourself.');
            await message.channel.send('You can only delete channels you created yourself.');
            return;
        }
    }

    // delete channel
    await args.channel.delete();

    // update database
    await channelCollection.deleteMany({channel_id: args.channel.id});

    message.channel.send(`Channel ${args.channel.name} deleted!`);
}

module.exports = { handleDelete };
