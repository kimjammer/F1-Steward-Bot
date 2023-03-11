const { SlashCommandBuilder } = require('@discordjs/builders');

const cmdName = 'server';
const cmdDescription = 'Provides interesting information about the server';

module.exports = {
    name: cmdName,
    description: cmdDescription,
    usage: `?server`,
    category: "general",
    guildOnly: true,

    data: new SlashCommandBuilder()
        .setName(cmdName)
        .setDescription(cmdDescription),

    async execute(interaction) {
        const date_obj = new Date();
        let crr_guild = interaction.guild;

        let guild_general_info = `Created on: ${crr_guild.createdAt.toDateString()} 
        ID: ${crr_guild.id}
        Owner ID/: ${crr_guild.ownerId}`;

        let guild_channels_info = `Categories: ${crr_guild.channels.cache.filter(channel => channel.type === "category").size}
        Text Channels: ${crr_guild.channels.cache.filter(channel => channel.type === "text").size}
        Voice Channels: ${crr_guild.channels.cache.filter(channel => channel.type === "voice").size}`

        let guild_nitro_info = `Nitro Level: ${crr_guild.premiumTier}
        Boosts:  ${crr_guild.premiumSubscriptionCount}`

        const embed = new interaction.client.EmbedBuilder() //this is Discord.MessageEmbed but put into client for easy access
            .setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
            .setColor(0xFF1801)
            .setTitle(`Information about ${crr_guild}`)
            .addFields({name: 'General Info', value: guild_general_info},
                {name: 'Channel Count', value: guild_channels_info},
                {name: 'Nitro Info', value: guild_nitro_info})
            .setFooter({text:`Information fetched on: ${date_obj.toDateString()}`, iconURL: crr_guild.iconURL()})
            .setThumbnail(crr_guild.iconURL())

        interaction.reply({embeds:[embed]});
    }
};
