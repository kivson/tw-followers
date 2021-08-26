const playwright = require('playwright');
const {createBot, login, scrapFollowers, TwBot} = require("./tw-bot");

(async () => {
    let bot = await TwBot.createBot({browserType: 'chromium', browserOptions: {headless: false}})
    await bot.login({username: process.env.LOGIN, password: process.env.PASSWORD});
    await bot.scrapFollower({id: 'kivson'})
})();