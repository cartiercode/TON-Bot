console.log("JANE script loaded");

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status') || document.createElement('p');
const walletAddressDisplay = document.getElementById('walletAddress') || document.createElement('p');
if (!document.getElementById('status')) document.body.appendChild(status);
if (!document.getElementById('walletAddress')) document.body.appendChild(walletAddressDisplay);

let tonweb;

function waitForTonWeb(callback) {
    if (typeof TonWeb !== 'undefined' && typeof CryptoJS !== 'undefined') {
        console.log("TonWeb loaded:", typeof TonWeb);
        tonweb = new TonWeb();
        callback();
    } else {
        setTimeout(() => waitForTonWeb(callback), 100);
    }
}

waitForTonWeb(() => {
    const connectButton = document.getElementById('connectButton');
    const passwordInput = document.getElementById('password');

    connectButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (!password) {
            status.textContent = "Please enter a password.";
            return;
        }

        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id || !user.phone_number) {
            status.textContent = "Please log in with a Telegram account that has a registered phone number.";
            return;
        }
        const userId = user.id;
        const phoneHash = CryptoJS.SHA256(user.phone_number).toString();

        status.textContent = "Checking wallet...";
        try {
            const response = await fetch(`/api/wallet/${userId}`);
            if (response.ok) {
                const { encryptedKey } = await response.json();
                const decryptedKey = CryptoJS.AES.decrypt(encryptedKey, password + phoneHash).toString(CryptoJS.enc.Utf8);
                const keyPair = JSON.parse(decryptedKey);
                const wallet = tonweb.wallet.create({ publicKey: TonWeb.utils.hexToBytes(keyPair.publicKey), version: 'v4R2' });
                const address = await wallet.getAddress();
                status.textContent = "Wallet loaded!";
                walletAddressDisplay.textContent = `Your MoonWallet: ${address.toString(true, true, true)}`;
            } else if (response.status === 402) {
                status.textContent = "Pay 50 Stars to create your wallet...";
                tg.openInvoice('https://t.me/$JANEbot?start=wallet_payment_' + userId);
            } else {
                status.textContent = "Creating new wallet... Pay 50 Stars.";
                tg.openInvoice('https://t.me/$JANEbot?start=wallet_payment_' + userId);
            }
        } catch (error) {
            status.textContent = "Error: " + error.message;
        }
    });

    const buyButton = document.getElementById('buyButton');
    buyButton.addEventListener('click', async () => {
        const address = walletAddressDisplay.textContent.split(': ')[1];
        if (!address) {
            status.textContent = "Please connect your wallet first.";
            return;
        }
        status.textContent = "Opening MoonPay to buy TON...";
        const moonPayUrl = `https://buy.moonpay.com?apiKey=[YOUR_MOONPAY_API_KEY]¤cyCode=TON&walletAddress=${address}`;
        tg.openLink(moonPayUrl);
    });

    async function fetchStonFiPools() {
        try {
            const response = await fetch('https://api.ston.fi/v1/pools');
            const data = await response.json();
            return data.pools;
        } catch (error) {
            status.textContent = "Failed to fetch STON.fi pools: " + error.message;
            return [];
        }
    }

    fetchStonFiPools().then(pools => {
        const select = document.getElementById('tradePair');
        if (select) {
            pools.forEach(pool => {
                const option = document.createElement('option');
                option.value = `${pool.token0_address},${pool.token1_address},${pool.pool_address}`;
                option.textContent = `${pool.token0_symbol}/${pool.token1_symbol}`;
                select.appendChild(option);
            });
        }
    });

    const tradeButton = document.getElementById('tradeButton');
    tradeButton.addEventListener('click', async () => {
        const address = walletAddressDisplay.textContent.split(': ')[1];
        if (!address) {
            status.textContent = "Please connect your wallet first.";
            return;
        }
        status.textContent = "STON.fi trading requires funding first.";
        // Add server-side signing logic later
    });
});
