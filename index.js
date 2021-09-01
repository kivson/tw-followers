
const playwright = require('playwright');
const {createBot, login, scrapFollowers, TwBot} = require("./tw-bot");
const {addFollower} = require("./service/follower");
const {connectDB} = require("./config");

(async () => {
    let userToScrap = 'LulaOficial';
    let addPromisses =[];

    await connectDB(userToScrap);

    let bot = await TwBot.createBot({browserType: 'chromium', browserOptions: {headless: true}})
    await bot.login({username: process.env.LOGIN, password: process.env.PASSWORD});


    bot.on('followers', (followers) => {
        let promisses = followers.map(follower => addFollower(follower));
        addPromisses.push(Promise.all(promisses));
    });

    await bot.scrapFollower({id: userToScrap});
    await Promise.all(addPromisses);
    console.log("ENDD");
    await bot.close();

})();