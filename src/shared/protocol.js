/**
 * Blixchain Protocol Constants
 */

module.exports = {
    // Network
    NETWORK_ID: 'BLIXCHAIN_MAINNET',
    VERSION: '1.0.0',

    // Mining
    MIN_POOL_SIZE: 2,                    // Minimum wallets to start mining
    MIN_BLOCK_TIME_MS: 300000,           // 5 minutes minimum
    TARGET_BLOCK_TIME_MS: 360000,        // 6 minutes target
    DIFFICULTY_ADJUSTMENT_BLOCKS: 10,

    // Tokenomics
    INITIAL_BLOCK_REWARD: 50,
    HALVING_INTERVAL: 210000,
    DECIMALS: 8,

    // Fees
    MIN_TRANSACTION_FEE: 0.0001,
    FEE_TO_MINERS: 0.70,                 // 70%
    FEE_TO_BURN: 0.20,                   // 20%
    FEE_TO_TREASURY: 0.10,               // 10%

    // P2P & Storage
    SHARD_COUNT: 256,
    REPLICATION_FACTOR: 8,
    CONFIRMATIONS_REQUIRED: 6,

    // Addresses
    NETWORK_PREFIX: 0x42,                // 'B'
    ADDRESS_PREFIX: 'BLX',

    // Limits
    MAX_TRANSACTION_SIZE: 100000,        // 100KB
    MAX_BLOCK_SIZE: 1000000,             // 1MB
    MAX_TRANSACTIONS_PER_BLOCK: 500
};
