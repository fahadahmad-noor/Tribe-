import Redis from 'ioredis';

// Connect to the local Redis instance
const redis = new Redis('redis://localhost:6379');

async function demonstrateRedis() {
  console.log('\n=========================================');
  console.log('🔴 TRIBE - REDIS LIVE DEMONSTRATION 🔴');
  console.log('=========================================\n');

  try {
    // 1. Show Connection
    console.log('⏳ 1. Pinging Redis Server in memory...');
    const pong = await redis.ping();
    console.log(`   ✅ Success! Redis responded with: ${pong}\n`);
    
    // 2. Show Key-Value Set with Expiration (like JWT Token Blacklist)
    console.log('⏳ 2. Simulating JWT Token Blacklist (TTL Feature)...');
    const tokenKey = 'blacklist:demo_token_123';
    console.log(`   -> Saving token to memory: ${tokenKey}`);
    await redis.set(tokenKey, '1', 'EX', 10); // Expires in 10 seconds
    console.log('   ✅ Token successfully blacklisted and stored in RAM.\n');
    
    // 3. Show reading from memory instantly
    console.log('⏳ 3. Verifying memory read speed...');
    const startTime = performance.now();
    const val = await redis.get(tokenKey);
    const endTime = performance.now();
    console.log(`   ✅ Retrieved value: "${val}" in ${(endTime - startTime).toFixed(2)} milliseconds!\n`);

    // 4. Show Pub/Sub mechanism (Used for Socket.io Chat)
    console.log('⏳ 4. Simulating Socket.io Pub/Sub mechanism...');
    const subscriber = new Redis('redis://localhost:6379');
    await subscriber.subscribe('tribe_chat_channel');
    console.log('   -> Subscriber listening to "tribe_chat_channel"');
    
    subscriber.on('message', (channel, message) => {
      console.log(`   ✅ Message received instantly on ${channel}: "${message}"\n`);
      
      console.log('=========================================');
      console.log('🚀 REDIS IS FULLY OPERATIONAL!');
      console.log('=========================================\n');
      process.exit(0);
    });

    console.log('   -> Publisher sending message across server instances...');
    await redis.publish('tribe_chat_channel', 'Hello from Player 1!');

  } catch (err) {
    console.error('\n❌ REDIS ERROR: Is your Redis server running?');
    console.error(err.message);
    process.exit(1);
  }
}

demonstrateRedis();
