/**
 * Blixchain Pool Coordinator Server
 * 
 * Central coordinator for the mining pool.
 * Manages connected wallets, issues challenges, and validates solutions.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PROTOCOL = require('../shared/protocol');
const {
    sha256,
    doubleSha256,
    calculateMerkleRoot,
    calculateBlockHash,
    hashMeetsTarget
} = require('../shared/crypto');
const { isValidAddress } = require('../shared/wallet');

class BlixnodeServer {
    constructor(port = 3030) {
        this.port = port;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        // State
        this.connectedWallets = new Map();  // walletAddress -> { ws, joinedAt }
        this.pendingTransactions = [];
        this.chain = [];
        this.currentChallenge = null;
        this.miningInProgress = false;

        // Chain state
        this.genesisTime = Date.now();
        this.totalSupply = 0;
        this.difficulty = 1;

        // Initialize
        this.setupRoutes();
        this.setupWebSocket();
        this.createGenesisBlock();
    }

    /**
     * Create genesis block
     */
    createGenesisBlock() {
        const genesis = {
            index: 0,
            timestamp: this.genesisTime,
            previousHash: '0'.repeat(64),
            merkleRoot: sha256('genesis'),
            nonce: 0,
            difficulty: 1,
            miner: 'BLIX_GENESIS',
            transactions: [],
            hash: ''
        };
        genesis.hash = calculateBlockHash(genesis);
        this.chain.push(genesis);
        console.log(`📦 Genesis block created: ${genesis.hash.slice(0, 16)}...`);
    }

    /**
     * Setup REST API routes
     */
    setupRoutes() {
        this.app.use(express.json());

        // Pool status
        this.app.get('/pool/status', (req, res) => {
            res.json({
                success: true,
                data: {
                    connectedWallets: this.connectedWallets.size,
                    minPoolSize: PROTOCOL.MIN_POOL_SIZE,
                    canMine: this.canStartMining(),
                    miningInProgress: this.miningInProgress,
                    currentDifficulty: this.difficulty,
                    chainHeight: this.chain.length,
                    totalSupply: this.totalSupply,
                    pendingTransactions: this.pendingTransactions.length
                }
            });
        });

        // Get latest block
        this.app.get('/block/latest', (req, res) => {
            res.json({
                success: true,
                data: this.chain[this.chain.length - 1]
            });
        });

        // Get block by height
        this.app.get('/block/:height', (req, res) => {
            const height = parseInt(req.params.height);
            if (height >= 0 && height < this.chain.length) {
                res.json({ success: true, data: this.chain[height] });
            } else {
                res.status(404).json({ success: false, message: 'Block not found' });
            }
        });

        // Chain status
        this.app.get('/chain/status', (req, res) => {
            res.json({
                success: true,
                data: {
                    height: this.chain.length,
                    difficulty: this.difficulty,
                    totalSupply: this.totalSupply,
                    genesisTime: this.genesisTime,
                    latestBlock: this.chain[this.chain.length - 1]?.hash
                }
            });
        });

        // Submit transaction
        this.app.post('/transaction/submit', (req, res) => {
            const tx = req.body;

            if (!this.validateTransaction(tx)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction'
                });
            }

            tx.id = sha256(JSON.stringify(tx) + Date.now());
            this.pendingTransactions.push(tx);

            // Broadcast to miners
            this.broadcast('transaction:new', tx);

            res.json({ success: true, transactionId: tx.id });
        });

        // Get pending transactions
        this.app.get('/transaction/pending', (req, res) => {
            res.json({
                success: true,
                data: this.pendingTransactions
            });
        });

        // Get address balance
        this.app.get('/address/:address/balance', (req, res) => {
            const { address } = req.params;
            let balance = 0;

            // Scan chain (inefficient but works for prototype)
            for (const block of this.chain) {
                for (const tx of block.transactions) {
                    if (tx.recipient === address) {
                        balance += tx.amount;
                    }
                    if (tx.sender === address) {
                        balance -= (tx.amount + tx.fee);
                    }
                }
                // Check block reward
                if (block.miner === address) {
                    balance += block.reward;
                }
            }

            res.json({ success: true, data: { address, balance } });
        });
    }

    /**
     * Setup WebSocket for mining coordination
     */
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            let walletAddress = null;

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message, (addr) => {
                        walletAddress = addr;
                    });
                } catch (err) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                if (walletAddress) {
                    this.connectedWallets.delete(walletAddress);
                    console.log(`👋 Wallet disconnected: ${walletAddress.slice(0, 12)}...`);
                    this.broadcast('pool:updated', {
                        connectedWallets: this.connectedWallets.size
                    });
                }
            });
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(ws, message, setWalletAddress) {
        switch (message.type) {
            case 'pool:join':
                this.handlePoolJoin(ws, message, setWalletAddress);
                break;

            case 'solution:submit':
                this.handleSolutionSubmit(ws, message);
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    /**
     * Handle pool join request
     */
    handlePoolJoin(ws, message, setWalletAddress) {
        const { walletAddress } = message;

        if (!isValidAddress(walletAddress)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid wallet address'
            }));
            return;
        }

        if (this.connectedWallets.has(walletAddress)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Wallet already connected'
            }));
            return;
        }

        this.connectedWallets.set(walletAddress, {
            ws,
            joinedAt: Date.now()
        });

        setWalletAddress(walletAddress);

        console.log(`✅ Wallet joined pool: ${walletAddress.slice(0, 12)}...`);

        ws.send(JSON.stringify({
            type: 'pool:joined',
            data: {
                walletAddress,
                poolSize: this.connectedWallets.size,
                canMine: this.canStartMining()
            }
        }));

        // Broadcast pool update
        this.broadcast('pool:updated', {
            connectedWallets: this.connectedWallets.size,
            canMine: this.canStartMining()
        });

        // Start mining if we have enough wallets
        if (this.canStartMining() && !this.miningInProgress) {
            this.startMiningRound();
        }
    }

    /**
     * Handle solution submission from miner
     */
    handleSolutionSubmit(ws, message) {
        const { walletAddress, nonce, hash } = message;

        if (!this.currentChallenge) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'No active challenge'
            }));
            return;
        }

        // Verify the solution
        const block = {
            ...this.currentChallenge.blockTemplate,
            nonce,
            miner: walletAddress
        };

        const calculatedHash = calculateBlockHash(block);

        if (calculatedHash !== hash) {
            ws.send(JSON.stringify({
                type: 'solution:rejected',
                reason: 'Hash mismatch'
            }));
            return;
        }

        if (!hashMeetsTarget(hash, this.difficulty)) {
            ws.send(JSON.stringify({
                type: 'solution:rejected',
                reason: 'Does not meet difficulty target'
            }));
            return;
        }

        // Valid solution! Add block
        block.hash = calculatedHash;
        this.addBlock(block);

        console.log(`⛏️ Block mined by ${walletAddress.slice(0, 12)}... Height: ${block.index}`);

        // Notify all
        this.broadcast('block:mined', {
            block,
            miner: walletAddress
        });

        // Reset and start new round
        this.miningInProgress = false;
        this.currentChallenge = null;

        if (this.canStartMining()) {
            setTimeout(() => this.startMiningRound(), 1000);
        }
    }

    /**
     * Check if mining can start
     */
    canStartMining() {
        return this.connectedWallets.size >= PROTOCOL.MIN_POOL_SIZE;
    }

    /**
     * Start a new mining round
     */
    startMiningRound() {
        if (!this.canStartMining() || this.miningInProgress) return;

        this.miningInProgress = true;
        this.adjustDifficulty();

        const lastBlock = this.chain[this.chain.length - 1];
        const blockReward = this.calculateBlockReward();

        // Select transactions for block
        const transactions = this.pendingTransactions.slice(0, PROTOCOL.MAX_TRANSACTIONS_PER_BLOCK);

        // Create block template
        const blockTemplate = {
            index: this.chain.length,
            timestamp: Date.now(),
            previousHash: lastBlock.hash,
            merkleRoot: calculateMerkleRoot(transactions),
            difficulty: this.difficulty,
            transactions,
            reward: blockReward
        };

        this.currentChallenge = {
            blockTemplate,
            startedAt: Date.now(),
            difficulty: this.difficulty
        };

        console.log(`🎯 New challenge issued. Difficulty: ${this.difficulty}`);

        // Broadcast challenge to all miners
        this.broadcast('challenge:new', {
            blockTemplate,
            difficulty: this.difficulty,
            target: (BigInt('0x' + 'f'.repeat(64)) / BigInt(this.difficulty)).toString(16)
        });
    }

    /**
     * Adjust difficulty based on network state
     */
    adjustDifficulty() {
        if (this.chain.length < PROTOCOL.DIFFICULTY_ADJUSTMENT_BLOCKS + 1) {
            return;
        }

        const recentBlocks = this.chain.slice(-PROTOCOL.DIFFICULTY_ADJUSTMENT_BLOCKS);
        const firstBlock = recentBlocks[0];
        const lastBlock = recentBlocks[recentBlocks.length - 1];

        const actualTime = lastBlock.timestamp - firstBlock.timestamp;
        const expectedTime = PROTOCOL.TARGET_BLOCK_TIME_MS * PROTOCOL.DIFFICULTY_ADJUSTMENT_BLOCKS;

        // Exponential growth factors
        const supplyFactor = Math.pow(1.0001, this.totalSupply / 1000000);
        const timeFactor = Math.pow(1.00005, (Date.now() - this.genesisTime) / 86400000);

        // Adjust based on actual vs expected time
        let adjustment = expectedTime / actualTime;
        adjustment = Math.max(0.5, Math.min(2, adjustment)); // Clamp to prevent extreme changes

        this.difficulty = Math.max(1, Math.floor(this.difficulty * adjustment * supplyFactor * timeFactor));
    }

    /**
     * Calculate block reward
     */
    calculateBlockReward() {
        const halvings = Math.floor(this.chain.length / PROTOCOL.HALVING_INTERVAL);
        return PROTOCOL.INITIAL_BLOCK_REWARD / Math.pow(2, halvings);
    }

    /**
     * Add block to chain
     */
    addBlock(block) {
        this.chain.push(block);
        this.totalSupply += block.reward || 0;

        // Clear mined transactions from pending
        const minedTxIds = block.transactions.map(tx => tx.id);
        this.pendingTransactions = this.pendingTransactions.filter(
            tx => !minedTxIds.includes(tx.id)
        );
    }

    /**
     * Validate transaction
     */
    validateTransaction(tx) {
        if (!tx.sender || !tx.recipient || !tx.amount) return false;
        if (!isValidAddress(tx.sender) || !isValidAddress(tx.recipient)) return false;
        if (tx.amount <= 0) return false;
        if (tx.fee < PROTOCOL.MIN_TRANSACTION_FEE) return false;
        // TODO: Verify signature
        return true;
    }

    /**
     * Broadcast message to all connected wallets
     */
    broadcast(type, data) {
        const message = JSON.stringify({ type, data });
        this.connectedWallets.forEach(({ ws }) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }

    /**
     * Start the server
     */
    start() {
        this.server.listen(this.port, () => {
            console.log(`\n🚀 Blixchain Pool Coordinator running on port ${this.port}`);
            console.log(`📊 REST API: http://localhost:${this.port}`);
            console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
            console.log(`\n⚙️  Configuration:`);
            console.log(`   Min Pool Size: ${PROTOCOL.MIN_POOL_SIZE} wallets`);
            console.log(`   Min Block Time: ${PROTOCOL.MIN_BLOCK_TIME_MS / 1000}s`);
            console.log(`   Initial Reward: ${PROTOCOL.INITIAL_BLOCK_REWARD} BLIX\n`);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    require('dotenv').config();
    const port = process.env.BLIX_PORT || 3030;
    const server = new BlixnodeServer(port);
    server.start();
}

module.exports = BlixnodeServer;
