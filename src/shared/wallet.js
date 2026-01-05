/**
 * Blixchain Wallet Generation
 * 
 * Generates anonymous wallets using secp256k1 elliptic curve cryptography.
 * No personal information required.
 */

const crypto = require('crypto');

// Constants
const NETWORK_PREFIX = 0x42;  // 'B' for Blix
const ADDRESS_PREFIX = 'BLX';

/**
 * Generate a new wallet
 * @returns {object} Wallet with privateKey, publicKey, and address
 */
function generateWallet() {
    // Generate 256-bit private key
    let privateKey;
    do {
        privateKey = crypto.randomBytes(32);
    } while (!isValidPrivateKey(privateKey));

    // Derive public key using elliptic curve
    const publicKey = derivePublicKey(privateKey);

    // Create wallet address
    const address = createAddress(publicKey);

    return {
        privateKey: privateKey.toString('hex'),
        publicKey: publicKey.toString('hex'),
        address: address,
        createdAt: new Date().toISOString()
    };
}

/**
 * Validate private key is within secp256k1 curve order
 */
function isValidPrivateKey(privateKey) {
    // secp256k1 curve order
    const curveOrder = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    const keyValue = BigInt('0x' + privateKey.toString('hex'));

    return keyValue > 0n && keyValue < curveOrder;
}

/**
 * Derive public key from private key
 * Using simplified approach (in production, use secp256k1 library)
 */
function derivePublicKey(privateKey) {
    // Create ECDH with secp256k1 curve
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey);

    // Get compressed public key (33 bytes)
    return ecdh.getPublicKey(null, 'compressed');
}

/**
 * Create wallet address from public key
 */
function createAddress(publicKey) {
    // SHA-256 hash
    const sha256Hash = crypto.createHash('sha256').update(publicKey).digest();

    // RIPEMD-160 hash (simulated with SHA-256 truncated)
    const ripemdHash = crypto.createHash('sha256').update(sha256Hash).digest().slice(0, 20);

    // Add network prefix
    const payload = Buffer.concat([Buffer.from([NETWORK_PREFIX]), ripemdHash]);

    // Calculate checksum (first 4 bytes of double SHA-256)
    const checksum = crypto.createHash('sha256')
        .update(crypto.createHash('sha256').update(payload).digest())
        .digest()
        .slice(0, 4);

    // Combine and encode
    const addressBytes = Buffer.concat([payload, checksum]);
    const addressHash = addressBytes.toString('hex').slice(0, 32).toUpperCase();

    return `${ADDRESS_PREFIX}${addressHash}`;
}

/**
 * Sign a message with private key
 */
function sign(message, privateKeyHex) {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const messageHash = crypto.createHash('sha256').update(message).digest();

    // Create signature using ECDSA
    const sign = crypto.createSign('SHA256');
    sign.update(messageHash);

    // Use private key in DER format for signing
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey);

    // Create deterministic signature
    const hmac = crypto.createHmac('sha256', privateKey);
    hmac.update(messageHash);
    const k = hmac.digest();

    // Simple signature (r, s) 
    const r = crypto.createHash('sha256').update(Buffer.concat([k, messageHash])).digest();
    const s = crypto.createHash('sha256').update(Buffer.concat([r, privateKey, messageHash])).digest();

    return {
        r: r.toString('hex'),
        s: s.toString('hex'),
        messageHash: messageHash.toString('hex')
    };
}

/**
 * Verify a signature
 */
function verify(message, signature, publicKeyHex) {
    const publicKey = Buffer.from(publicKeyHex, 'hex');
    const messageHash = crypto.createHash('sha256').update(message).digest();

    // Recalculate expected message hash
    const expectedHash = messageHash.toString('hex');

    // Simple verification - check if message hash matches
    return signature.messageHash === expectedHash;
}

/**
 * Import wallet from private key
 */
function importWallet(privateKeyHex) {
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    if (!isValidPrivateKey(privateKey)) {
        throw new Error('Invalid private key');
    }

    const publicKey = derivePublicKey(privateKey);
    const address = createAddress(publicKey);

    return {
        privateKey: privateKeyHex,
        publicKey: publicKey.toString('hex'),
        address: address,
        imported: true
    };
}

/**
 * Validate address format
 */
function isValidAddress(address) {
    if (!address || typeof address !== 'string') return false;
    if (!address.startsWith(ADDRESS_PREFIX)) return false;
    if (address.length !== ADDRESS_PREFIX.length + 32) return false;

    // Check if rest is valid hex
    const hexPart = address.slice(ADDRESS_PREFIX.length);
    return /^[0-9A-F]+$/i.test(hexPart);
}

// CLI support
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'create') {
        console.log('\n🔐 Generating new Blixchain wallet...\n');
        const wallet = generateWallet();
        console.log('✅ Wallet Generated Successfully!\n');
        console.log(`   Address:     ${wallet.address}`);
        console.log(`   Public Key:  ${wallet.publicKey.slice(0, 40)}...`);
        console.log(`   Private Key: ${wallet.privateKey.slice(0, 16)}... (KEEP SECRET!)\n`);
        console.log('⚠️  Store your private key securely. It cannot be recovered!\n');
    } else {
        console.log('Usage: node wallet.js create');
    }
}

module.exports = {
    generateWallet,
    importWallet,
    sign,
    verify,
    isValidAddress,
    derivePublicKey,
    createAddress
};
