const { MongoConnection } = require ('../../mongo_client');

handleDeleteArea = async (message, args) => {
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
