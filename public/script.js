console.log("JANE script loaded");

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const status = document.getElementById('status') || document.createElement('p');
const walletAddressDisplay = document.getElementById('walletAddress') || document.createElement('p');
if (!document.getElementById('status')) document.body.appendChild(status);
if (!document.getElementById('walletAddress')) document.body.appendChild(walletAddressDisplay);

let tonweb;
let wallet;

function waitForTonWeb(callback) {
    if (typeof TonWeb !== 'undefined') {
        console.log("TonWeb loaded:", typeof TonWeb);
        tonweb = new TonWeb();
        callback();
    } else {
        setTimeout(() => waitForTonWeb(callback), 100);
    }
}

waitForTonWeb(() => {
    const connectButton = document.getElementById('connectButton');
    if (connectButton) {
        connectButton.addEventListener('click', async () => {
            status.textContent = "Generating wallet with your Telegram ID...";
            try {
                // Use tg.initData as a seed (simplified, not cryptographically secure)
                const userId = tg.initDataUnsafe?.user?.id || "test-user";
                const seed = TonWeb.utils.sha256(userId); // Hash Telegram ID for seed
                const keyPair = tonweb.utils.keyPairFromSeed(seed);
                wallet = tonweb.wallet.create({ publicKey: keyPair.publicKey });

                const address = await wallet.getAddress();
                const addressString = address.toString(true, true, true); // User-friendly format
                status.textContent = "Wallet created!";
                walletAddressDisplay.textContent = `Your address: ${addressString}`;
                localStorage.setItem('janeWalletSecretKey', TonWeb.utils.bytesToHex(keyPair.secretKey));
            } catch (error) {
                status.textContent = "Error creating wallet: " + error.message;
            }
        });
    }

    const buyButton = document.getElementById('buyButton');
    if (buyButton) {
        buyButton.addEventListener('click', () => {
            if (!wallet) {
                status.textContent = "Please connect your wallet first.";
                return;
            }
            status.textContent = "Fiat-to-crypto coming soon...";
            // Placeholder for MoonPay or Stars integration
        });
    }

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
    if (tradeButton) {
        tradeButton.addEventListener('click', async () => {
            if (!wallet) {
                status.textContent = "Please connect your wallet first.";
                return;
            }
            const [tokenIn, tokenOut, poolAddress] = document.getElementById('tradePair').value.split(',');
            const amount = document.getElementById('tradeAmount').value || "1";
            const amountInNano = Math.floor(amount * 1e9);

            status.textContent = "Preparing STON.fi swap... (Note: Requires TON funding)";
            // Swap logic needs funded wallet and server-side signing for now
        });
    }
});
