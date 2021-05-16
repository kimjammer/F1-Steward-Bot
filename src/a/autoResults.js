module.exports = {
	name: 'autoResults',
	description: 'Sets the channel to post automatic results in',
	usage: `<autoResults [set,remove]`,
	category: "general",
	guildOnly: false,
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
				message.channel.send(`This channel, <#${dbData.servers[`${message.guild.id}`]}>, has been set to automatically race results!`);
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
			message.channel.send("That's not a valid argument, please add 'set' to make this channel get automatic results or 'remove' to stop getting automatic results.");
			return;
		}
	}
};

/*
const exampleDataBase = {
	"servers":
		{
			"serverid": "channelid",
			"serverid": "channelid"
		},
	"cache":
		{
			"lastRace":[2021,4]
			"lastQualifying": [2021,4]
		}
}
*/