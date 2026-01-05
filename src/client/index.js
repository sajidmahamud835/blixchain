/**
 * Blixchain Client Entry Point
 * 
 * Main entry for running the mining client.
 */

const MiningClient = require('./miner');

// Parse command line arguments
const args = process.argv.slice(2);
const poolUrl = args.find(a => a.startsWith('--pool='))?.slice(7) || 'ws://localhost:3030';
const privateKey = args.find(a => a.startsWith('--key='))?.slice(6);
const help = args.includes('--help') || args.includes('-h');

if (help) {
    console.log(`
Blixchain Mining Client
=======================

Usage:
  node src/client/index.js [options]

Options:
  --pool=URL    Pool coordinator URL (default: ws://localhost:3030)
  --key=KEY     Private key to import existing wallet
  --help, -h    Show this help

Examples:
  node src/client/index.js
  node src/client/index.js --pool=ws://pool.blixchain.io:3030
  node src/client/index.js --key=abc123...
`);
    process.exit(0);
}

console.log(`
╔═══════════════════════════════════════╗
║       BLIXCHAIN MINING CLIENT         ║
╚═══════════════════════════════════════╝
`);

const client = new MiningClient({
    poolUrl,
    onBlockFound: (data) => {
        console.log('📦 Block reward will be credited to your wallet');
    },
    onPoolUpdate: (data) => {
        console.log(`👥 Pool size: ${data.connectedWallets} wallets`);
    }
});

// Initialize wallet
if (privateKey) {
    client.initWallet(privateKey);
} else {
    console.log('🔐 Generating new wallet...');
    const wallet = client.initWallet();
    console.log(`\n⚠️  IMPORTANT: Save your private key securely!`);
    console.log(`   Private Key: ${wallet.privateKey}\n`);
}

// Connect and start
client.connect()
    .then(() => {
        console.log(`\n⏳ Waiting for mining challenges...`);
        console.log(`   (Minimum ${require('../shared/protocol').MIN_POOL_SIZE} wallets needed)\n`);

        // Status updates
        setInterval(() => {
            const stats = client.getStats();
            if (stats.mining && stats.hashRate > 0) {
                console.log(`⛏️  Mining | ${stats.hashRate} H/s | Blocks found: ${stats.blocksFound}`);
            }
        }, 15000);
    })
    .catch(err => {
        console.error(`\n❌ Connection failed: ${err.message}`);
        console.log(`   Make sure the pool coordinator is running.`);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Disconnecting from pool...');
    client.disconnect();
    console.log('✅ Goodbye!\n');
    process.exit(0);
});
