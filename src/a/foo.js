const { SlashCommandBuilder } = require('@discordjs/builders');

const cmdName = 'foo';
const cmdDescription = 'bar';

module.exports = {
	name: cmdName,
	description: cmdDescription,
	usage: `?foo`,
	category: "fun",
	guildOnly: false,

	data: new SlashCommandBuilder()
		.setName(cmdName)
		.setDescription(cmdDescription),

	async execute (interaction) {
		await interaction.reply('bar');
	}
};
