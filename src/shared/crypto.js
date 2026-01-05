/**
 * Blixchain Cryptographic Utilities
 */

const crypto = require('crypto');

/**
 * SHA-256 hash
 */
function sha256(data) {
    if (typeof data === 'string') {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Double SHA-256 (used for block hashing)
 */
function doubleSha256(data) {
    const first = crypto.createHash('sha256').update(data).digest();
    return crypto.createHash('sha256').update(first).digest('hex');
}

/**
 * Calculate Merkle Root from transactions
 */
function calculateMerkleRoot(transactions) {
    if (!transactions || transactions.length === 0) {
        return sha256('empty');
    }

    let hashes = transactions.map(tx =>
        sha256(typeof tx === 'string' ? tx : JSON.stringify(tx))
    );

    while (hashes.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left; // Duplicate last if odd
            nextLevel.push(sha256(left + right));
        }
        hashes = nextLevel;
    }

    return hashes[0];
}

/**
 * Calculate block hash
 */
function calculateBlockHash(block) {
    const header = {
        index: block.index,
        timestamp: block.timestamp,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        nonce: block.nonce,
        difficulty: block.difficulty
    };
    return doubleSha256(JSON.stringify(header));
}

/**
 * Calculate target from difficulty
 */
function calculateTarget(difficulty) {
    // 256-bit max value divided by difficulty
    const maxTarget = BigInt('0x' + 'f'.repeat(64));
    return maxTarget / BigInt(Math.max(1, Math.floor(difficulty)));
}

/**
 * Check if hash meets target
 */
function hashMeetsTarget(hash, difficulty) {
    const hashValue = BigInt('0x' + hash);
    const target = calculateTarget(difficulty);
    return hashValue < target;
}

/**
 * Generate random bytes as hex
 */
function randomHex(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
    sha256,
    doubleSha256,
    calculateMerkleRoot,
    calculateBlockHash,
    calculateTarget,
    hashMeetsTarget,
    randomHex
};
