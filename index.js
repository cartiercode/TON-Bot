const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const Arweave = require('arweave');
const TonWeb = require('tonweb');
const CryptoJS = require('crypto-js');

const app = express();
const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
const arweaveWallet = JSON.parse(process.env.ARWEAVE_KEY);
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC'));

const moonWalletKey = TonWeb.utils.hexToBytes(process.env.MOONWALLET_TON_KEY);
const moonWallet = tonweb.wallet.create({ publicKey: TonWeb.utils.hexToBytes(process.env.MOONWALLET_TON_PUBLIC_KEY) });

const preseededWalletKey = TonWeb.utils.hexToBytes(process.env.PRESEEDED_TON_KEY);
const preseededWallet = tonweb.wallet.create({ publicKey: TonWeb.utils.hexToBytes(process.env.PRESEEDED_TON_PUBLIC_KEY) });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken);
bot.setWebHook(`https://jane-bot.onrender.com/bot${botToken}`); // Back to main API

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post(`/bot${botToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const walletTxIds = new Map();
const pendingPayments = new Map();

app.get('/api/wallet/:userId', async (req, res) => {
  const { userId } = req.params;
  const txId = walletTxIds.get(userId);
  if (txId) {
    try {
      const tx = await arweave.transactions.get(txId);
      const encryptedKey = tx.get('data', { decode: true, string: true });
      res.json({ encryptedKey });
    } catch (error) {
      res.status(500).send('Error fetching wallet: ' + error.message);
    }
  } else {
    res.status(404).send('Wallet not found');
  }
});

app.post('/api/wallet', async (req, res) => {
  const { userId, encryptedKey } = req.body;
  if (walletTxIds.has(userId)) {
    res.status(400).send('Wallet already exists for this user');
  } else if (!pendingPayments.has(userId)) {
    res.status(402).send('Payment required: 50 Stars');
  } else {
    try {
      const preseededAddress = await preseededWallet.getAddress();
      const userSeed = TonWeb.utils.hexToBytes(CryptoJS.SHA256(userId + pendingPayments.get(userId)).toString());
      const userKeyPair = tonweb.utils.keyPairFromSeed(userSeed);
      const userWallet = tonweb.wallet.create({ publicKey: userKeyPair.publicKey, version: 'v4R2' });
      const walletAddress = await userWallet.getAddress();

      const balance = await tonweb.getBalance(preseededAddress);
      if (TonWeb.utils.fromNano(balance) < 0.2) {
        await moonWallet.send({
          to: preseededAddress,
          value: TonWeb.utils.toNano('1'),
          secretKey: moonWalletKey
        });
      }

      const deployMessage = await userWallet.deploy(userKeyPair.secretKey);
      await preseededWallet.send({
        to: walletAddress,
        value: TonWeb.utils.toNano('0.1'),
        data: deployMessage.toBoc().toString('base64'),
        secretKey: preseededWalletKey
      });

      const transaction = await arweave.createTransaction({ data: encryptedKey }, arweaveWallet);
      transaction.addTag('App-Name', 'JANE');
      transaction.addTag('User-ID', userId);
      await arweave.transactions.sign(transaction, arweaveWallet);
      await arweave.transactions.post(transaction);
      walletTxIds.set(userId, transaction.id);
      pendingPayments.delete(userId);
      console.log(`Stored in Arweave: User ${userId}, TxID: ${transaction.id}`);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).send('Error storing wallet: ' + error.message);
    }
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Hi! I’m JANE (Testnet), your MoonWallet at moonwallet.ton. Click below to start!", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Open JANE", web_app: { url: "https://jane-bot.onrender.com" } }
      ]]
    }
  });
});

bot.on('message', (msg) => {
  if (msg.web_app_data && JSON.parse(msg.web_app_data.data).action === 'pay') {
    const { userId, encryptedKey } = JSON.parse(msg.web_app_data.data);
    bot.sendInvoice(msg.chat.id, "Wallet Creation", "Create a TON wallet", "wallet_payload", "", "XTR", [
      { label: "Wallet Fee", amount: 50 }
    ]);
  }
});

bot.on('pre_checkout_query', (query) => {
  const userId = query.from.id.toString();
  if (query.total_amount === 50) {
    bot.answerPreCheckoutQuery(query.id, true);
    pendingPayments.set(userId, CryptoJS.SHA256(userId + Date.now()).toString());
  } else {
    bot.answerPreCheckoutQuery(query.id, false, { error_message: 'Invalid amount' });
  }
});

bot.on('successful_payment', (msg) => {
  const userId = msg.from.id.toString();
  console.log(`Payment received: User ${userId}, 50 Stars`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
