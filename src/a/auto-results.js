const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');

const cmdName = 'auto-results';
const cmdDescription = 'Sets the channel to post automatic results in';

module.exports = {
	name: cmdName,
	description: cmdDescription,

	data: new SlashCommandBuilder()
		.setName(cmdName)
		.setDescription(cmdDescription)
		.addStringOption(option =>
			option.setName('mode')
				.setDescription('Set or remove the channel')
				.setRequired(true)
				.addChoices(
					{ name: 'Set', value: 'set' },
					{ name: 'Remove', value: 'remove' },
				))
		.addChannelOption(option =>
			option.setName('channel')
				.setDescription('The channel to set/remove')
				.setRequired(true)),

	async execute(interaction) {
		const mode = interaction.options.getString('mode');
		const channel = interaction.options.getChannel('channel');

		if (channel.type !== ChannelType.GuildText) {
			interaction.reply("Sorry, but you can only set a text channel in a server.");
			return;
		}

		let rawdbData = interaction.client.fs.readFileSync(interaction.client.dblocation);
		let dbData = JSON.parse(rawdbData);

		if (mode === 'set') {
			//Sets the current channel ID as the value of the current server's ID.
			//Now the correct channel id can be found by looking up the guild id
			dbData.servers[`${interaction.guild.id}`] = channel.id;

			let dbDataToWrite = JSON.stringify(dbData);
			interaction.client.fs.writeFile(interaction.client.dblocation,dbDataToWrite, (err) => {
				if (err) throw err;
				interaction.reply(`This channel, <#${channel.id}>, has been set to automatically receive race results!`);
			});
		}else if (mode === 'remove') {
			//Delete the property:value pair from the database.
			delete dbData.servers[`${interaction.guild.id}`];

			let dbDataToWrite = JSON.stringify(dbData);
			interaction.client.fs.writeFile(interaction.client.dblocation,dbDataToWrite, (err) => {
				if (err) throw err;
				interaction.reply(`This channel, <#${channel.id}>, will no longer receive race results!`);
			});
		}

	}
};

/*

module.exports = {
	name: 'autoResults',
	description: 'Sets the channel to post automatic results in',
	usage: `<autoResults [set,remove]`,
	category: "general",
	guildOnly: true,
	async execute(message,args,client) {
		let rawdbData = client.fs.readFileSync(client.dblocation);
		let dbData = JSON.parse(rawdbData);

		if (args[0] == "set") {
			//Sets the current channel ID as the value of the current server's ID.
			//Now the correct channel id can be found by lookin gup the guild id
			dbData.servers[`${message.guild.id}`] = message.channel.id

			let dbDataToWrite = JSON.stringify(dbData);
			client.fs.writeFile(client.dblocation,dbDataToWrite, (err) => {
				if (err) throw err;
				message.channel.send(`This channel, <#${dbData.servers[`${message.guild.id}`]}>, has been set to automatically recieve race results!`);
			});
		}else if (args[0] == "remove") {
			//Delete the property:value pair from the database.
			delete dbData.servers[`${message.guild.id}`];

			let dbDataToWrite = JSON.stringify(dbData);
			client.fs.writeFile(client.dblocation,dbDataToWrite, (err) => {
				if (err) throw err;
				message.channel.send(`This channel, <#${dbData.servers[`${message.guild.id}`]}>, will no longer receive race results!`);
			});
		}else {
			message.channel.send("Please say \`<autoResults set\` to make this channel get automatic results or \`<autoResults remove\` to stop getting automatic results.");
		}
	}
};
*/

/*
const exampleDataBase = {
	"servers":
		{
			"serverid": "channelid",
			"serverid": "channelid"
		},
	"cache":
		{
			"lastRace":[2021,4] //This is Race season 2021, round(aka race) 4
			"lastQualifying": [2021,4,3] //[Race Season, round, Qualifying Number (Q1,Q2,Q3)]
		}
}
*/
