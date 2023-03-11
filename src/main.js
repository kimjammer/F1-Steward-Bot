const {Client, IntentsBitField, MessageAttachment, ReactionCollector, Events, EmbedBuilder} = require('discord.js');

const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildEmojisAndStickers, IntentsBitField.Flags.GuildIntegrations, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.GuildMessageReactions, IntentsBitField.Flags.DirectMessages, IntentsBitField.Flags.DirectMessageReactions);
const client = new Client({intents: myIntents});

client.attachment = MessageAttachment;
client.EmbedBuilder = EmbedBuilder;
client.ReactionCollector = ReactionCollector;

const regCmds = require('./deployCommands.js');
regCmds.run(true);

const tiny = require('tiny-json-http');
client.tiny = tiny // Moving tiny module into client for easy access.

const Systime = require('systime');
const systime = new Systime();

const fs = require('fs');
client.fs = fs; // Moving fs into client for access from commands.

const path = require('path');
client.path = path // Moving path module into client as well

//This code checks whether diri is running in normal node.js or docker, so it knows where it should look for/put its database.
//Check if the path that is autocreated by docker exists.
let dblocation = '/dbs/f1bot'; //This assumes that you don't have the folder Diri in folder dbs in your root directory. (Extremely unlikely, so it works)
let dirName = path.dirname(dblocation);
//If the path does not exist then we are running as node application!
if (!fs.existsSync(dirName)) {
	console.log("Running on basic Node.js detected.")
	//Now check if the file exists at predicted node location
	dblocation = path.join(__dirname,'..','databases','botData.json')
	//If the database doesn't exist, create it.
	if (!fs.existsSync(dblocation)) {
		const newYear = new Date().getFullYear();
		fs.writeFileSync(dblocation,
			JSON.stringify({
			servers: {},
			cache:
				{
					"lastRace":[newYear.toString(),"0"],
					"lastQualifying": [newYear.toString(),"0",3],
					"lastSprint": [newYear.toString(),"0"]
				}
			}));
	}
}else{
	console.log("Running in docker detected.");
	//Now check if the file exists at the predicted docker location
	dblocation = path.join('/dbs/f1bot/botData.json');
	//If the database doesn't exist, create it.
	if (!fs.existsSync(dblocation)) {
		const newYear = new Date().getFullYear();
		fs.writeFileSync(dblocation,
			JSON.stringify({
				servers: {},
				cache:
					{
						"lastRace":[newYear.toString(),"0"],
						"lastQualifying": [newYear.toString(),"0",3],
						"lastSprint": [newYear.toString(),"0"]
					}
			}));
	}
}
//put dblocation into client for easy access
client.dblocation = dblocation;

const {token} = require('./config.json');

client.commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname,'a')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./a/${file}`);
	client.commands.set(command.name.toLowerCase(), command);
}

client.on('ready', () => {
	console.log('F1 Steward is online');
	client.user.setActivity("the cars race by",{type: "LISTENING"});

	//When bot starts check for new results
	try {
		checkNewRaceResults();
		checkNewQualsResults();
		checkNewSprintResults();
	}catch(e) {
		console.log(e)
	}
	
});

//Every Hour, Check for a new race result and if there is one, post it.
systime.on('hour', () => {
	try {
		checkNewRaceResults();
		checkNewQualsResults();
		checkNewSprintResults();
	}catch(e) {
		console.log(e)
	}
});

//When a new year starts, reset the database cache so it can handle the new f1 season.
const resetDatabaseCache = () => {
	console.log("Resetting database cache.");
	let rawdbData = client.fs.readFileSync(client.dblocation);
	let dbData = JSON.parse(rawdbData);
	const newYear = new Date().getFullYear();
	dbData.cache = {
		"lastRace":[newYear.toString(),"0"],
		"lastQualifying": [newYear.toString(),"0",3],
		"lastSprint": [newYear.toString(),"0"]
	}
	fs.writeFileSync(client.dblocation, JSON.stringify(dbData));
}
if (JSON.parse(client.fs.readFileSync(client.dblocation)).cache.lastRace[0] != new Date().getFullYear().toString()) {
	resetDatabaseCache();
}
systime.on('year', () => {
	resetDatabaseCache();
});

function checkNewRaceResults () {
	let url = "http://ergast.com/api/f1/current/last/results.json";

	tiny.get({url}, function (error, rawResponse) {
		if (error) {
			console.log(error);
			return;
		}

		//Response here
		//Get Currently displayed race season & round
		let rawdbData = client.fs.readFileSync(client.dblocation);
		let dbData = JSON.parse(rawdbData);

		//Ensure the body isn't undefined
		if (rawResponse.body.MRData === undefined) {
			console.log("Failed to get data.");
			return;
		}

		let response = rawResponse.body.MRData.RaceTable
		//If the latest race's season and round is the same as the one stored, escape function
		if (response.season == dbData.cache.lastRace[0] && response["round"] == dbData.cache.lastRace[1]) {
			return;
		}

		//If the code got to here, it means that there is new information available on the website.
		//Save the new latest season and round
		dbData.cache.lastRace = [response.season, response["round"]];
		let dbDataToWrite = JSON.stringify(dbData);
		client.fs.writeFileSync(client.dblocation,dbDataToWrite);

		//Narrow down definition of response so that it is only the specific race information
		response = response.Races[0];

		//Construct block of text that has all drivers and their times in rows.
		let resultsText = ``;
		let resultsRow = ``;
		for (let i = 0;i<response.Results.length;i++) {
			resultsRow = ``;
			//Check if current driver has a ending place or has retired. Then add their place to the string.
			if (response.Results[i].positionText == "R") {
				//Say driver has retired instead of giving place number
				resultsRow += `Retired. `;
			}else if (response.Results[i].positionText == "W") {
				//Say driver has retired instead of giving place number
				resultsRow += `Withdrawn. `;
			}else if (response.Results[i].positionText == "N") {
				resultsRow += `Not Classifed. `
			}else{
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

			//Now, get the number of characters that are in the string, and subtract it from 30 to get number of spaces to add
			let numSpacesNeeded = 30 - resultsRow.length;
			//Now add the number of spaces needed.
			for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
				resultsRow += ` `; //Add a single space
			}

			//Finally, their time statistics
			if (response.Results[i][`status`] == "Finished") {
				//If they finished all laps, then add lap time/time behind 1st place
				resultsRow += `${response.Results[i].Time[`time`]}`;
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

		let raceEmbed = new client.EmbedBuilder()
			.setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
			.setColor(0xFF1801)
			.setTitle(`${response.season} F1 ${response.raceName}`)
			.addFields({name:"Results", value:`\`\`\`${resultsText}\`\`\``, inline: false})
			.setFooter({text:`Information provided by Ergast`})

		//Now send the information to all channels that have autoResults
		for (const server in dbData.servers) {
			client.channels.cache.get(dbData.servers[`${server}`]).send({embeds:[raceEmbed]});
		}
	});
}

function checkNewQualsResults () {
	//Get Currently displayed race season & round
	let rawdbData = client.fs.readFileSync(client.dblocation);
	let dbData = JSON.parse(rawdbData);

	//I can't use /last/qualifying because that updates when the actual race happens. Instead, I check for the next round
	//manually.
	let url = `http://ergast.com/api/f1/${parseInt(dbData.cache.lastQualifying[0])}/${parseInt(dbData.cache.lastRace[1],10)+1}/qualifying.json`;

	tiny.get({url}, function (error, rawResponse) {
		if (error) {
			console.log(error);
			return;
		}

		//Response here
		//Ensure the body isn't undefined
		if (rawResponse.body.MRData === undefined) {
			console.log("Failed to get data.");
			return;
		}
		let response = rawResponse.body.MRData.RaceTable

		//Get the latest Qualifying round completed.
		let lastQualifying = 0;
		//This checks the time of the first place driver. If there is a value, then the that round was completed
		//If there is nothing in the races array, Q1 has not completed yet.
		if (response.Races.length == 0) {
			//There is no Data for this Qualifiers yet. (Qualifiers has not gone yet.)
			return;
		}else if (response.Races[0].QualifyingResults[0]['Q1'] && !response.Races[0].QualifyingResults[0]['Q2']) {
			//There is Data for up to Q1
			lastQualifying = 1;
		}else if (response.Races[0].QualifyingResults[0]['Q2'] && !response.Races[0].QualifyingResults[0]['Q3']) {
			//There is Data for up to Q2
			lastQualifying = 2;
		}else if (response.Races[0].QualifyingResults[0]['Q3']) {
			//There is Data for up to Q3
			lastQualifying = 3;
		}

		//If the latest race's season and round and latest qualifying round is the same as the one stored, escape function
		if (response.season == dbData.cache.lastQualifying[0] && response["round"] == dbData.cache.lastQualifying[1] && lastQualifying == dbData.cache.lastQualifying[2]) {
			return;
		}

		//If the code got to here, it means that there is new information available on the website.
		//Save the new latest season and round
		dbData.cache.lastQualifying = [response.season, response["round"],lastQualifying];
		let dbDataToWrite = JSON.stringify(dbData);
		client.fs.writeFileSync(client.dblocation,dbDataToWrite);

		//Narrow down definition of response so that it is only the specific race information
		response = response.Races[0];

		//If there is more info than the bot has posted so far, go through and post them all.
		let postedQualifying = 0
		while (lastQualifying > postedQualifying) {
			postedQualifying++;

			//Construct block of text that has all drivers and their times in rows.
			let resultsText = ``;
			let resultsRow = ``;
			for (let i = 0;i<response.QualifyingResults.length;i++) {
				resultsRow = ``;

				//If writing results for 1st, 2nd, or 3rd, don't use -th ending.
				if (i == 0) {
					resultsRow += `1st. `
				}else if (i == 1) {
					resultsRow += `2nd. `
				} else if (i == 2) {
					resultsRow += `3rd. `
				}else {
					resultsRow += `${response.QualifyingResults[i][`position`]}th. `
				}


				//Next, add driver's name
				resultsRow += `${response.QualifyingResults[i].Driver.givenName} ${response.QualifyingResults[i].Driver.familyName} `

				//Now, get the number of characters that are in the string, and subtract it from 30 to get number of spaces to add
				let numSpacesNeeded = 30 - resultsRow.length;
				//Now add the number of spaces needed.
				for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
					resultsRow += ` `; //Add a single space
				}

				//Finally, their time statistics
				if (postedQualifying == 1) {
					//Check if the driver did this Qualifying round
					if (response.QualifyingResults[i]['Q1']) {
						resultsRow += `${response.QualifyingResults[i]['Q1']}`;
					}else {
						resultsRow += `N/A`
					}
				}else if (postedQualifying == 2) {
					//Check if the driver did this Qualifying round
					if (response.QualifyingResults[i]['Q2']) {
						resultsRow += `${response.QualifyingResults[i]['Q2']}`;
					}else {
						resultsRow += `N/A`
					}
				}else if (postedQualifying == 3) {
					//Check if the driver did this Qualifying round
					if (response.QualifyingResults[i]['Q3']) {
						resultsRow += `${response.QualifyingResults[i]['Q3']}`;
					}else {
						resultsRow += `N/A`
					}
				}

				//Add this row to results text, and repeat
				resultsText += resultsRow + `\n`;
			}

			let raceEmbed = new client.EmbedBuilder()
				.setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
				.setColor(0xFF1801)
				.setTitle(`${response.season} F1 ${response.raceName} Qualifying ${postedQualifying}`)
				.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
				.addFields({name:"Results", value:`\`\`\`${resultsText}\`\`\``, inline: false})
				.setFooter({text:`Information provided by Ergast`})

			//Now send the information to all channels that have autoResults
			for (const server in dbData.servers) {
				client.channels.cache.get(dbData.servers[`${server}`]).send({embeds:[raceEmbed]});
			}
		}
	});
}

function checkNewSprintResults () {
	//Get Currently displayed race season & round
	let rawdbData = client.fs.readFileSync(client.dblocation);
	let dbData = JSON.parse(rawdbData);

	//I can't use /last/qualifying because that updates when the actual race happens. Instead, I check for the next round
	//manually.
	let url = `https://ergast.com/api/f1/${parseInt(dbData.cache.lastSprint[0])}/${parseInt(dbData.cache.lastRace[1],10)+1}/sprint.json`;

	tiny.get({url}, function (error, rawResponse) {
		if (error) {
			console.log(error);
			return;
		}

		//Response here
		//Ensure the body isn't undefined
		if (rawResponse.body.MRData === undefined) {
			console.log("Failed to get data.");
			return;
		}
		let response = rawResponse.body.MRData.RaceTable

		//If this round doesn't have a sprint race or if it hasn't happened yet, exit.
		if (response.Races.length == 0){
			return;
		}

		//If the latest race's season and round is the same as the one stored, escape function
		if (response.season == dbData.cache.lastSprint[0] && response["round"] == dbData.cache.lastSprint[1]) {
			return;
		}

		//If the code got to here, it means that there is new information available on the website.
		//Save the new latest season and round
		dbData.cache.lastSprint = [response.season, response["round"]];
		let dbDataToWrite = JSON.stringify(dbData);
		client.fs.writeFileSync(client.dblocation,dbDataToWrite);

		//Narrow down definition of response so that it is only the specific race information
		response = response.Races[0];

		//Construct block of text that has all drivers and their times in rows.
		let resultsText = ``;
		let resultsRow = ``;
		for (let i = 0;i < response.SprintResults.length; i++) {
			resultsRow = ``;
			//Check if current driver has a ending place or has retired. Then add their place to the string.
			if (response.SprintResults[i].positionText == "R") {
				//Say driver has retired instead of giving place number
				resultsRow += `Retired. `;
			}else if (response.SprintResults[i].positionText == "W") {
				//Say driver has retired instead of giving place number
				resultsRow += `Withdrawn. `;
			}else if (response.SprintResults[i].positionText == "N") {
				resultsRow += `Not Classifed. `
			}else{
				//If writing results for 1st, 2nd, or 3rd, don't use -th ending.
				if (i == 0) {
					resultsRow += `1st. `
				}else if (i == 1) {
					resultsRow += `2nd. `
				} else if (i == 2) {
					resultsRow += `3rd. `
				}else {
					resultsRow += `${response.SprintResults[i].positionText}th. `
				}
			}

			//Next, add driver's name
			resultsRow += `${response.SprintResults[i].Driver.givenName} ${response.SprintResults[i].Driver.familyName} `

			//Now, get the number of characters that are in the in the string, and subtract it from 30 to get number of spaces to add
			let numSpacesNeeded = 30 - resultsRow.length;
			//Now add the number of spaces needed.
			for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
				resultsRow += ` `; //Add a single space
			}

			//Finally, their time statistics
			if (response.SprintResults[i][`status`] == "Finished") {
				//If they finished all laps, then add lap time/time behind 1st place
				resultsRow += `${response.SprintResults[i].Time[`time`]}`;
			}else if (response.SprintResults[i][`status`].charAt(0) == "+") {
				//If they were lapped, (indicated by their status being +1 lap, +2 laps, etc), then add their lapped status
				resultsRow += `${response.SprintResults[i][`status`]}`;
			}else {
				//In this case, they had a specific problem with something
				resultsRow += `Problem - ${response.SprintResults[i][`status`]}`;
			}

			//Add this row to results text, and repeat
			resultsText += resultsRow + `\n`;
		}

		let raceEmbed = new client.EmbedBuilder()
			.setAuthor({ name: 'F1 Steward Bot', iconURL: 'https://www.kimjammer.com/Portfolio/img/f1StewardLogo.png', url: 'https://www.kimjammer.com' })
			.setColor(0xFF1801)
			.setTitle(`${response.season} F1 ${response.raceName} Sprint Race`)
			.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
			.addFields({name:"Results", value:`\`\`\`${resultsText}\`\`\``, inline: false})
			.setFooter({text:`Information provided by Ergast`})

		//Now send the information to all channels that have autoResults
		for (const server in dbData.servers) {
			client.channels.cache.get(dbData.servers[`${server}`]).send({embeds:[raceEmbed]});
		}
	});
}

//Respond to slash commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

systime.start()

client.login(token);

//Code to prevent the program from crashing with non-zero exit code.
process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));
