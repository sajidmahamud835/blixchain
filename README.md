# Blixchain

> A Decentralized Anonymous Ledger Protocol

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Protocol](https://img.shields.io/badge/Protocol-P2P-purple.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

Blixchain is a privacy-first cryptocurrency protocol built on Node.js. It implements a unique hybrid architecture with:

- 🔐 **Anonymous Wallet Authentication** — No personal data required
- ⛏️ **Client-Side Mining** — All computation on user devices
- 🌐 **Distributed Storage** — Each client stores partial chain data
- ⏱️ **Time-Locked Blocks** — Minimum 5 minutes per block

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/sajidmahamud835/blixchain.git
cd blixchain

# Install dependencies
npm install

# Start the pool coordinator
npm run start:server

# Start a client node
npm run start:client
```

### Create a Wallet

```bash
npm run wallet:create
```

Output:
```
✓ Wallet Generated
  Address: BLX1a2b3c4d5e6f7g8h9i0j1k2...
  Private Key: [KEEP SECRET]
  Public Key: 04a1b2c3d4e5f6...
```

### Join Mining Pool

```bash
npm run mine --wallet <YOUR_ADDRESS>
```

## Architecture

```
┌──────────────────┐
│  Pool Coordinator │  ← Node.js Server
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Client A│ │Client B│  ← Miners + Storage
└────────┘ └────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Anonymous** | Wallet-only identification (public/private keys) |
| **Decentralized** | Client-side mining + distributed storage |
| **Fair Mining** | Minimum 2 wallets, 5-min block time |
| **Deflationary** | 20% of fees burned permanently |

## Tokenomics

- **Symbol:** BLIX
- **Decimals:** 8
- **Initial Supply:** 0 (all mined)
- **Block Reward:** 50 BLIX (halves every 210,000 blocks)

### Fee Distribution

| Recipient | Share |
|-----------|-------|
| Miners | 70% |
| Burn | 20% |
| Treasury | 10% |

## Mining Requirements

- **Minimum Pool Size:** 2 wallets
- **Minimum Block Time:** 5 minutes
- **Difficulty:** Grows exponentially with supply + time

## Documentation

- 📄 [Whitepaper](./WHITEPAPER.md) — Full technical specification
- 🔧 [API Reference](./docs/API.md) — Server endpoints
- 🛠️ [Development Guide](./docs/DEVELOPMENT.md)

## Project Structure

```
blixchain/
├── src/
│   ├── server/           # Pool coordinator (Node.js)
│   │   ├── index.js
│   │   ├── pool.js
│   │   └── chain.js
│   ├── client/           # Client node + miner
│   │   ├── wallet.js
│   │   ├── miner.js
│   │   └── storage.js
│   └── shared/           # Common utilities
│       ├── crypto.js
│       └── protocol.js
├── WHITEPAPER.md
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Blixchain — Anonymous. Decentralized. Fair.</b>
</p>
