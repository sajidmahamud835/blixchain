/**
 * Blixchain Mining Client
 * 
 * Connects to pool coordinator and performs client-side mining.
 * All heavy computation is done on the client.
 */

const WebSocket = require('ws');
const { calculateBlockHash, hashMeetsTarget } = require('../shared/crypto');
const { generateWallet, importWallet, isValidAddress } = require('../shared/wallet');
const PROTOCOL = require('../shared/protocol');

class MiningClient {
    constructor(options = {}) {
        this.poolUrl = options.poolUrl || 'ws://localhost:3030';
        this.wallet = options.wallet || null;
        this.ws = null;
        this.mining = false;
        this.currentChallenge = null;
        this.hashRate = 0;
        this.totalHashes = 0;
        this.blocksFound = 0;

        // Callbacks
        this.onBlockFound = options.onBlockFound || (() => { });
        this.onChallengeReceived = options.onChallengeReceived || (() => { });
        this.onPoolUpdate = options.onPoolUpdate || (() => { });
    }

    /**
     * Initialize wallet
     */
    initWallet(privateKey = null) {
        if (privateKey) {
            this.wallet = importWallet(privateKey);
        } else {
            this.wallet = generateWallet();
        }
        console.log(`🔐 Wallet: ${this.wallet.address}`);
        return this.wallet;
    }

    /**
     * Connect to pool
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (!this.wallet) {
                reject(new Error('Wallet not initialized. Call initWallet() first.'));
                return;
            }

            console.log(`🔌 Connecting to pool: ${this.poolUrl}`);

            this.ws = new WebSocket(this.poolUrl);

            this.ws.on('open', () => {
                console.log('✅ Connected to pool');

                // Join pool
                this.send('pool:join', {
                    walletAddress: this.wallet.address
                });

                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                } catch (err) {
                    console.error('Invalid message:', err);
                }
            });

            this.ws.on('close', () => {
                console.log('❌ Disconnected from pool');
                this.mining = false;
            });

            this.ws.on('error', (err) => {
                console.error('WebSocket error:', err.message);
                reject(err);
            });
        });
    }

    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        switch (message.type) {
            case 'pool:joined':
                console.log(`✅ Joined pool. Size: ${message.data.poolSize}`);
                console.log(`   Can mine: ${message.data.canMine}`);
                break;

            case 'pool:updated':
                this.onPoolUpdate(message.data);
                break;

            case 'challenge:new':
                console.log(`\n🎯 New challenge! Difficulty: ${message.data.difficulty}`);
                this.currentChallenge = message.data;
                this.onChallengeReceived(message.data);
                this.startMining();
                break;

            case 'block:mined':
                const isMine = message.data.miner === this.wallet.address;
                if (isMine) {
                    console.log(`\n🎉 YOU MINED A BLOCK! Height: ${message.data.block.index}`);
                    console.log(`   Reward: ${message.data.block.reward} BLIX`);
                    this.blocksFound++;
                    this.onBlockFound(message.data);
                } else {
                    console.log(`\n⛏️ Block mined by ${message.data.miner.slice(0, 12)}...`);
                }
                this.stopMining();
                break;

            case 'solution:rejected':
                console.log(`❌ Solution rejected: ${message.reason}`);
                break;

            case 'error':
                console.error(`⚠️ Error: ${message.message}`);
                break;
        }
    }

    /**
     * Send message to pool
     */
    send(type, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    /**
     * Start mining
     */
    startMining() {
        if (!this.currentChallenge || this.mining) return;

        this.mining = true;
        console.log('⛏️ Mining started...');

        const startTime = Date.now();
        let nonce = 0;
        let hashCount = 0;

        const mine = () => {
            if (!this.mining) return;

            // Do batch of hashes
            const batchSize = 1000;
            for (let i = 0; i < batchSize && this.mining; i++) {
                const block = {
                    ...this.currentChallenge.blockTemplate,
                    nonce,
                    miner: this.wallet.address
                };

                const hash = calculateBlockHash(block);
                hashCount++;
                this.totalHashes++;

                if (hashMeetsTarget(hash, this.currentChallenge.difficulty)) {
                    // Found solution!
                    console.log(`\n✨ Solution found! Nonce: ${nonce}`);
                    console.log(`   Hash: ${hash.slice(0, 20)}...`);

                    this.send('solution:submit', {
                        walletAddress: this.wallet.address,
                        nonce,
                        hash
                    });

                    this.mining = false;
                    return;
                }

                nonce++;
            }

            // Update hash rate every second
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0) {
                this.hashRate = Math.floor(hashCount / elapsed);
            }

            // Continue mining
            if (this.mining) {
                setImmediate(mine);
            }
        };

        mine();
    }

    /**
     * Stop mining
     */
    stopMining() {
        this.mining = false;
        this.currentChallenge = null;
    }

    /**
     * Get stats
     */
    getStats() {
        return {
            wallet: this.wallet?.address,
            hashRate: this.hashRate,
            totalHashes: this.totalHashes,
            blocksFound: this.blocksFound,
            mining: this.mining
        };
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.stopMining();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// CLI support
if (require.main === module) {
    const args = process.argv.slice(2);
    const poolUrl = args.find(a => a.startsWith('--pool='))?.slice(7) || 'ws://localhost:3030';
    const privateKey = args.find(a => a.startsWith('--key='))?.slice(6);

    const client = new MiningClient({ poolUrl });

    if (privateKey) {
        client.initWallet(privateKey);
    } else {
        console.log('No private key provided. Generating new wallet...');
        const wallet = client.initWallet();
        console.log('\n⚠️  Save your private key:', wallet.privateKey);
    }

    client.connect()
        .then(() => {
            console.log('\n📊 Waiting for mining challenges...\n');

            // Print stats every 10 seconds
            setInterval(() => {
                const stats = client.getStats();
                if (stats.mining) {
                    console.log(`   Hash rate: ${stats.hashRate} H/s | Total: ${stats.totalHashes}`);
                }
            }, 10000);
        })
        .catch(err => {
            console.error('Failed to connect:', err.message);
            process.exit(1);
        });

    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        client.disconnect();
        process.exit(0);
    });
}

module.exports = MiningClient;
