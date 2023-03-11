const { SlashCommandBuilder } = require('@discordjs/builders');

const cmdName = 'ping';
const cmdDescription = 'Will show the ping time in milliseconds';

module.exports = {
	name: cmdName,
	description: cmdDescription,
	usage: `?ping`,
	category: "general",
	guildOnly: false,

	data: new SlashCommandBuilder()
		.setName(cmdName)
		.setDescription(cmdDescription),

	async execute (interaction) {
		await interaction.reply(`pong! The ping time is ${interaction.client.ws.ping}.`);
	}
};
