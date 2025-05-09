const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`تم تسجيل الدخول كبوت: ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

client.login('OTQ2ODUwMDQ5ODgxNjk4Mzg1.G_I6eu.Qa3h_3au8rRbZ1fKRJcOBh9fOQAy1z1iNC4PE4');
