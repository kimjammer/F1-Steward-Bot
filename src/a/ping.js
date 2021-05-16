module.exports = {
	name: 'ping',
	description: 'Will show the ping time in milliseconds',
	usage: `<ping`,
	category: "general",
	guildOnly: false,
	execute(message,args,client) {
		message.channel.send(`pong! The ping time is ${client.ws.ping}.`);
	}
};
