module.exports = {
    name: 'server',
    description: 'Provides information about the server',
    usage: `<server`,
    category: "general",
    guildOnly: true,
    execute(message,args,client) {
        const date_obj = new Date();
        let crr_guild = message.guild;

        let guild_general_info = `Created on: ${crr_guild.createdAt.toDateString()} 
        ID: ${crr_guild.id}
        Owner: ${crr_guild.owner.user.tag}
        Region: \`${crr_guild.region}\``;

        let guild_channels_info = `Categories: ${crr_guild.channels.cache.filter(channel => channel.type == "category").size}
        Text Channels: ${crr_guild.channels.cache.filter(channel => channel.type == "text").size}
        Voice Channels: ${crr_guild.channels.cache.filter(channel => channel.type == "voice").size}`

        let guild_nitro_info = `Nitro Level: ${crr_guild.premiumTier}
        Boosts:  ${crr_guild.premiumSubscriptionCount}`

        const embed = new client.MessageEmbed() //this is Discord.MessageEmbed but put into client for easy access
            .setAuthor('F1 Steward','https://kimjammer.github.io/Portfolio/img/f1StewardLogo.png')
            .setColor(0x003ea1)
            .setTitle(`Information about ${crr_guild}`)
            .addField("General Info", guild_general_info, false)
            .addField("Channel Count", guild_channels_info, false)
            .addField("Nitro Info", guild_nitro_info, false)
            .setFooter(`Information fetched on: ${date_obj.toDateString()}`,crr_guild.iconURL())
            .setThumbnail(crr_guild.iconURL())

        message.channel.send(embed);
    }
};
