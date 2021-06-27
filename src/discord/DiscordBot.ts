import { Client, Command, CommandMessage, Discord, On } from "@typeit/discord";
import { Message, MessageEmbed, MessageEmbedField } from "discord.js";

const channelToWatch = process.env.WATCH_CHANNEL;
const channelToSend = process.env.SEND_CHANNEL;
const KILLED = process.env.MIN_KILLED;

@Discord({prefix: '#'})
export abstract class DiscordBot {

    @Command('hello')
    private hello(message: CommandMessage) {
        message.reply('sup');
    }

    private sendMessageToChannel(message: any, client: Client)
    {
        const channel = message.guild.channels.find(channel => channel.id === channelToSend);

        if (channel) {  
            const msg = new MessageEmbed(
                new Message(channel, {}, client),
                message.embeds[0]
            ); 
            const embed = message.embeds[0];

            msg.fields = embed.fields;
            msg.description = embed.description;
            msg.thumbnail = embed.thumbnail;
            msg.timestamp = embed.timestamp;
            msg.type = embed.type;
            msg.title = embed.title;
            msg.author = embed.author;

            channel.send({embed: msg});
        }
    }

    private validateMessage(raidProg: MessageEmbedField)
    {
        try {
            const prog = raidProg.value.split(':**')[1].trim();
            const curr = prog.split('/')[0];
            const diff = prog.split(' ')[1];

            return diff === 'M' && parseInt(curr, 10) > parseInt(KILLED, 10);
        } catch(e) {
            // fail silently-ish;
            console.error(e);
        }
    }

    @On("message")
    private onMessage(
        message: any,
        client: Client
   ) {
       if (message.channel.id === channelToWatch) {
           if (message.embeds && message.embeds.length) {
                const raidProg = message.embeds[0].fields.find(field => field.name === '__Recent Raid Progression__')
                if (this.validateMessage(raidProg)) {
                    this.sendMessageToChannel(message, client);
                }
           }
       }
    }


}
