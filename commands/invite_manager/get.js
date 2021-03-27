const { MongoConnection } = require('../../mongo_client');
const discord = require('discord.js');

handleGet = async (message, args) => {
    const db = await MongoConnection.open();
    const inviteCollection = db.collection('invite_manager');
    let embed;

    // if no url is given, dump everything
    if (!args.url) {
        const entries = await inviteCollection.find({}).toArray();
        let embedString = '';
        for (let entry of entries) {
            embedString += `${entry.url} - ${await message.guild.roles.resolve(entry.role_id)}\n`;
        }

        embed = new discord.MessageEmbed()
            .setTitle('Invite manager')
            .addField('Entries', embedString);
    } else {
        const entry = await inviteCollection.findOne({ url: args.url.href });
        console.log(entry);
        if (!entry) {
            await message.channel.send('No entry found.');
            return;
        }

        embed = new discord.MessageEmbed()
            .setTitle('Invite manager')
            .addField('Entry', `URL ${entry.url} is assigned to role ${message.guild.roles.resolve(entry.role_id)}.`);
    }

    await message.channel.send(embed);
}

module.exports = { handleGet };
