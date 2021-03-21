const { MongoConnection } = require ('../../mongo_client');

handleDeleteArea = async (message, client) => {
    // check permissions (user has to be owner)
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.channel.send('You do not have permission to execute this command.');
        return;
    }

    // delete all user categories
    const db = await MongoConnection.open();
    const categoryCollection = db.collection('private_categories');
    const categories = await categoryCollection
        .find({ owner_id: message.author.id })
        .toArray();

    for (category of categories) {
        await message.guild.channels.resolve(category.category_id).delete();
        console.log(`Deleted category with id ${category.category_id}.`);
    }

    await categoryCollection.deleteMany({ owner_id: message.author.id });

    await message.channel.send('All areas deleted.');
}

module.exports = { handleDeleteArea };
