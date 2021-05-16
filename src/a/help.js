module.exports = {
	name: 'help',
	description: 'See all of the commands, or get info on a specific command.',
	usage: `<help [optional: command]`,
	category: "general",
	guildOnly: false,
	async execute(message,args,client) {

		const limit = 20*1000;

		const removeReaction = async (menu, message, emoji) => {
			try {
				menu.reactions.cache.find(r => r.emoji.name == emoji).users.remove(message.author.id);
			} catch(err) {}
		}

		//the keys are $# because just numbers cannot be called using dot notation
		let pages = {
			$1: {title: "Help: General", color: 0x03fc30, fields: [], footer: {text: `Requested by ${message.author.tag}`}},
			$2: {title: "Help: Fun", color: 0x03fc30, fields: [], footer: {text: `Requested by ${message.author.tag}`}}
		}

		const filter = (reaction, user) => {
			return ['🇬', '🇫', '🗑'].includes(reaction.emoji.name) && user.id == message.author.id;
		};

		if (args[0] == undefined) { //If it is just ?help with no arguments

			//Set up the help pages
			client.commands.forEach((value, key, map) => {
				if (value.category == "general") {
					pages.$1.fields.push({name: value.name ,value: `${value.description} \n Usage: \`${value.usage}\``});
				}else if (value.category == "fun") {
					pages.$2.fields.push({name: value.name ,value: `${value.description} \n Usage: \`${value.usage}\``});
				}else {
					console.log("Attempted to add command to page. No category specified")
				}
			})

			const helpEmbed = new client.MessageEmbed()
				.setAuthor('Diri','https://kimjammer.github.io/Portfolio/img/Diri.png','https://diri-robot.web.app/')
				.setColor(0x03fc30)
				.setTitle(`Help Menu`)
				.addField("General Commands:", "Press :regional_indicator_g:", false)
				.addField("Fun Commands", "Press: :regional_indicator_f:", false)
				.setFooter("Menu will deactivate after 20 seconds. In that case, run \`<help\` again.")

			//send embed and wait for response.
			const menu =  await message.channel.send(helpEmbed);

			//React to the message and create the buttons
			await menu.react('🇬');
			await menu.react('🇫');
			await menu.react('🗑');

			const getReactions  = async (message, menu, limit, filter) => {
				//Gets the collection of reactions. (There should only be one since max is set to 1)
				menu.awaitReactions(filter, {max:1, time: limit})
					.then (async (collected) => {
						//Get the reaction
						let reaction = collected.first();

						if (reaction.emoji.name == "🇬") {
							//Try to remove the old reaction
							await removeReaction(menu, message, "🇬");

							//Edit the menu to show the General Commands page
							await menu.edit(new client.MessageEmbed(pages.$1));

							// restart the listener (This function)
							getReactions(message, menu, limit, filter);
						}else if (reaction.emoji.name == "🇫") {
							//Try to remove the old reaction
							await removeReaction(menu, message, "🇫");

							//Edit the menu to show the Fun Commands page
							await menu.edit(new client.MessageEmbed(pages.$2));

							// restart the listener (This function)
							getReactions(message, menu, limit, filter);

						}else if (reaction.emoji.name == "🗑") {
							// Delete the menu instantly, returning so the listener fully stops
							return await menu.delete();
						}else {
							//Restart the listener if something goes wrong.
							awaitReactions(msg, m, options, filter);
						}
					}).catch(() => {});
			}

			getReactions(message, menu, limit, filter);

		}else { //If there are arguments and it is asking for info on a specific command
			let reply;
			let serverOnlyTxt;
			if (client.commands.has(args[0])) {

				//See if the command is guildOnly.
				if (client.commands.get(args[0]).guildOnly) {
					serverOnlyTxt = "Yes";
				}else {
					serverOnlyTxt = "No";
				}

				//Create new embed with information about the requested command
				const commandEmbed = new client.MessageEmbed()
					.setAuthor('Diri','https://kimjammer.github.io/Portfolio/img/Diri.png','https://diri-robot.web.app/')
					.setColor(0x03fc30)
					.setTitle(client.commands.get(args[0]).name)
					.addField(`Description:`, client.commands.get(args[0]).description, false)
					.addField(`Usage:`, `\`${client.commands.get(args[0]).usage}\``, false)
					.addField(`Only usable in servers?`, `${serverOnlyTxt}`,false)

				message.channel.send(commandEmbed);
			}else{
				reply = "That command doesn't exist!"
				message.channel.send(reply);
			}
		}


	}
};
