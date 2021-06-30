import { Client, Command, CommandMessage, Discord, On } from '@typeit/discord'
import { Message, MessageEmbed, MessageEmbedField } from 'discord.js'
import { DBManagement, IFilter, IGuild } from './DBManagement'

const prefix = '->'
const diffDifficulty = {
    N: 1,
    H: 2,
    M: 3,
}

@Discord({ prefix })
export abstract class DiscordBot {
    private dbManager = new DBManagement()

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

    @Command('hello')
    private hello(message: CommandMessage) {
        message.reply('sup')
    }

    @Command('watch')
    private async watchChannel(message: CommandMessage) {
        await this.dbManager.setWatchChannel(
            message.guild.id,
            message.channel.id
        )
        this.clearGuildCache(message.guild.id)
        message.reply('Watching this channel for feed')
    }

    @Command('filter')
    private async filterChannel(message: CommandMessage) {
        try {
            const args = this.getArgs(message.content)
            await this.dbManager.setChannelFilter(
                message.guild.id,
                message.channel.id,
                {
                    min: args.min,
                    diff: args.diff || 'M',
                    max: args.max,
                }
            )
            this.clearGuildCache(message.guild.id)
            message.reply(
                `Successfully have set filter | Min Kills: ${
                    args.min
                }, Difficulty: ${args.diff || 'M'}${
                    args.max ? `, Max Kills: ${args.max}` : ''
                }`
            )
        } catch (e) {
            message.reply(e.message)
        }
    }

    private sendMessageToChannel(
        message: any,
        client: Client,
        channelId: string
    ) {
        const channel = message.guild.channels.find(
            (channel) => channel.id === channelId
        )

        if (channel) {
            const msg = new MessageEmbed(
                new Message(channel, {}, client),
                message.embeds[0]
            )
            const embed = message.embeds[0]

            msg.fields = embed.fields
            msg.description = embed.description
            msg.thumbnail = embed.thumbnail
            msg.timestamp = embed.timestamp
            msg.type = embed.type
            msg.title = embed.title
            msg.author = embed.author

            channel.send({ embed: msg })
        }
    }

    private validateMessage(raidProg: MessageEmbedField, filter: IFilter) {
        try {
            const match = raidProg.value.match(/([0-9]+)\/([0-9]+).+([A-Z])$/)
            const curr = match[1]
            const diff = match[3]
            return (
                diffDifficulty[diff] >= diffDifficulty[filter.diff] &&
                parseInt(curr, 10) >= filter.min &&
                (!filter.max || filter.max >= parseInt(curr, 10))
            )
        } catch (e) {
            // fail silently-ish;
            console.error(e)
        }
    }

    @On('message')
    private async onMessage(message: any, client: Client) {
        if (
            message.channel.id ===
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
                        if (this.validateMessage(raidProg, filter)) {
                            this.sendMessageToChannel(
                                message,
                                client,
                                channelId
                            )
                        }
                    }
                }
            }
        }
    }
}
