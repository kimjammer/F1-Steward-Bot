module.exports = {
	name: 'foo',
	description: 'bar',
	usage: `<foo`,
	category: "fun",
	guildOnly: false,
	execute (message,args) {
		message.channel.send('bar');
	}
};
