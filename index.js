require('dotenv').config()
const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const session = require('telegraf/session')

const bot = new Telegraf(process.env.BOT_TOKEN)

// // Register session middleware
bot.use(session())

// Register logger middleware
bot.use((ctx, next) => {
    const start = new Date();
    console.log(ctx.update.message);
    return next().then(() => {
        const ms = new Date() - start
        console.log('response time %sms', ms)
    })
})

const keyboard = Markup.inlineKeyboard([
    Markup.urlButton('❤️', 'http://telegraf.js.org'),
    Markup.callbackButton('Delete', 'delete')
])

bot.catch((err) => {
    console.log('Ooops', err)
})

bot.start((ctx) =>
    ctx.reply(`Hello, ${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name}`)
)
bot.help((ctx) =>
    ctx.reply('Help message')
)

bot.on('sticker', (ctx) =>
    ctx.reply('👍')
)

// should be last
bot.on('message', (ctx) =>
    ctx.telegram.sendCopy(ctx.from.id, ctx.message, Extra.markup(keyboard))
)

bot.action('delete', ({ deleteMessage }) => deleteMessage())
bot.startPolling()