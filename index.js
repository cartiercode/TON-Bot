const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => {
    res.json({ dynamicApiKey: process.env.DYNAMIC_API_KEY });
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Hi! I’m JANE, your guide to crypto. Click below to get started!", {
        reply_markup: {
            inline_keyboard: [[
                { text: "Open JANE App", web_app: { url: "https://jane-bot.onrender.com" } }
            ]]
        }
    });
});

bot.on('polling_error', (error) => {
    console.error("Polling error:", error.message);
    if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        console.log("Restarting polling due to conflict...");
        bot.stopPolling().then(() => bot.startPolling());
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
