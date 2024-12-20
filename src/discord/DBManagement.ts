import Keyv = require('keyv')

const dbUser = process.env.MYSQL_USER
const dbPass = process.env.MYSQL_PASS
const dbName = process.env.MYSQL_DB
const dbHost = process.env.MYSQL_HOST

export type Classes = 'Death Knight' | 'Demon Hunter' | 'Druid' | 'Hunter' | 'Mage' | 'Monk' | 'Paladin' | 'Priest' | 'Rogue' | 'Shaman' | 'Warlock' | 'Warrior' | 'Evoker';
export type Role = 'Healer' | 'Tank' | 'Melee' | 'Ranged' | 'Support'

export interface IFilter {
    min: number
    diff: 'N' | 'H' | 'M'
    max?: number
    class?: Classes
    role?: Role
}

export interface IGuild {
    watchChannelId?: string
    filters?: { [index: string]: IFilter }
}

export class DBManagement {
    private keyv

    constructor() {
        this.keyv = new Keyv(`mysql://${dbUser}:${dbPass}@${dbHost}/${dbName}`)
    }

    public async getGuildData(guildId: string): Promise<IGuild | null> {
        let guild = await this.keyv.get(guildId)
        if (!guild) {
            guild = {
                filters: {},
            }
            await this.keyv.set(guildId, guild)
        }
        return guild
    }

    public async setGuildData(guildId: string, data: IGuild) {
        await this.keyv.set(guildId, data)
    }

    public async getChannelFilter(
        guildId: string,
        channelId: string
    ): Promise<IFilter | null> {
        const guild = await this.getGuildData(guildId)

        if (guild && guild.filters && guild.filters[channelId]) {
            return guild.filters[channelId]
        }
        return null
    }

    public async setChannelFilter(
        guildId: string,
        channelId: string,
        filter: IFilter
    ) {
        const guild = await this.getGuildData(guildId)
        guild.filters[channelId] = filter
        await this.setGuildData(guildId, guild)
    }

    public async removeFilter(guildId: string, channelId: string) {
        const guild = await this.getGuildData(guildId)
        guild.filters[channelId] = null
        await this.setGuildData(guildId, guild)
    }

    public async setWatchChannel(guildId: string, channelId: string) {
        const guild = await this.getGuildData(guildId)
        guild.watchChannelId = channelId
        await this.setGuildData(guildId, guild)
    }

    public async getWatchChannelId(guildId: string): Promise<string | null> {
        const guild = await this.getGuildData(guildId)

        return guild.watchChannelId
    }
}
