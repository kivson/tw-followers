const playwright = require("playwright");
const {URL} = require("url");
const querystring = require('querystring');
const rax = require('retry-axios');
const axios = require("axios");
const EventEmitter = require('events');

const interceptorId = rax.attach();

function formatUser(user) {
    let data = user.content.itemContent.user_results.result?.legacy;
    if (!data) {
        return ''
    }
    return `Follower ${data.name} <https://twitter.com/${data.screen_name}> ${data.followers_count} followers`
}

function timelineEntryToFollower (entry) {
    let restId = entry.content.itemContent.user_results.result.rest_id;
    if (! restId) {
        restId = entry.entryId.substring(5);
    }
    return {
        rest_id: restId,
        ...entry.content.itemContent.user_results.result?.legacy
    }
}

function extractUserAndCursor(responseData) {
    let entriesToAdd = responseData?.data?.user?.result?.timeline?.timeline?.instructions?.find(item => item.type === 'TimelineAddEntries')?.entries
    let users = entriesToAdd?.filter(item => item.entryId.startsWith("user")).map(timelineEntryToFollower)
    let cursorNext = entriesToAdd?.find(item => item.entryId.startsWith("cursor-bottom"))?.content?.value
    return {users, cursorNext};
}


class TwBot extends EventEmitter{

    static async createBot({browserType, browserOptions}) {
        let bot = new TwBot();
        bot.browser = await playwright[browserType].launch(browserOptions);
        bot.browserContext = await bot.browser.newContext();
        return bot;
    }

    async close(){
        await this.browserContext.close()
        return this.browser.close();
    }

    async login({username, password}) {
        let page = await this.browserContext.newPage();
        await page.goto('https://twitter.com/login');
        await page.type('input[name*=email]', username);
        await page.type('input[name*=password]', password);
        await page.click("//span[text()='Log in']")
        await page.close()

    }

    async scrapFollower({id}) {
        let {users: initialFolowers, url, headers, cursorNext} = await this.followersApiData({id});
        this.emit('followers', initialFolowers);
        let parsedUrl = new URL(url);

        let baseParameters = JSON.parse(querystring.decode(parsedUrl.search.substr(1)).variables)
        baseParameters.count = 6000

        let actualCursor = cursorNext

        while (!actualCursor.startsWith("0|")) {

            baseParameters.cursor = actualCursor
            let {data} = await axios.get(`https://${parsedUrl.hostname}${parsedUrl.pathname}?variables=${querystring.escape(JSON.stringify(baseParameters))}`, {
                headers: headers
            })
            if (data?.errors?.[0]){
                console.warn("Erro na consulta da API -> ", data?.errors?.[0])
                continue
            }
            let {users, cursorNext} = extractUserAndCursor(data);
            this.emit('followers', users);

            actualCursor = cursorNext;

        }
    }

    async followersApiData({id}) {
        let page = await this.browserContext.newPage();
        let regexRequestApiFollowers = /api\/graphql\/.*?\/Followers/
        let folowers = []

        return new Promise(async (resolve, reject) => {
            page.on('response', async response => {
                let url = response.url();
                if (regexRequestApiFollowers.test(url)) {
                    let responseData = await response.json();
                    let {users, cursorNext} = extractUserAndCursor(responseData);
                    if (users) {
                        await page.close();
                        let headers = {...response.request().headers()}
                        for (let [key, value] of Object.entries(headers)) {
                            if (key.startsWith(":")) {
                                delete headers[key];
                            }
                            if (value.includes("gzip")) {
                                delete headers[key];
                            }
                        }
                        resolve({
                            users,
                            url: response.request().url(),
                            headers,
                            cursorNext
                        })
                    }
                }
            })
            await page.goto(`https://twitter.com/${id}/followers`);
        })

    }
}
module.exports = {
    TwBot
}