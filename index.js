const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const app = express();

// Telegram Bot setup
const botToken = process.env.TELEGRAM_BOT_TOKEN; // Add this in Render
const bot = new TelegramBot(botToken, { polling: true });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve Dynamic API key
app.get('/api/config', (req, res) => {
    res.json({ dynamicApiKey: process.env.DYNAMIC_API_KEY });
});

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Hi! I’m JANE, your guide to crypto. Click below to get started!", {
        reply_markup: {
            inline_keyboard: [[
                { text: "Open JANE App", web_app: { url: "https://telegram-mini-app.onrender.com" } }
            ]]
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
