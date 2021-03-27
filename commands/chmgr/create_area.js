const { MongoConnection } = require ('../../mongo_client');

handleCreateArea = async (message, args) => {
    // check permissions
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.channel.send('You do not have permission to execute this command.');
        return;
    }

    // check if user already has an area
    const db = await MongoConnection.open();
    const categoryCollection = db.collection('private_categories');
    const categories = await categoryCollection
        .find({ owner_id: message.author.id })
        .toArray();

    if (categories.length > 0) {
        await message.channel.send('You already have an area. Use that instead!');
        return;
    }

    // create category
    let options = {
        type: 'category',
        permissionOverwrites:  [
            {
                id: message.guild.roles.everyone,
                deny: ['VIEW_CHANNEL', 'CONNECT'], // quote: Disabling this (both) will make voice channels also private.
            }
        ]
    };

    let category;
    try {
        category = await message.guild.channels.create(args.name, options);
    } catch (err) {
        await message.channel.send('Could not create category. Please check your arguments.');
        return;
    }

    // update database
    categoryCollection.insertOne({ category_id: category.id, owner_id: message.author.id })

    message.channel.send(`Area ${args.name} created!`);
}

module.exports = { handleCreateArea };
