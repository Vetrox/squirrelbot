const { MongoConnection } = require ('../../mongo_client');

handleInvite = async (message, args) => {
    if (!args.user) {
        await message.channel.send('No user specified.');
        return;
    }

    // get category
    const db = await MongoConnection.open();
    const categoryCollection = db.collection('private_categories');
    const category = await categoryCollection.findOne({ owner_id: message.author.id });
    if (!category) {
        await message.channel.send('You need to create an area first!');
        return;
    }

    const ds_category = await message.guild.channels.resolve(category.category_id);
    const hasPermission = args.remove == 'add';
    await ds_category.updateOverwrite(args.user.id, {
        'VIEW_CHANNEL': hasPermission,
        'CONNECT': hasPermission
    });

    if (args.remove == 'add')
        await message.channel.send(`Added user ${args.user}!`);
    else
        await message.channel.send(`Removed user ${args.user}!`);
}

module.exports = { handleInvite };
