require('dotenv').config()
const { MongoClient } = require('mongodb')
const request = require('request')
const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const AnyCase = require('telegraf-anycase-commands')
const { TelegrafMongoSession } = require('telegraf-session-mongodb')

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;
const URL = process.env.URL || 'https://thearvindbot.herokuapp.com';

const bot = new Telegraf(BOT_TOKEN)

const apiai = require('apiai')(process.env.APIAI_TOKEN, {
    requestSource: 'TelegramBot'
});

// case insensitive commands
AnyCase.apply(bot)

// Mongodb session
let session;
bot.use((...args) => session.middleware(...args));

// Register logger middleware
bot.use((ctx, next) => {
    const start = new Date();
    console.log(ctx.from.username, ':', ctx.message.text);

    if (ctx.appSession && !ctx.appSession.id) {
        ctx.appSession.key = `${ctx.chat.id}:${ctx.from.id}`
        ctx.appSession.id = ctx.from.id
        ctx.appSession.username = ctx.from.username
        ctx.appSession.first_name = ctx.from.first_name
        ctx.appSession.last_name = ctx.from.last_name
        ctx.appSession.language_code = ctx.from.language_code
        ctx.appSession.is_bot = ctx.from.is_bot
        ctx.appSession.io = ctx.appSession.io || []
    }

    return next().then(() => {
        const ms = new Date() - start
        console.log('response time %sms', ms)
        console.log('\n')
    })
})

bot.catch((err) => {
    console.log('Ooops', err)
})

function getStatic(ctx) {
    return `Hello, ${ctx.from.first_name} ${ctx.from.last_name}
        
_Feel Free to ask any question. You can use the below commands as well_

/start - *list the commands*
/help - *list the commands*
/randomPicture - *shows a random picture*
/randomQuote - *shows a random quote*
/randomJoke - *shows a dad joke*
    `
}
// /nerdJoke - *shows a nerd joke from ICNDB at your expense*
// /explicitJoke - *shows an explicit joke from ICNDB at your expense*


bot.start((ctx) =>
    ctx.replyWithMarkdown(getStatic(ctx))
)
bot.help((ctx) =>
    ctx.replyWithMarkdown(getStatic(ctx))
)
bot.on('sticker', (ctx) =>
    ctx.reply('👍')
)

bot.command('randomPicture', (ctx) =>
    ctx.replyWithPhoto({
        url: 'https://picsum.photos/800/600/?random',
        filename: 'random.jpg'
    })
)

bot.command('randomQuote', (ctx) =>
    request('https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en', function (error, response, body) {
        if (error) {
            console.log('randomQuote', 'error:', error);
        }
        body = JSON.parse(body)
        ctx.reply(`
            ${body.quoteText}
- ${body.quoteAuthor}
        `)
    })
)

bot.command('nerdJoke', (ctx) =>
    request(`http://api.icndb.com/jokes/random?limitTo=[nerdy]&firstName=${ctx.appSession.first_name}&lastName=${ctx.appSession.last_name}`, function (error, response, body) {
        if (error) {
            console.log('nerdJoke', 'error:', error);
        }
        body = JSON.parse(body)
        ctx.reply(`
            ${body.value.joke}
        `)
    })
)

bot.command('explicitJoke', (ctx) =>
    request(`http://api.icndb.com/jokes/random?limitTo=[explicit]&firstName=${ctx.appSession.first_name}&lastName=${ctx.appSession.last_name}`, function (error, response, body) {
        if (error) {
            console.log('explicitJoke', 'error:', error);
        }
        body = JSON.parse(body)
        ctx.reply(`
            ${body.value.joke}
        `)
    })
)

bot.command('randomJoke', (ctx) => {
    request({
        url: 'https://icanhazdadjoke.com/',
        headers: {
            'Accept': 'application/json'
        }
    }, function (error, response, body) {
        if (error) {
            console.log('nerdJoke', 'error:', error);
        }
        body = JSON.parse(body)
        ctx.reply(`
            ${body.joke}
        `)
    })
})

// should be last
bot.on('message', (ctx) => {
    let apiaiReq = apiai.textRequest(ctx.message.text, {
        sessionId: ctx.chat.id
    });

    apiaiReq.on('response', (response) => {
        let aiText = response.result.fulfillment.speech;
        ctx.reply(aiText);

        ctx.appSession.io.push({
            i: ctx.message.text,
            o: aiText
        })
    });

    apiaiReq.on('error', function (error) {
        console.log('apiaiReq', error);
    });

    apiaiReq.end();
})

bot.action('delete', ({ deleteMessage }) => deleteMessage())

MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true }).then((client) => {
    const db = client.db();
    session = new TelegrafMongoSession(db, {
        collectionName: 'sessions',
        sessionName: 'appSession'
    });

    if (process.env.WEBHOOKS === 'true') {
        bot.telegram.setWebhook(`${URL}/bot${BOT_TOKEN}`)
        bot.startWebhook(`/bot${BOT_TOKEN}`, null, PORT)
    } else {
        bot.telegram.deleteWebhook()
        bot.startPolling()
    }
    console.log('Bot is up and running!');
});



