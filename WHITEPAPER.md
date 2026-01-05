# BLIXCHAIN

## A Decentralized Anonymous Ledger Protocol

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Protocol](https://img.shields.io/badge/Protocol-P2P-purple.svg)]()

---

## Abstract

Blixchain is a lightweight, anonymous, and decentralized digital currency protocol built on Node.js. It implements a unique hybrid architecture combining centralized pool coordination with client-side distributed computation and storage. The protocol emphasizes privacy through wallet-based anonymous authentication, requiring no personal information for participation.

This whitepaper describes the technical architecture, consensus mechanism, tokenomics, and security model of the Blixchain network.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Architecture](#2-core-architecture)
3. [Wallet System](#3-wallet-system)
4. [Consensus Mechanism](#4-consensus-mechanism)
5. [Mining Protocol](#5-mining-protocol)
6. [Tokenomics](#6-tokenomics)
7. [Transaction Model](#7-transaction-model)
8. [Network Topology](#8-network-topology)
9. [Security Model](#9-security-model)
10. [Technical Specifications](#10-technical-specifications)

---

## 1. Introduction

### 1.1 Vision

Blixchain addresses the need for a privacy-focused digital currency that:
- Requires **zero personal identification** for participation
- Distributes computational load to **client devices**
- Maintains **decentralized data storage** across all participants
- Implements **time-locked mining** to ensure fair distribution

### 1.2 Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Anonymity** | Wallet-only identification (public/private key pairs) |
| **Decentralization** | Client-side computation + distributed storage sharding |
| **Fairness** | Minimum 5-minute block time with exponential difficulty |
| **Efficiency** | Lightweight Node.js coordinator with heavy client computation |

---

## 2. Core Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLIXCHAIN NETWORK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  POOL COORDINATOR │ ◄──── Node.js Server                    │
│  │    (Blixnode)     │       - Manages pool membership         │
│  └────────┬─────────┘       - Broadcasts challenges            │
│           │                  - Validates solutions              │
│           │                  - Maintains chain state            │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    P2P CLIENT MESH                       │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │   │
│  │  │Client A│◄─►│Client B│◄─►│Client C│◄─►│Client D│        │   │
│  │  │ Wallet │  │ Wallet │  │ Wallet │  │ Wallet │        │   │
│  │  │ Shard  │  │ Shard  │  │ Shard  │  │ Shard  │        │   │
│  │  │ Miner  │  │ Miner  │  │ Miner  │  │ Miner  │        │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Pool Coordinator (Blixnode Server)

The central Node.js server acts as a **pool coordinator** responsible for:

| Function | Description |
|----------|-------------|
| **Pool Management** | Tracks connected wallets, enforces minimum pool size |
| **Challenge Broadcasting** | Issues cryptographic puzzles to miners |
| **Solution Validation** | Verifies proof-of-work submissions |
| **Chain State** | Maintains the canonical chain and broadcasts updates |
| **Transaction Relay** | Receives and validates pending transactions |

```javascript
// Blixnode Server Structure
class BlixnodeServer {
    constructor() {
        this.connectedWallets = new Map();  // wallet_id -> connection
        this.pendingTransactions = [];
        this.currentChallenge = null;
        this.chainState = new ChainState();
        this.miningPool = new MiningPool();
    }

    // Minimum 2 wallets required to start mining
    static MIN_POOL_SIZE = 2;

    canStartMining() {
        return this.connectedWallets.size >= BlixnodeServer.MIN_POOL_SIZE;
    }
}
```

### 2.3 Client Nodes

Each client is a **full participant** in the network:

1. **Wallet Holder** — Stores private keys, signs transactions
2. **Shard Storage** — Holds partial network data (distributed ledger)
3. **Miner** — Performs computational work to solve challenges
4. **Relay** — Propagates transactions and blocks to peers

---

## 3. Wallet System

### 3.1 Anonymous Authentication

Blixchain uses **wallet-based anonymous authentication**. No email, phone, or identity is required.

```
┌─────────────────────────────────────────────────────────┐
│                   WALLET GENERATION                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Generate 256-bit Random Entropy                     │
│                    ▼                                    │
│  2. Derive Private Key (secp256k1)                      │
│                    ▼                                    │
│  3. Compute Public Key from Private Key                 │
│                    ▼                                    │
│  4. Hash Public Key (SHA-256 + RIPEMD-160)             │
│                    ▼                                    │
│  5. Encode as Blix Address (Base58Check)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Key Pair Specification

```javascript
// Wallet Generation Algorithm
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

function generateWallet() {
    // Step 1: Generate 256-bit private key
    let privateKey;
    do {
        privateKey = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privateKey));

    // Step 2: Derive public key (compressed)
    const publicKey = secp256k1.publicKeyCreate(privateKey, true);

    // Step 3: Create wallet address
    const sha256Hash = crypto.createHash('sha256').update(publicKey).digest();
    const ripemdHash = crypto.createHash('ripemd160').update(sha256Hash).digest();
    
    // Step 4: Add network prefix and checksum (Base58Check)
    const walletAddress = encodeBase58Check(Buffer.concat([
        Buffer.from([0x42]), // 'B' prefix for Blix
        ripemdHash
    ]));

    return {
        privateKey: privateKey.toString('hex'),
        publicKey: publicKey.toString('hex'),
        address: walletAddress
    };
}
```

### 3.3 Address Format

| Component | Size | Description |
|-----------|------|-------------|
| Version Byte | 1 byte | `0x42` (ASCII 'B' for Blix) |
| Public Key Hash | 20 bytes | RIPEMD160(SHA256(publicKey)) |
| Checksum | 4 bytes | First 4 bytes of double SHA256 |

**Example Address:** `BLX1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s`

### 3.4 Authorization

Private key signing is **required** for:
- Transferring tokens
- Joining mining pools
- Signing transactions

```javascript
// Transaction Authorization
function authorizeTransaction(transaction, privateKey) {
    const messageHash = sha256(JSON.stringify(transaction));
    const signature = secp256k1.ecdsaSign(messageHash, privateKey);
    
    return {
        ...transaction,
        signature: signature.signature.toString('hex'),
        recoveryId: signature.recid
    };
}
```

---

## 4. Consensus Mechanism

### 4.1 Hybrid Proof-of-Work (HPoW)

Blixchain implements a **Hybrid Proof-of-Work** consensus:

1. **Server-Coordinated Challenges** — Pool coordinator issues mining puzzles
2. **Client-Side Computation** — All cryptographic work performed on clients
3. **Solution Verification** — Server validates and broadcasts winning solution

### 4.2 Block Structure

```javascript
const BlockSchema = {
    index: Number,           // Block height
    timestamp: Number,       // Unix timestamp (ms)
    previousHash: String,    // SHA-256 of previous block
    merkleRoot: String,      // Root of transaction Merkle tree
    nonce: Number,           // Solution to mining puzzle
    difficulty: Number,      // Current network difficulty
    miner: String,           // Winning miner's wallet address
    transactions: Array,     // List of transactions
    hash: String             // SHA-256 of block header
};
```

### 4.3 Block Time Target

| Parameter | Value |
|-----------|-------|
| **Minimum Block Time** | 300 seconds (5 minutes) |
| **Target Block Time** | 300-600 seconds |
| **Difficulty Adjustment** | Every 10 blocks |

---

## 5. Mining Protocol

### 5.1 Pool Requirements

```javascript
// Mining pool constraints
const POOL_CONSTRAINTS = {
    MIN_WALLETS: 2,           // Minimum wallets to start mining
    MIN_BLOCK_TIME: 300000,   // 5 minutes in milliseconds
    DIFFICULTY_ADJUSTMENT_INTERVAL: 10  // blocks
};
```

> ⚠️ **CRITICAL:** Mining cannot begin until at least 2 wallets are connected to the pool.

### 5.2 Difficulty Adjustment Algorithm

The difficulty grows **exponentially** based on:
1. **Total Supply** — More tokens = higher difficulty
2. **Time Elapsed** — Network age increases difficulty
3. **Block Time Variance** — Adjusts to maintain 5-minute target

```javascript
/**
 * Difficulty Adjustment Algorithm
 * 
 * D(n) = D(0) × (1 + α)^(S/S₀) × (1 + β)^(T/T₀) × γ
 * 
 * Where:
 *   D(n)  = New difficulty
 *   D(0)  = Base difficulty (1.0)
 *   S     = Current total supply
 *   S₀    = Supply constant (1,000,000)
 *   T     = Time since genesis (seconds)
 *   T₀    = Time constant (86400 = 1 day)
 *   α     = Supply growth factor (0.0001)
 *   β     = Time growth factor (0.00005)
 *   γ     = Block time adjustment multiplier
 */

function calculateDifficulty(chainState) {
    const D0 = 1.0;                           // Base difficulty
    const S0 = 1_000_000;                      // Supply constant
    const T0 = 86400;                          // Time constant (1 day)
    const alpha = 0.0001;                      // Supply growth factor
    const beta = 0.00005;                      // Time growth factor

    const S = chainState.totalSupply;
    const T = (Date.now() - chainState.genesisTime) / 1000;

    // Supply component (exponential growth)
    const supplyFactor = Math.pow(1 + alpha, S / S0);

    // Time component (exponential growth)
    const timeFactor = Math.pow(1 + beta, T / T0);

    // Block time adjustment
    const recentBlocks = chainState.getRecentBlocks(10);
    const avgBlockTime = calculateAverageBlockTime(recentBlocks);
    const gamma = (avgBlockTime < 300) ? 1.1 : (avgBlockTime > 600) ? 0.9 : 1.0;

    const newDifficulty = D0 * supplyFactor * timeFactor * gamma;

    return Math.max(1, Math.floor(newDifficulty));
}
```

### 5.3 Client-Side Mining Puzzle

The mining puzzle is **entirely computed on the client**:

```javascript
/**
 * Client-Side Mining Challenge
 * 
 * The client must find a nonce such that:
 *   SHA256(SHA256(blockHeader + nonce)) < target
 * 
 * Where target = MAX_HASH / difficulty
 */

class MiningChallenge {
    constructor(blockHeader, difficulty) {
        this.blockHeader = blockHeader;
        this.difficulty = difficulty;
        this.target = this.calculateTarget();
    }

    calculateTarget() {
        // 256-bit max value / difficulty
        const MAX_HASH = BigInt('0x' + 'f'.repeat(64));
        return MAX_HASH / BigInt(this.difficulty);
    }

    /**
     * CLIENT-SIDE COMPUTATION
     * This is the heavy lifting performed by miners
     */
    mine() {
        let nonce = 0;
        const startTime = Date.now();
        const MIN_MINING_TIME = 300000; // 5 minutes

        while (true) {
            const hash = this.computeHash(nonce);
            const hashValue = BigInt('0x' + hash);

            if (hashValue < this.target) {
                // Enforce minimum mining time
                const elapsed = Date.now() - startTime;
                if (elapsed < MIN_MINING_TIME) {
                    // Wait remaining time (difficulty was too low)
                    continue;
                }

                return {
                    nonce,
                    hash,
                    timestamp: Date.now(),
                    computationTime: elapsed
                };
            }

            nonce++;
        }
    }

    computeHash(nonce) {
        const data = this.blockHeader + nonce.toString();
        const firstHash = crypto.createHash('sha256').update(data).digest();
        const secondHash = crypto.createHash('sha256').update(firstHash).digest('hex');
        return secondHash;
    }
}
```

### 5.4 Mining Flow

```
┌────────────────────────────────────────────────────────────────┐
│                       MINING WORKFLOW                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. CLIENT connects to Pool Coordinator                        │
│              ▼                                                 │
│  2. SERVER checks: connectedWallets >= 2 ?                    │
│              ▼                                                 │
│  3. SERVER broadcasts Challenge (blockHeader + difficulty)     │
│              ▼                                                 │
│  4. CLIENTS compute SHA256 puzzles locally                     │
│     ┌────────────────────────────────────────────────┐        │
│     │  while (hash > target) {                       │        │
│     │      nonce++;                                  │        │
│     │      hash = SHA256(SHA256(header + nonce));   │        │
│     │  }                                             │        │
│     └────────────────────────────────────────────────┘        │
│              ▼                                                 │
│  5. FIRST valid solution submitted to server                   │
│              ▼                                                 │
│  6. SERVER validates solution                                  │
│              ▼                                                 │
│  7. SERVER adds block to chain, broadcasts update              │
│              ▼                                                 │
│  8. MINER receives block reward + transaction fees             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Tokenomics

### 6.1 Token Specification

| Property | Value |
|----------|-------|
| **Token Name** | Blix Token |
| **Symbol** | BLIX |
| **Decimals** | 8 |
| **Max Supply** | Unlimited (deflationary through burns) |
| **Initial Supply** | 0 (all tokens mined) |

### 6.2 Block Reward Schedule

```javascript
/**
 * Block Reward Calculation
 * 
 * Reward halves every 210,000 blocks (~2 years at 5 min/block)
 */
function calculateBlockReward(blockHeight) {
    const INITIAL_REWARD = 50;  // 50 BLIX
    const HALVING_INTERVAL = 210_000;
    
    const halvings = Math.floor(blockHeight / HALVING_INTERVAL);
    const reward = INITIAL_REWARD / Math.pow(2, halvings);
    
    return Math.max(reward, 0.00000001);  // Minimum 1 satoshi
}
```

### 6.3 Transaction Fee Distribution

```
┌─────────────────────────────────────────────────────────┐
│              TRANSACTION FEE DISTRIBUTION               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Transaction Fee (100%)                                 │
│           │                                             │
│           ├──────────────────┬──────────────────┐      │
│           ▼                  ▼                  ▼      │
│    ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│    │   MINERS     │  │    BURN      │  │  TREASURY  │ │
│    │    70%       │  │    20%       │  │    10%     │ │
│    └──────────────┘  └──────────────┘  └────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

```javascript
const FEE_DISTRIBUTION = {
    MINERS: 0.70,      // 70% to block miner
    BURN: 0.20,        // 20% permanently burned (deflationary)
    TREASURY: 0.10     // 10% to network treasury
};

function distributeFees(totalFees) {
    return {
        toMiner: totalFees * FEE_DISTRIBUTION.MINERS,
        toBurn: totalFees * FEE_DISTRIBUTION.BURN,
        toTreasury: totalFees * FEE_DISTRIBUTION.TREASURY
    };
}
```

---

## 7. Transaction Model

### 7.1 Transaction Schema

```javascript
const TransactionSchema = {
    id: String,              // SHA256 hash of transaction data
    version: Number,         // Protocol version
    timestamp: Number,       // Creation time
    sender: String,          // Sender's wallet address
    recipient: String,       // Recipient's wallet address
    amount: Number,          // Amount in BLIX (8 decimals)
    fee: Number,             // Transaction fee
    signature: String,       // ECDSA signature
    publicKey: String,       // Sender's public key
    memo: String             // Optional message (max 256 bytes)
};
```

### 7.2 Transaction Validation (Client-Side)

```javascript
/**
 * CLIENT-SIDE TRANSACTION VALIDATION
 * 
 * The heavy cryptographic work is performed on the client
 */
function validateTransaction(tx) {
    const validations = [
        // 1. Verify signature
        () => verifySignature(tx),
        
        // 2. Verify sender has sufficient balance
        () => checkBalance(tx.sender, tx.amount + tx.fee),
        
        // 3. Verify transaction hash
        () => verifyTransactionHash(tx),
        
        // 4. Verify amount > 0
        () => tx.amount > 0,
        
        // 5. Verify fee >= minimum
        () => tx.fee >= MIN_TRANSACTION_FEE
    ];

    return validations.every(check => check());
}

function verifySignature(tx) {
    const message = createTransactionMessage(tx);
    const messageHash = sha256(message);
    
    return secp256k1.ecdsaVerify(
        Buffer.from(tx.signature, 'hex'),
        messageHash,
        Buffer.from(tx.publicKey, 'hex')
    );
}
```

### 7.3 Minimum Transaction Fee

```javascript
// Dynamic fee calculation based on network congestion
function calculateMinimumFee(txSize, congestionLevel) {
    const BASE_FEE = 0.0001;  // 0.0001 BLIX
    const SIZE_FACTOR = txSize / 1000;  // Fee per KB
    const CONGESTION_MULTIPLIER = 1 + (congestionLevel * 0.1);
    
    return BASE_FEE * SIZE_FACTOR * CONGESTION_MULTIPLIER;
}
```

---

## 8. Network Topology

### 8.1 Distributed Storage (Sharding)

Each client stores a **partial copy** of the blockchain:

```javascript
/**
 * SHARD ASSIGNMENT ALGORITHM
 * 
 * Each client is assigned shards based on wallet address hash
 */
class ShardManager {
    constructor(walletAddress, totalShards = 256) {
        this.walletAddress = walletAddress;
        this.totalShards = totalShards;
        this.assignedShards = this.calculateShards();
    }

    calculateShards() {
        const hash = sha256(this.walletAddress);
        const startShard = parseInt(hash.slice(0, 4), 16) % this.totalShards;
        const shardCount = Math.floor(this.totalShards / 8);  // Each client holds ~12.5%
        
        const shards = [];
        for (let i = 0; i < shardCount; i++) {
            shards.push((startShard + i) % this.totalShards);
        }
        return shards;
    }

    // Store block data in assigned shards
    storeBlock(block) {
        const blockShard = parseInt(block.hash.slice(0, 4), 16) % this.totalShards;
        if (this.assignedShards.includes(blockShard)) {
            return this.localStorage.save(block);
        }
        return null;
    }
}
```

### 8.2 Data Replication

| Metric | Value |
|--------|-------|
| **Shard Count** | 256 |
| **Replication Factor** | 8 (each shard stored by ~8 clients) |
| **Client Storage** | ~12.5% of total chain |

---

## 9. Security Model

### 9.1 Attack Vectors & Mitigations

| Attack | Mitigation |
|--------|------------|
| **51% Attack** | Difficulty growth + minimum pool size requirement |
| **Sybil Attack** | Computational cost of mining prevents mass key generation |
| **Double Spend** | 6 confirmation requirement before transaction finality |
| **MITM** | All communications signed with wallet keys |
| **Replay Attack** | Transaction IDs include timestamp and are unique |

### 9.2 Cryptographic Primitives

| Function | Algorithm |
|----------|-----------|
| **Private Key** | secp256k1 (256-bit) |
| **Hashing** | SHA-256, RIPEMD-160 |
| **Signatures** | ECDSA |
| **Address Encoding** | Base58Check |

---

## 10. Technical Specifications

### 10.1 API Endpoints

```
POST   /pool/join              - Join mining pool with wallet
POST   /pool/leave             - Leave mining pool
GET    /pool/status            - Get pool status and connected miners

POST   /transaction/submit     - Submit signed transaction
GET    /transaction/:id        - Get transaction details
GET    /transaction/pending    - Get pending transactions

GET    /block/:height          - Get block by height
GET    /block/latest           - Get latest block
GET    /chain/status           - Get chain state

POST   /wallet/balance         - Get wallet balance (requires signature)
```

### 10.2 WebSocket Events

```javascript
// Server -> Client
'challenge:new'        // New mining challenge issued
'block:mined'          // New block added to chain
'transaction:confirmed'// Transaction confirmed in block
'pool:updated'         // Pool membership changed

// Client -> Server
'solution:submit'      // Submit mining solution
'transaction:new'      // Broadcast new transaction
```

### 10.3 Recommended Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 2 GB | 8 GB |
| **Storage** | 10 GB SSD | 50 GB SSD |
| **Network** | 10 Mbps | 100 Mbps |

---

## Appendix A: Genesis Block

```javascript
const GENESIS_BLOCK = {
    index: 0,
    timestamp: 1735912800000,  // 2025-01-03 00:00:00 UTC
    previousHash: '0'.repeat(64),
    merkleRoot: '0'.repeat(64),
    nonce: 0,
    difficulty: 1,
    miner: 'BLIX_GENESIS',
    transactions: [],
    hash: sha256(/* genesis data */)
};
```

---

## Appendix B: Protocol Constants

```javascript
const PROTOCOL = {
    VERSION: '1.0.0',
    NETWORK_ID: 'BLIXCHAIN_MAINNET',
    
    // Mining
    MIN_POOL_SIZE: 2,
    MIN_BLOCK_TIME_MS: 300000,
    DIFFICULTY_ADJUSTMENT_BLOCKS: 10,
    
    // Tokenomics
    INITIAL_BLOCK_REWARD: 50,
    HALVING_INTERVAL: 210000,
    DECIMALS: 8,
    
    // Fees
    MIN_TRANSACTION_FEE: 0.0001,
    FEE_TO_MINERS: 0.70,
    FEE_TO_BURN: 0.20,
    FEE_TO_TREASURY: 0.10,
    
    // P2P
    SHARD_COUNT: 256,
    CONFIRMATIONS_REQUIRED: 6
};
```

---

## License

MIT License

Copyright (c) 2026 Blixchain Foundation

---

<p align="center">
  <b>Blixchain — Anonymous. Decentralized. Fair.</b>
</p>
