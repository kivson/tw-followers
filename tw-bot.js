const playwright = require("playwright");

function formatUser(user) {
    let data = user.content.itemContent.user_results.result?.legacy;
    if (!data) {
        return ''
    }
    return `Follower ${data.name} <https://twitter.com/${data.screen_name}> ${data.followers_count} followers`
}

function extractUserAndCursor(responseData) {
    let entriesToAdd = responseData?.data?.user?.result?.timeline?.timeline?.instructions?.find(item => item.type === 'TimelineAddEntries')?.entries
    let users = entriesToAdd?.filter(item => item.entryId.startsWith("user"))
    let cursorNext = entriesToAdd?.find(item => item.entryId.startsWith("cursor-bottom"))?.content?.value
    return {users, cursorNext};
}


class TwBot {
    static async createBot({browserType, browserOptions}) {
        let bot = new TwBot();
        bot.browser = await playwright[browserType].launch(browserOptions);
        bot.browserContext = await bot.browser.newContext();
        return bot;
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
        let page = await this.browserContext.newPage();
        let regexRequestApiFollowers = /api\/graphql\/.*?\/Followers/
        let folowers = []

        return new Promise(async (resolve, reject) => {
            page.on('response', async response => {
                let url = response.url();
                if (regexRequestApiFollowers.test(url)) {
                    let responseData = await response.json();
                    let entriesToAdd = responseData?.data?.user?.result?.timeline?.timeline?.instructions?.find(item => item.type === 'TimelineAddEntries')?.entries
                    let users = entriesToAdd?.filter(item => item.entryId.startsWith("user"))
                    if (users) {
                        folowers = [...folowers, ...users]
                        users.map(formatUser).filter(x => x !== '').forEach(x => console.log(x))

                    }
                    let cursorBottom = entriesToAdd?.find(item => item.entryId.startsWith("cursor-bottom"))?.content?.value
                    if (cursorBottom?.startsWith("0|")) {
                        await page.close()
                        console.log(`Total Followers -> ${folowers.length}`);
                        resolve(folowers)
                    }
                }
            })

            await page.goto(`https://twitter.com/${id}/followers`);

            await page.evaluate(() => {
                setInterval(() => window.scrollTo(0, document.body.scrollHeight), 2000)
            })
        })
    }

}

module.exports = {
    TwBot
}