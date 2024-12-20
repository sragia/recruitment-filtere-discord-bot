import "reflect-metadata";
import { config } from "dotenv";
import { Client } from "discordx";
import { IntentsBitField } from "discord.js";
config();
import "./discord/DiscordBot";

export class Main {
  static start() {
    const client = new Client({
     intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent
    ],
    silent: false,
    });

    client.once('ready', async () => {
      console.log('ready');
      await client.initApplicationCommands()
    })

    client.on("interactionCreate", (interaction) => {
      client.executeInteraction(interaction);
    });
    
    client.login(
      process.env.BOT_TOKEN
    );
  }
}

Main.start();
