import "reflect-metadata";
import { Client } from "@typeit/discord";
import { config } from "dotenv";
config();

export class Main {
  static start() {
    const client = new Client({
     
    });

    console.log(process.env.BOT_TOKEN);
    client.once('ready', () => {
      console.log('ready');
    })
    
    client.login(
      process.env.BOT_TOKEN,
      `${__dirname}/discord/*.ts`
    );
  }
}

Main.start();
