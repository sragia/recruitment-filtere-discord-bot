import { Client, Slash, Discord, On, ArgsOf, SlashOption, SlashChoice } from 'discordx'
import { Classes, DBManagement, IFilter, IGuild, Role } from './DBManagement'
import { WCLogs } from './WCLogs'
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js';
const { Message, MessageEmbed, MessageEmbedField, EmbedBuilder } = require('discord.js');

const prefix = '->'
const diffDifficulty = {
    N: 1,
    H: 2,
    M: 3,
}

interface WCLogsReport {
    boss: String
    percentage: Number
}

const specSorting = {
  "Death Knight": { default: 'Melee', Blood: 'Tank'},
  "Demon Hunter": { Vengeance: 'Tank', Havoc: 'Melee'},
  Druid: { Balance: 'Ranged', Feral: 'Melee', Guardian: 'Tank', Restoration: 'Healer'},
  Hunter: { default: 'Ranged', Survival: 'Melee'},
  Mage: { default: 'Ranged' },
  Monk: { Brewmaster: 'Tank', Mistweaver: 'Healer', Windwalker: 'Melee' },
  Paladin: { Holy: 'Healer', Protection: 'Tank', Retribution: 'Melee' },
  Priest: { default: 'Healer', Shadow: 'Ranged' },
  Rogue: { default: 'Melee' },
  Shaman: { Restoration: 'Healer', Enhancement: 'Melee', Elemental: 'Ranged' },
  Warlock: { default: 'Ranged' },
  Warrior: { default: 'Melee', Protection: 'Tank'},
  Evoker: { default: 'Ranged', Preservation: 'Healer', Augmentation: 'Support' }
}


@Discord()
export abstract class DiscordBot {
    private dbManager = new DBManagement()

    private wcLogs = new WCLogs()

    private cache: { [index: string]: IGuild } = {}

    private clearGuildCache(guildId: string) {
        this.cache[guildId] = null
    }

    private getArgs(content: string): any {
        const args = content.slice(prefix.length).trim().split(' ')
        args.shift()
        const formattedArgs = {}
        for (const arg of args) {
            const items = arg.split('=')
            if (!items[1]) {
                throw new Error(
                    'Invalid Format, args have to be in [key]=[value]'
                )
            }
            formattedArgs[items[0]] = items[1]
        }

        return formattedArgs
    }

    private async getGuildWatchId(guildId: string) {
        if (this.cache[guildId] && this.cache[guildId].watchChannelId) {
            return this.cache[guildId].watchChannelId
        }
        const guild = await this.dbManager.getGuildData(guildId)
        this.cache[guildId] = guild

        return guild.watchChannelId
    }

    private async getGuildFilters(guildId: string) {
        if (this.cache[guildId] && this.cache[guildId].filters) {
            return this.cache[guildId].filters
        }
        const guild = await this.dbManager.getGuildData(guildId)
        this.cache[guildId] = guild

        return guild.filters
    }

    @Slash({name: 'filterremove', description: 'Remove Filter from this channel'})
    private async removeFilter(message: CommandInteraction) {
        await this.dbManager.removeFilter(message.guild.id, message.channel.id)
        message.reply('Removed filter from this channel')
        this.clearGuildCache(message.guild.id)
    }

    @Slash({name: 'hello', description: 'Say Hello'})
    private hello(message: CommandInteraction) {
        message.reply('sup')
    }

    @Slash({name: 'watch', description: 'Watch this channel where the unfiltered recruitment feed is posted'})
    private async watchChannel(message: CommandInteraction) {
        await this.dbManager.setWatchChannel(
            message.guild.id,
            message.channel.id
        )
        this.clearGuildCache(message.guild.id)
        message.reply('Watching this channel for feed')
    }

    @Slash({ description: 'Add filter to the channel', name: 'filter'})
    private async filterChannel(
        @SlashOption({
            description: 'Minimums bosses killed',
            name: 'min',
            required: true,
            type: ApplicationCommandOptionType.Number
        })
        min: number,
        @SlashChoice({ name: "Normal", value: "N" })
        @SlashChoice({ name: "Heroic", value: "H" })
        @SlashChoice({ name: "Mythic", value: "M" })
        @SlashOption({
            description: 'Difficulty to lookup',
            name: 'diff',
            required: true,
            type: ApplicationCommandOptionType.String
        })
        diff: IFilter['diff'],
        @SlashOption({
            description: 'Maximum bosses killed',
            name: 'max',
            required: false,
            type: ApplicationCommandOptionType.Number
        })
        max: number,
        @SlashChoice({ name: "Death Knight", value: "Death Knight" })
        @SlashChoice({ name: "Demon Hunter", value: "Demon Hunter" })
        @SlashChoice({ name: "Druid", value: "Druid" })
        @SlashChoice({ name: "Hunter", value: "Hunter" })
        @SlashChoice({ name: "Mage", value: "Mage" })
        @SlashChoice({ name: "Monk", value: "Monk" })
        @SlashChoice({ name: "Paladin", value: "Paladin" })
        @SlashChoice({ name: "Priest", value: "Priest" })
        @SlashChoice({ name: "Rogue", value: "Rogue" })
        @SlashChoice({ name: "Shaman", value: "Shaman" })
        @SlashChoice({ name: "Warlock", value: "Warlock" })
        @SlashChoice({ name: "Warrior", value: "Warrior" })
        @SlashChoice({ name: "Evoker", value: "Evoker" })
        @SlashOption({
            description: 'Player class',
            name: 'characterclass',
            required: false,
            type: ApplicationCommandOptionType.String
        })
        characterclass: Classes,
        @SlashChoice({ name: "Healer", value: "Healer" })
        @SlashChoice({ name: "Tank", value: "Tank" })
        @SlashChoice({ name: "Melee", value: "Melee" })
        @SlashChoice({ name: "Ranged", value: "Ranged" })
        @SlashChoice({ name: "Support", value: "Support" })
        @SlashOption({
            description: 'Player role',
            name: 'role',
            required: false,
            type: ApplicationCommandOptionType.String
        })
        role: Role,
        message: CommandInteraction,
    ) {
        try {
            await this.dbManager.setChannelFilter(
                message.guild.id,
                message.channel.id,
                {
                    min: min,
                    diff: diff || 'M',
                    max: max,
                    class: characterclass,
                    role: role
                }
            )
            this.clearGuildCache(message.guild.id)
            message.reply(
                `Successfully have set filter | Min Kills: ${
                    min
                }, Difficulty: ${diff || 'M'}${
                    max ? `, Max Kills: ${max}` : ''
                }${
                    characterclass ? `, Class: ${characterclass}` : ''
                }${
                    role ? `, Role: ${role}` : ''
                }`
            )
        } catch (e) {
            message.reply(e.message)
        }
    }

    private async getWcLogsReportEmbed(
        name: string,
        server: string
    )
    {
        const rankings = await this.wcLogs.getUserRankings(name, server);
        if (rankings) {
            return new EmbedBuilder()
                .setTitle('Warcraftlogs report')
                .setImage('https://imgur.com/onAbDjq')
                .setFields(rankings.map(item => ({name: item.boss,
                            value: item.percentage,
                            inline: true})));
        }
        return;
    }

    private async sendMessageToChannel(
        message: any,
        client: Client,
        channelId: string
    ) {
        const channel = await message.guild.channels.fetch(channelId);

        if (channel) {
            const embed = message.embeds[0];
            const author = message.embeds[0].author.name;
            const match = author.match(/^(\w+)\s-\s([\w]+)/);
            if (match) {
                const name = match[1];
                const server = match[2];
                const wcLogsEmbed = await this.getWcLogsReportEmbed(name, server);
                if (wcLogsEmbed) {
                    channel.send({ embeds: [embed, wcLogsEmbed] });
                    return;
                }
            }

            channel.send({ embeds: [embed] })
        }
    }

    private async sendWcLogsReportToChannel(
        message: any,
        report: WCLogsReport[],
        client: Client,
        channelId: string
    ) {
        const channel = await message.guild.channels.fetch(channelId);

        if (channel) {
            const embed = new EmbedBuilder()
            .setTitle('Warcraftlogs report')
            .setImage('https://imgur.com/onAbDjq')
            .setFields(report.map(item => ({name: item.boss,
                        value: item.percentage,
                        inline: true})));

            channel.send({ embeds: [embed] }).catch(error => {
                console.log(error);
            });
        }
    }

    private extractCharacterInfo(input: string): { spec: string; class: string, type: string } | null {
        const regex = /\|\s*(.*?)\s*(Death Knight|Shaman|Warrior|Paladin|Mage|Rogue|Warlock|Priest|Hunter|Druid|Monk|Demon Hunter|Evoker|)?\s*\|/;
        const match = input.match(regex);

        if (match && match[1] && match[2]) {
            const spec = match[1].trim();
            const charClass = match[2].trim();

            return {
                spec: match[1].trim(),
                class: match[2].trim(),
                type: specSorting[charClass][spec] ?? specSorting[charClass].default
            };
        }

        return null; // Return null if no match is found
    }

    private validateMessage([message]: ArgsOf<'messageCreate'>, filter: IFilter) {
        try {
            const characterInfo = this.extractCharacterInfo(message.embeds[0].author.name);

            // Prog check
            const raidProg = message.embeds[0].fields.find(
                    (field) => field.name === '__Recent Raid Progression__'
                );
            const match = raidProg.value.match(/([0-9]+)\/([0-9]+).+([A-Z])/)
            const curr = match[1]
            const diff = match[3]
            const filters = [];
            filters.push(() => diffDifficulty[diff] >= diffDifficulty[filter.diff] &&
                parseInt(curr, 10) >= filter.min &&
                (!filter.max || filter.max >= parseInt(curr, 10)));


            // Class check
            if (filter.class) {
                filters.push(() => filter.class === characterInfo?.class);
            }

            // Role Check
            if (filter.role) {
                filters.push(() => filter.role === characterInfo?.type);
            }

            for (const func of filters) {
                if (!func()) {
                    return false;
                }
            }


            return true;
        } catch (e) {
            // fail silently-ish;
            console.error(e)
        }
    }

    @On({event: 'messageCreate'})
    private async onMessage([message]: ArgsOf<'messageCreate'>, client: Client) {
        if (
            message.channelId ===
            (await this.getGuildWatchId(message.guild.id))
        ) {
            if (message.embeds && message.embeds.length) {
                const raidProg = message.embeds[0].fields.find(
                    (field) => field.name === '__Recent Raid Progression__'
                )
                const filters = await this.getGuildFilters(message.guild.id)
                for (const channelId in filters) {
                    if (filters.hasOwnProperty(channelId)) {
                        const filter = filters[channelId]
                        if (this.validateMessage([message], filter)) {
                            this.sendMessageToChannel(
                                message,
                                client,
                                channelId
                            );
                        }
                    }
                }
            } else {
                console.log(message.embeds);
            }
        }
    }

    @Slash({description: 'Test WC Output', name: 'testwc'})
    private async testWC(message: CommandInteraction, client: Client) {
        const rankings = await this.wcLogs.getUserRankings('Biyatch', 'Silvermoon');
        if (rankings) {
            this.sendWcLogsReportToChannel(message, rankings, client, message.channel.id);
        }
    }
}
