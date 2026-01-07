# How to Mine Blixchain (BLX)

Welcome to the Blixchain mining guide! This document explains how to connect to the Blixchain mining pool and start earning BLX tokens.

## Prerequisites

- **Node.js** 18+ installed
- **Internet connection** to reach the pool server
- Basic command line knowledge

## Quick Start

### 1. Clone the Blixchain Miner

```bash
git clone https://github.com/sajidmahamud835/blixchain.git
cd blixchain
npm install
```

### 2. Configure Your Wallet

Create a new wallet or use an existing one:

```javascript
// Generate a new wallet
const { generateWallet } = require('./src/shared/wallet');
const wallet = generateWallet();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
// SAVE YOUR PRIVATE KEY SECURELY!
```

### 3. Start Mining

```bash
# Connect to the default pool
node src/miner/index.js --wallet YOUR_WALLET_ADDRESS

# Or specify a custom pool
node src/miner/index.js --wallet YOUR_WALLET_ADDRESS --pool ws://pool.blixchain.io:8080
```

## Mining Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--wallet` | Required | Your BLX wallet address |
| `--pool` | `ws://localhost:8080` | Pool WebSocket URL |
| `--threads` | Auto | CPU threads to use |

## Pool Statistics

The pool server provides real-time stats at:

- **Pool Status**: `GET /pool/status`
- **Your Balance**: `GET /address/:address/balance`
- **Block Info**: `GET /block/:height`

## Reward Structure

- **Block Reward**: Starts at 50 BLX, halves every 210,000 blocks
- **Pool Fee**: 1% of block rewards
- **Payout**: Automatic when balance ≥ 0.1 BLX

## Troubleshooting

### "Connection refused"
- Ensure the pool server is running
- Check firewall settings
- Verify the pool URL

### "Invalid wallet address"
- BLX addresses start with `BLX`
- Addresses are 32 characters long
- Check for typos

### "Difficulty too high"
- Normal behavior during network growth
- Your hashrate determines earnings
- Be patient!

## Security Tips

1. **Never share your private key**
2. Back up your wallet securely
3. Use a dedicated mining machine
4. Monitor your earnings regularly

## Support

- GitHub Issues: [github.com/sajidmahamud835/blixchain/issues](https://github.com/sajidmahamud835/blixchain/issues)
- Documentation: [README.md](./README.md)

---

*Happy Mining! 🚀*
