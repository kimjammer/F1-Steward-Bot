const Discord = require('discord.js');
const client = new Discord.Client();

client.attachment = Discord.MessageAttachment;
client.MessageEmbed = Discord.MessageEmbed;
client.ReactionCollector = Discord.ReactionCollector;

//Your(the bot creator's) user ID here. Only used for debug mode.
const botAuthor = "424546246980665344"

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
	dblocation = '../databases/botData.json'
	//If the database doesn't exist, create it.
	if (!fs.existsSync(dblocation)) {
		fs.writeFileSync(dblocation,
			JSON.stringify({
			servers: {},
			cache:
				{
					"lastRace":[],
					"lastQualifying": []
				}
			}));
	}
}else{
	console.log("Running in docker detected.");
	//Now check if the file exists at the predicted docker location
	dblocation = '/dbs/f1bot/botData.json'
	//If the database doesn't exist, create it.
	if (!fs.existsSync(dblocation)) {
		fs.writeFileSync(dblocation,
			JSON.stringify({
				servers: {},
				cache:
					{
						"lastRace":[],
						"lastQualifying": []
					}
			}));
	}
}
//put dblocation into client for easy access
client.dblocation = dblocation;

const {token} = require('./config.json');
const prefix = "<";

client.commands = new Map();
const commandFiles = fs.readdirSync('./a').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./a/${file}`);
	client.commands.set(command.name.toLowerCase(), command);
}

client.on('ready', () => {
	console.log('F1 Steward is online');
	client.user.setActivity("<help",{type: "LISTENING"});

	//When bot starts check for new results
	checkNewRaceResults();
	checkNewQualsResults();
});

//Every Hour, Check for a new race result and if there is one, post it.
systime.on('hour', () => {
	checkNewRaceResults();
	checkNewQualsResults();
});

function checkNewRaceResults () {
	let url = "http://ergast.com/api/f1/current/last/results.json";

	tiny.get({url}, function (error, rawResponse) {
		if (error) throw new Error(error);

		//Response here
		//Get Currently displayed race season & round
		let rawdbData = client.fs.readFileSync(client.dblocation);
		let dbData = JSON.parse(rawdbData);

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
		for (let i = 0;i<20;i++) {
			resultsRow = ``;
			//Check if current driver has a ending place or has retired. Then add their place to the string.
			if (response.Results[i].positionText == "R") {
				//Say driver has retired instead of giving place number
				resultsRow += `Retired. `;
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

			//Now, get the number of characters that are in the in the string, and subtract it from 30 to get number of spaces to add
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

		let raceEmbed = new Discord.MessageEmbed()
			.setAuthor('F1 Steward','https://kimjammer.github.io/Portfolio/img/f1StewardLogo.png')
			.setColor(0xFF1801)
			.setTitle(`${response.season} F1 ${response.raceName}`)
			.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
			.addField("Results", `\`\`\`${resultsText}\`\`\``, false)
			.setFooter(`Information provided by Ergast`)
			.setThumbnail("")

		//Now send the information to all channels that have autoResults
		for (const server in dbData.servers) {
			client.channels.cache.get(dbData.servers[`${server}`]).send(raceEmbed);
		}
	});
}

function checkNewQualsResults () {
	let url = "http://ergast.com/api/f1/current/last/qualifying.json";

	tiny.get({url}, function (error, rawResponse) {
		if (error) throw new Error(error);

		//Response here
		//Get Currently displayed race season & round
		let rawdbData = client.fs.readFileSync(client.dblocation);
		let dbData = JSON.parse(rawdbData);

		let response = rawResponse.body.MRData.RaceTable

		//Get the latest Qualifying round completed.
		let lastQualifying = 0;
		//This checks the Q1 time of the first place driver. If there is no value, then Q1 has not been completed
		if (!response.Races[0].QualifyingResults[0]['Q1']) {
			//This state should never be reached, as the database updates when there is a value for Q1.
			console.log('How did the database update without having Q1 information?')
		}else if (!response.Races[0].QualifyingResults[0]['Q2']) {
			//There is Data for up to Q1
			lastQualifying = 1;
		}else if (!response.Races[0].QualifyingResults[0]['Q2']) {
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

		//Construct block of text that has all drivers and their times in rows.
		let resultsText = ``;
		let resultsRow = ``;
		for (let i = 0;i<20;i++) {
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

			//Now, get the number of characters that are in the in the string, and subtract it from 30 to get number of spaces to add
			let numSpacesNeeded = 30 - resultsRow.length;
			//Now add the number of spaces needed.
			for (numSpacesNeeded;numSpacesNeeded > 0;numSpacesNeeded--) {
				resultsRow += ` `; //Add a single space
			}

			//Finally, their time statistics
			if (lastQualifying == 1) {
				//Check if the driver did this Qualifying round
				if (response.QualifyingResults[i]['Q1']) {
					resultsRow += `${response.QualifyingResults[i]['Q1']}`;
				}else {
					resultsRow += `N/A`
				}
			}else if (lastQualifying == 2) {
				//Check if the driver did this Qualifying round
				if (response.QualifyingResults[i]['Q2']) {
					resultsRow += `${response.QualifyingResults[i]['Q2']}`;
				}else {
					resultsRow += `N/A`
				}
			}else if (lastQualifying == 3) {
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

		let raceEmbed = new Discord.MessageEmbed()
			.setAuthor('F1 Steward','https://kimjammer.github.io/Portfolio/img/f1StewardLogo.png')
			.setColor(0xFF1801)
			.setTitle(`${response.season} F1 ${response.raceName} Qualifying ${lastQualifying}`)
			.setDescription(`At ${response.Circuit.circuitName} on ${response.date}.`)
			.addField("Qualifying Results", `\`\`\`${resultsText}\`\`\``, false)
			.setFooter(`Information provided by Ergast`)
			.setThumbnail("")

		//Now send the information to all channels that have autoResults
		for (const server in dbData.servers) {
			client.channels.cache.get(dbData.servers[`${server}`]).send(raceEmbed);
		}
	});
}

client.on('message',message => {

	if (!message.content.startsWith(prefix) || message.author.bot) return;

	let msgContents = message.content.slice(prefix.length).split(/ +/);
	let commandName = msgContents.shift().toLowerCase();
	let command = client.commands.get(commandName);
	let args = msgContents.map(element => {
			return element.toLowerCase();
	});

	let reply = ''

	if (!client.commands.has(commandName)) return;

	if (command.guildOnly && !message.guild) { //If command is guild only and there is no guild that the message was sent from. (Direct message)
		message.channel.send("You can only use this command in a server.");
		return;
	}

	//if the last argument is debug, and the sender is the bot's creator, do debug things
	client.debugMode = false;
	if (args[args.length - 1] == "debug") {
		if (message.author.id == botAuthor) {
			client.debugMode = true;
		}else{
			message.channel.send(`Debug Mode Access Denied.`)
		}
	}

	try {
		command.execute(message,args,client); //message is the message object so the code can call message.channel.send() or etc
	}catch(err){
		console.log(err);
		reply = 'Something went wrong. :('
		message.channel.send(reply);
	}

});

systime.start()

client.login(token);

//Code to prevent the program from crashing with non-zero exit code.
process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));
