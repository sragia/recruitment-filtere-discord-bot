const axios = require('axios');
const qs = require('qs');
const btoa = require('btoa');
require('axios-debug-log')({
  request: function (debug, config) {
    debug('Request with ' + config.headers['content-type'])
  },
  response: function (debug, response) {
    debug(
      'Response with ' + response.headers['content-type'],
      'from ' + response.config.url
    )
  },
  error: function (debug, error) {
    // Read https://www.npmjs.com/package/axios#handling-errors for more info
    debug('Boom', error)
  }
})

const BOSSMAPPING = {
  "Ulgrax the Devourer": 'Ulgrax',
  "The Bloodbound Horror": "Bloodbound",
  "Sikran, Captain of the Sureki": "Sikran",
  "Rasha'nan": "Rasha'nan",
  "Broodtwister Ovi'nax": "Ovi'nax",
  "Nexus-Princess Ky'veza": "Ky'veza",
  "The Silken Court": "Court",
  "Queen Ansurek": "Ansurek"
}

const wcUser = process.env.WCLOGS_USER;
const wcSecret = process.env.WCLOGS_SECRET;

export class WCLogs {

  colorRank(rank: string) {
    const rankNumber = parseFloat(rank);
    if (!rankNumber) {
        return "```\n" + rank + '\n```';
    }

    if (rankNumber >= 99.8) {
      return "```ansi\n" + "[1;2m[1;35m" + rankNumber + "[0m[0m\n```"
    } else if (rankNumber >= 99) {
      return "```ansi\n" + "[2;31m[1;31m" + rankNumber + "[0m[2;31m[0m\n```"
    } else if (rankNumber >= 95) {
      return "```ansi\n" + "[1;2m[1;33m" + rankNumber + "[0m[0m\n```"
    } else if (rankNumber >= 75) {
      return "```ansi\n" + "[1;2m[1;36m" + rankNumber + "[0m[0m\n```"
    } else if (rankNumber >= 50) {
      return "```ansi\n" + "[1;2m[1;34m" + rankNumber + "[0m[0m\n```"
    } else if (rankNumber >= 25) {
      return "```ansi\n" + "[1;2m[1;32m" + rankNumber + "[0m[0m\n```"
    } else {
      return "```ansi\n" + "[1;2m[1;30m" + rankNumber + "[0m[0m\n```"
    }
  }

  async getToken() {
    try {
      let data = qs.stringify({
        'grant_type': 'client_credentials' 
      });

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://www.warcraftlogs.com/oauth/token',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded', 
          'Authorization': `Basic ${btoa(`${wcUser}:${wcSecret}`)}`
        },
        data : data
      };

      const resp = await axios.request(config)

      return resp.data.access_token;
    } catch (e) {
      console.log('Token Exception', e.message);
    }
  }

  async getUserRankings(name: string, server: string) {
    const token = await this.getToken();
    if (!token) return null;
    try {
      let data = JSON.stringify({
        query: `query GetCharacter($name: String, $server: String) {
          characterData {
              character(name: $name, serverSlug: $server, serverRegion: "EU") {
                  zoneRankings
              }
          }
      }`,
        variables: {"name": name,"server": server.replace(' ', '-')}
      });

      const resp = await axios.request({
        method: 'post',
        url: 'https://www.warcraftlogs.com/api/v2/client',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: data
      });
      console.log(resp.data);
      const rankings = resp.data.data?.characterData?.character?.zoneRankings?.rankings;

      if (!rankings) {
        return null;
      } 

      const formatted = [];

      for (const rank of rankings) {
        formatted.push({
          boss: BOSSMAPPING[rank.encounter.name] || rank.encounter.name,
          percentage: this.colorRank(rank.rankPercent ? rank.rankPercent.toFixed(2) : 'Missing')
        });
      }

      return formatted; 
    } catch (e) {
      console.log(e.message);
    }
  }
}