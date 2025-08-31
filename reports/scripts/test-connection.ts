#!/usr/bin/env tsx

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createValueIOService } from '../lib/value-io-service';

async function testConnection() {
  console.log('🔧 Testing Value.io API Connection...\n');
  
  // Show loaded environment variables (without revealing sensitive data)
  console.log('📋 Environment Variables:');
  console.log(`  ✅ VALUE_IO_API_USER: ${process.env.VALUE_IO_API_USER}`);
  console.log(`  ✅ VALUE_IO_API_KEY: ${process.env.VALUE_IO_API_KEY?.substring(0, 8)}...`);
  console.log(`  ✅ VALUE_IO_BASE_URL: ${process.env.VALUE_IO_BASE_URL}\n`);
  
  try {
    // Create service instance
    const service = createValueIOService();
    
    // Test connection
    console.log('🌐 Testing API connection...');
    const connectionResult = await service.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ Connection successful!');
      console.log(`   Response time: ${connectionResult.performance?.responseTime}ms`);
      console.log(`   Account name: ${connectionResult.accountInfo?.name}`);
      console.log(`   Account ID: ${connectionResult.accountInfo?.id}\n`);
      
      // Test basic batches endpoint
      console.log('📊 Testing batches endpoint...');
      const batchesResult = await service.getBatches({ page: 1, pageSize: 3 });
      console.log(`✅ Batches retrieved: ${batchesResult.batches?.length || 0} batches\n`);
      
      console.log('🎉 All tests passed! The API integration is working correctly.');
      
    } else {
      console.error('❌ Connection failed:', connectionResult.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testConnection();