module.exports = {
	name: 'args-test',
	description: 'Test if the arguments are working!',
	usage: `<args-test [arguments]`,
	category: "general",
	guildOnly: false,
	execute(message,args) {
		args.forEach(element => {
			message.channel.send(element);
		});
		message.channel.send("Done!");
	}
};
