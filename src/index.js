import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import  handle from './handlers.js';

import dotenv from 'dotenv';


dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN, {
   username: 'MyBot'
})

bot.telegram.getMe().then((botInfo) => {
  bot.options.username = botInfo.username
})

bot.start(async (ctx) => {
  await  handle.onStart(ctx,ctx.message)
})

bot.on('contact',  async (ctx) => {
  await handle.onContactReceived(ctx)
});


bot.on('message', async (ctx) => {
  await handle.onClinetMessage(ctx)
})



bot.on('callback_query', async (ctx) => {

  // Explicit usage
  return await handle.onCallbackQuery(ctx)
  //await ctx.telegram.answerCbQuery(ctx.callbackQuery.id)

  // Using context shortcut
  //await ctx.answerCbQuery()
})


bot.on('inline_query', async (ctx) => {
  const result = []
  // Explicit usage
  await ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

  // Using context shortcut
  await ctx.answerInlineQuery(result)
})

bot.launch()


/*
const wrapper = require('./wrapper');
const { onStart, onMessage } = require('./handlers');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const bot = new Telenode({
	apiToken: process.env.API_TOKEN,
	secretToken: process.env.SECRET_TOKEN,
});

bot.startLongPolling({ pollingDelay: 2000 }); // default is 1000ms

//bot.createServer({ port: 4000 });

bot.onTextMessage('/start', messageBody => wrapper(bot, messageBody, onStart));

bot.onTextMessage('', messageBody => wrapper(bot, messageBody, onMessage));

bot.onButton('', messageBody => wrapper(bot, messageBody, onMessage));*/