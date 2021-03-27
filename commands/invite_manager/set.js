const { MongoConnection } = require('../../mongo_client');

handleSet = async (message, args) => {
    // check arguments
    if (!args.url) {
        await message.channel.send('No URL specified.');
        return;
    }

    if (!args.role) {
        await message.channel.send('No role specified.');
        return;
    }

    console.log(args);
    const db = await MongoConnection.open();
    const inviteCollection = db.collection('invite_manager');
    await inviteCollection.updateOne({url: args.url.href},
        {$set: {role_id: args.role.id}},
        {upsert: true});

    await message.channel.send(`URL ${args.url.href} assigned to role ${args.role.id}.`);
}

module.exports = { handleSet };
