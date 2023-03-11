const { SlashCommandBuilder } = require('@discordjs/builders');

const cmdName = 'stats';
const cmdDescription = 'Provides interesting information about the bot';

module.exports = {
    name: cmdName,
    description: cmdDescription,
    usage: `?stats`,
    category: "general",
    guildOnly: false,

    data: new SlashCommandBuilder()
        .setName(cmdName)
        .setDescription(cmdDescription),

    async execute(interaction) {
        const date_obj = new Date();

        //Get information from package.json file
        const {version} = require('../package.json');

        function msToHumanReadable( ms ) {
            // 1- Convert to seconds:
            let seconds = ms / 1000;
            // 2 - Extract days
            let days = parseInt(seconds / 86400);
            seconds = seconds % 86400;
            // 3- Extract hours:
            let hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
            seconds = seconds % 3600; // seconds remaining after extracting hours
            // 4- Extract minutes:
            let minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
            // 5- Keep only seconds not extracted to minutes:
            seconds = Math.floor(seconds % 60);
            return( days + " d: " + hours+" h: "+minutes+" m: "+seconds +" s");
        }


        let stats_general_info = `Created on: ${interaction.client.user.createdAt.toDateString()} 
        ID: ${interaction.client.user.id}
        Number of Commands: ${interaction.client.commands.size}
        Version: ${version}
        Creator: KimJammer#4819`;

        let stats_usage_info = `Servers: ${interaction.client.guilds.cache.size}
        Channels: ${interaction.client.channels.cache.size}`

        let stats_softwareHardware_info = `Discord.js Version: 14.7.1
        Node Version: ${process.version}
        Operating System: Ubuntu Server 20.04 LTS
        Uptime: ${msToHumanReadable(interaction.client.uptime)}`

        const embed = new interaction.client.EmbedBuilder() //this is Discord.MessageEmbed but put into client for easy access
            .setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
            .setColor(0xFF1801)
            .setTitle(`Statistics about F1 Steward bot`)
            .addFields(
                {name: 'General Info', value: stats_general_info},
                {name: 'Usage Info', value: stats_usage_info},
                {name: 'Software & Hardware Info', value: stats_softwareHardware_info})
            .setFooter({text:`Information fetched on: ${date_obj.toDateString()}`})
            .setThumbnail("https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png")

        interaction.reply({embeds: [embed]});
    }
};
