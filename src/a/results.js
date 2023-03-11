const { SlashCommandBuilder } = require('@discordjs/builders');

const cmdName = 'results';
const cmdDescription = 'Will show the results of a specified race';

module.exports = {
	name: cmdName,
	description: cmdDescription,

	data: new SlashCommandBuilder()
		.setName(cmdName)
		.setDescription(cmdDescription)
		.addIntegerOption(option =>
			option.setName('season')
				.setDescription('The season you want to see the results of')
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('round')
				.setDescription('The round you want to see the results of')
				.setRequired(true)),


	async execute (interaction) {
		const requestedSeason = interaction.options.getInteger('season');
		const requestedRound = interaction.options.getInteger('round');

		//Format and send the results for the specified race
		//Get the latest race season & round
		let rawdbData = interaction.client.fs.readFileSync(interaction.client.dblocation);
		let dbData = JSON.parse(rawdbData);

		//Check season argument is valid
		if (isNaN(requestedSeason) || requestedSeason > dbData.cache.lastRace[0] || requestedSeason < 1950) {
			interaction.reply(`Sorry, that's not a valid year. Choose a season between 1950 and ${dbData.cache.lastRace[0]}`);
			return;
		}

		//If they asked for a round from this year, check against the latest round, if not, get number of rounds that year.
		if (requestedSeason == dbData.cache.lastRace[0]) {
			//Check round argument is valid
			if (isNaN(requestedRound) || requestedRound > dbData.cache.lastRace[1] || requestedRound < 1) {
				interaction.reply(`Sorry, that's not a valid round. Choose a round between 1 and ${dbData.cache.lastRace[1]}`);
				return;
			}
		}else {
			let url = `https://ergast.com/api/f1/${requestedSeason}.json`;
			//Get amount of rounds in that year
			let seasonData = await interaction.client.tiny.get({url});
			//Ensure the body isn't undefined
			if (seasonData[`body`].MRData === undefined) {
				interaction.reply("Failed to get the data");
				return;
			}
			let maxRound = seasonData[`body`].MRData.RaceTable.Races.length;

			//Check round argument is valid
			if (isNaN(requestedRound) || requestedRound > maxRound || requestedRound < 1) {
				interaction.reply(`Sorry, that's not a valid round. Choose a round between 1 and ${maxRound} for year ${requestedSeason}`);
				return;
			}
		}

		let url = `https://ergast.com/api/f1/${requestedSeason}/${requestedRound}/results.json`;
		interaction.client.tiny.get({url}, function (error, rawResponse) {
			if (error) throw new Error(error);

			//Ensure the body isn't undefined
			if (rawResponse.body.MRData === undefined) {
				interaction.reply("Failed to get the data");
				return;
			}
			let response = rawResponse.body.MRData.RaceTable.Races[0];

			//Construct block of text that has all drivers and their times in rows.
			let resultsText = ``;
			let resultsRow = ``;
			for (let i = 0;i<response.Results.length;i++) {
				resultsRow = ``;
				//Check if current driver has a ending place or has retired. Then add their place to the string.
				if (response.Results[i].positionText === "R") {
					//Say driver has retired instead of giving place number
					resultsRow += `Retired. `;
				}else if (response.Results[i].positionText === "N") {
					resultsRow += `Not Classifed. `
				}else {
					//If writing results for 1st, 2nd, or 3rd, don't use -th ending.
					if (i === 0) {
						resultsRow += `1st. `
					}else if (i === 1) {
						resultsRow += `2nd. `
					} else if (i === 2) {
						resultsRow += `3rd. `
					}else {
						resultsRow += `${response.Results[i].positionText}th. `
					}
				}

				//Next, add driver's name
				resultsRow += `${response.Results[i].Driver.givenName} ${response.Results[i].Driver.familyName} `

				//Now, get the number of characters that are in the string, and subtract it from 30 to get number of spaces to add
				let numSpacesNeeded = 30 - resultsRow.length;
				//Now add the number of spaces needed.
				for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
					resultsRow += ` `; //Add a single space
				}

				//Finally, their time statistics
				if (response.Results[i][`status`] === "Finished") {
					//Check if they have a time (Some old races don't have times for all drivers)
					if (response.Results[i].Time != undefined) {
						//If they finished all laps, then add lap time/time behind 1st place
						resultsRow += `${response.Results[i].Time[`time`]}`;
					}else {
						resultsRow += `No Time`;
					}
				}else if (response.Results[i][`status`].charAt(0) === "+") {
					//If they were lapped, (indicated by their status being +1 lap, +2 laps, etc), then add their lapped status
					resultsRow += `${response.Results[i][`status`]}`;
				}else {
					//In this case, they had a specific problem with something
					resultsRow += `Problem - ${response.Results[i][`status`]}`;
				}

				//Add this row to results text, and repeat
				resultsText += resultsRow + `\n`;
			}

			let raceEmbed = new interaction.client.EmbedBuilder()
				.setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
				.setColor(0xFF1801)
				.setTitle(`${response.season} F1 ${response.raceName}`)
				.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
				.addFields({name:"Results", value:`\`\`\`${resultsText}\`\`\``, inline: false})
				.setFooter({text:`Information provided by Ergast`})

			//Now send the information
			interaction.reply({embeds: [raceEmbed]});
		});
	}
};

/*

module.exports = {
	name: 'results',
	description: 'Will show the results of a specified race',
	usage: `<results [season] [round]`,
	category: "general",
	guildOnly: false,
	async execute(message,args,client) {
		//Get latest race season & round
		let rawdbData = client.fs.readFileSync(client.dblocation);
		let dbData = JSON.parse(rawdbData);

		let requestedSeason = Math.floor(args[0]);
		let requestedRound = Math.floor(args[1]);

		//Check season argument is valid
		if (isNaN(requestedSeason) || requestedSeason > dbData.cache.lastRace[0] || requestedSeason < 1950) {
			message.reply(`Sorry, that's not a valid year. Choose a season between 1950 and ${dbData.cache.lastRace[0]}`);
			return;
		}

		//If they asked for a round from this year, check against latest round, if not, get number of rounds that year.
		if (requestedSeason == dbData.cache.lastRace[0]) {
			//Check round argument is valid
			if (isNaN(requestedRound) || requestedRound > dbData.cache.lastRace[1] || requestedRound < 1) {
				message.reply(`Sorry, that's not a valid round. Choose a round between 1 and ${dbData.cache.lastRace[1]}`);
				return;
			}
		}else {
			let url = `http://ergast.com/api/f1/${args[0]}.json`;
			//Get amount of rounds in that year
			let seasonData = await client.tiny.get({url});
			let maxRound = seasonData[`body`].MRData.RaceTable.Races.length;

			//Check round argument is valid
			if (isNaN(requestedRound) || requestedRound > maxRound || requestedRound < 1) {
				message.reply(`Sorry, that's not a valid round. Choose a round between 1 and ${maxRound} for year ${requestedSeason}`);
				return;
			}
		}

		let url = `http://ergast.com/api/f1/${requestedSeason}/${requestedRound}/results.json`;
		client.tiny.get({url}, function (error, rawResponse) {
			if (error) throw new Error(error);

			let response = rawResponse.body.MRData.RaceTable.Races[0];

			//Construct block of text that has all drivers and their times in rows.
			let resultsText = ``;
			let resultsRow = ``;
			for (let i = 0;i<20;i++) {
				resultsRow = ``;
				//Check if current driver has a ending place or has retired. Then add their place to the string.
				if (response.Results[i].positionText == "R") {
					//Say driver has retired instead of giving place number
					resultsRow += `Retired. `;
				}else if (response.Results[i].positionText == "N") {
					resultsRow += `Not Classifed. `
				}else {
					//If writing results for 1st, 2nd, or 3rd, don't use -th ending.
					if (i == 0) {
						resultsRow += `1st. `
					}else if (i == 1) {
						resultsRow += `2nd. `
					} else if (i == 2) {
						resultsRow += `3rd. `
					}else {
						resultsRow += `${response.Results[i].positionText}th. `
					}
				}

				//Next, add driver's name
				resultsRow += `${response.Results[i].Driver.givenName} ${response.Results[i].Driver.familyName} `

				//Now, get the number of characters that are in the in the string, and subtract it from 30 to get number of spaces to add
				let numSpacesNeeded = 30 - resultsRow.length;
				//Now add the number of spaces needed.
				for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
					resultsRow += ` `; //Add a single space
				}

				//Finally, their time statistics
				if (response.Results[i][`status`] == "Finished") {
					//Check if they have a time (Some old races don't have times for all drivers)
					if (response.Results[i].Time != undefined) {
						//If they finished all laps, then add lap time/time behind 1st place
						resultsRow += `${response.Results[i].Time[`time`]}`;
					}else {
						resultsRow += `No Time`;
					}
				}else if (response.Results[i][`status`].charAt(0) == "+") {
					//If they were lapped, (indicated by their status being +1 lap, +2 laps, etc), then add their lapped status
					resultsRow += `${response.Results[i][`status`]}`;
				}else {
					//In this case, they had a specific problem with something
					resultsRow += `Problem - ${response.Results[i][`status`]}`;
				}

				//Add this row to results text, and repeat
				resultsText += resultsRow + `\n`;
			}

			let raceEmbed = new client.MessageEmbed()
				.setAuthor({name:'F1 Steward',iconURL:'https://kimjammer.com/Portfolio/img/f1StewardLogo.png'})
				.setColor(0xFF1801)
				.setTitle(`${response.season} F1 ${response.raceName}`)
				.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
				.addField("Results", `\`\`\`${resultsText}\`\`\``, false)
				.setFooter({text:`Information provided by Ergast`})
				.setThumbnail("")

			//Now send the information
			message.channel.send({embeds:[raceEmbed]});
		});
	}
};
*/
