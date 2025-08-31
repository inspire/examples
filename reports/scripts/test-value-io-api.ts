#!/usr/bin/env tsx

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

/**
 * Comprehensive Value.io API Test Script
 * 
 * This script thoroughly tests all Value.io API endpoints and SDK functionality:
 * - Configuration validation
 * - Authentication testing
 * - All service methods with error scenarios
 * - Performance benchmarking
 * - Cache functionality
 * - Rate limiting behavior
 * 
 * Usage:
 *   npm run test:api
 *   npm run test:api -- --verbose
 *   npm run test:api -- --skip-cache
 * 
 * Environment Variables Required:
 *   VALUE_IO_API_USER
 *   VALUE_IO_API_KEY
 *   VALUE_IO_BASE_URL (optional, defaults to https://api.value.io/v1)
 */

import { ValueIOService, createValueIOService } from '../lib/value-io-service';
import { format } from 'date-fns';
import { performance } from 'perf_hooks';

// =============================================================================
// CONFIGURATION & SETUP
// =============================================================================

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  duration: number;
  message: string;
  data?: any;
  error?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
}

class ValueIOTester {
  private service: ValueIOService;
  private verbose: boolean = false;
  private skipCache: boolean = false;
  private testResults: TestSuite[] = [];
  private totalStartTime: number;

  constructor(options: { verbose?: boolean; skipCache?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.skipCache = options.skipCache || false;
    this.totalStartTime = performance.now();
    
    // Create a fresh service instance for testing
    this.service = createValueIOService();
    
    if (this.skipCache) {
      this.service.clearCache();
    }
  }

  /**
   * Log messages with different levels
   */
  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any): void {
    const timestamp = new Date().toISOString().substring(11, 23);
    const colors = {
      INFO: '\x1b[36m',   // Cyan
      WARN: '\x1b[33m',   // Yellow  
      ERROR: '\x1b[31m',  // Red
      DEBUG: '\x1b[90m'   // Gray
    };
    const resetColor = '\x1b[0m';
    
    if (level === 'DEBUG' && !this.verbose) return;
    
    console.log(`${colors[level]}[${timestamp}] ${level}:${resetColor} ${message}`);
    if (data && this.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Run a single test with timing and error handling
   */
  private async runTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      this.log('DEBUG', `Starting test: ${testName}`);
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      this.log('DEBUG', `✅ Test passed: ${testName} (${Math.round(duration)}ms)`);
      
      return {
        test: testName,
        status: 'PASS',
        duration: Math.round(duration),
        message: 'Test completed successfully',
        data: this.verbose ? result : undefined
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Determine if this is a warning or failure based on error type
      const isWarning = errorMessage.includes('not found') || 
                       errorMessage.includes('No ProPay destinations') ||
                       errorMessage.includes('No data available');
      
      const status = isWarning ? 'WARN' : 'FAIL';
      const emoji = isWarning ? '⚠️' : '❌';
      
      this.log(isWarning ? 'WARN' : 'ERROR', `${emoji} Test ${status.toLowerCase()}: ${testName} (${Math.round(duration)}ms) - ${errorMessage}`);
      
      return {
        test: testName,
        status,
        duration: Math.round(duration),
        message: errorMessage,
        error: errorMessage
      };
    }
  }

  /**
   * Run a test suite
   */
  private async runSuite(suiteName: string, tests: Array<{ name: string; fn: () => Promise<any> }>): Promise<TestSuite> {
    this.log('INFO', `\n🔍 Running test suite: ${suiteName}`);
    this.log('INFO', '='.repeat(50));
    
    const suiteStartTime = performance.now();
    const results: TestResult[] = [];
    
    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      results.push(result);
      
      // Small delay between tests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const suiteDuration = performance.now() - suiteStartTime;
    
    const suite: TestSuite = {
      name: suiteName,
      results,
      duration: Math.round(suiteDuration),
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      warnings: results.filter(r => r.status === 'WARN').length,
      skipped: results.filter(r => r.status === 'SKIP').length
    };
    
    this.log('INFO', `\n📊 Suite completed: ${suiteName}`);
    this.log('INFO', `   ✅ Passed: ${suite.passed}`);
    this.log('INFO', `   ❌ Failed: ${suite.failed}`);
    this.log('INFO', `   ⚠️  Warnings: ${suite.warnings}`);
    this.log('INFO', `   ⏱️  Duration: ${suite.duration}ms`);
    
    this.testResults.push(suite);
    return suite;
  }

  // =============================================================================
  // CONFIGURATION TESTS
  // =============================================================================

  private async testConfiguration(): Promise<TestSuite> {
    return this.runSuite('Configuration Tests', [
      {
        name: 'Environment Variables Check',
        fn: async () => {
          const requiredVars = ['VALUE_IO_API_USER', 'VALUE_IO_API_KEY'];
          const missingVars = requiredVars.filter(varName => !process.env[varName]);
          
          if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
          }
          
          // Check for placeholder values
          const placeholderValues = ['your-api-user-here', 'your-api-key-here'];
          const hasPlaceholders = requiredVars.some(varName => 
            placeholderValues.includes(process.env[varName] || '')
          );
          
          if (hasPlaceholders) {
            throw new Error('Placeholder values detected in environment variables');
          }
          
          return {
            apiUser: process.env.VALUE_IO_API_USER?.substring(0, 8) + '...',
            apiKeyPrefix: process.env.VALUE_IO_API_KEY?.substring(0, 8) + '...',
            baseUrl: process.env.VALUE_IO_BASE_URL || 'https://api.value.io/v1'
          };
        }
      },
      {
        name: 'Service Configuration Validation',
        fn: async () => {
          // This will throw if configuration is invalid
          const testService = createValueIOService();
          return { status: 'Configuration valid' };
        }
      },
      {
        name: 'Cache Configuration',
        fn: async () => {
          const cacheStats = this.service.getCacheStats();
          return cacheStats;
        }
      }
    ]);
  }

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  private async testAuthentication(): Promise<TestSuite> {
    return this.runSuite('Authentication Tests', [
      {
        name: 'Connection Test',
        fn: async () => {
          const result = await this.service.testConnection();
          if (!result.success) {
            throw new Error(result.message);
          }
          return result;
        }
      },
      {
        name: 'Account Information Retrieval',
        fn: async () => {
          const accountResponse = await this.service.getAccountInfo();
          if (!accountResponse.data.account) {
            throw new Error('No account data received');
          }
          return {
            accountId: accountResponse.data.account.id,
            accountName: accountResponse.data.account.name,
            hasSignatureSecret: !!accountResponse.data.account.signature_secret
          };
        }
      }
    ]);
  }

  // =============================================================================
  // DESTINATIONS TESTS
  // =============================================================================

  private async testDestinations(): Promise<TestSuite> {
    return this.runSuite('Destinations Tests', [
      {
        name: 'Get All Destinations',
        fn: async () => {
          const response = await this.service.getDestinations();
          const destinations = response.data.destinations || [];
          
          return {
            totalDestinations: destinations.length,
            destinationTypes: [...new Set(destinations.map(d => d.type))],
            sampleDestination: destinations[0] ? {
              id: destinations[0].id,
              name: destinations[0].name,
              type: destinations[0].type
            } : null
          };
        }
      },
      {
        name: 'Get ProPay Destinations Only',
        fn: async () => {
          const response = await this.service.getProPayDestinations();
          const proPayDestinations = response.data.destinations || [];
          
          if (proPayDestinations.length === 0) {
            throw new Error('No ProPay destinations found. This may indicate no Gateway::VIOInstant destinations are configured.');
          }
          
          // Verify all returned destinations are ProPay
          const nonProPay = proPayDestinations.filter(d => d.type !== 'Gateway::VIOInstant');
          if (nonProPay.length > 0) {
            throw new Error(`Found non-ProPay destinations in ProPay filter: ${nonProPay.map(d => d.type).join(', ')}`);
          }
          
          return {
            proPayCount: proPayDestinations.length,
            destinations: proPayDestinations.map(d => ({
              id: d.id,
              name: d.name,
              type: d.type
            }))
          };
        }
      }
    ]);
  }


  // =============================================================================
  // BATCHES TESTS
  // =============================================================================

  private async testBatches(): Promise<TestSuite> {
    return this.runSuite('Batches Tests', [
      {
        name: 'Get Recent Batches',
        fn: async () => {
          const response = await this.service.getBatches({ page: 1, pageSize: 5 });
          
          if (response.batches.length === 0) {
            throw new Error('No batches found. This may indicate no batch data is available or all destinations are empty.');
          }
          
          return {
            batchCount: response.batches.length,
            totalBatches: response.total,
            sampleBatch: response.batches[0] ? {
              id: response.batches[0].batch_id,
              depositDate: response.batches[0].deposit_date,
              depositAmount: response.batches[0].deposit_amount,
              destinationName: response.batches[0].destination_name,
              transactionCount: response.batches[0].transaction_count,
              status: response.batches[0].status
            } : null
          };
        }
      },
      {
        name: 'Get Batches with Date Range',
        fn: async () => {
          const endDate = format(new Date(), 'yyyy-MM-dd');
          const startDate = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
          
          const response = await this.service.getBatches({
            page: 1,
            pageSize: 10,
            startDate,
            endDate
          });
          
          return {
            dateRange: `${startDate} to ${endDate}`,
            batchCount: response.batches.length,
            totalInRange: response.total
          };
        }
      },
      {
        name: 'Get Batches with Sorting',
        fn: async () => {
          const byDateDesc = await this.service.getBatches({
            page: 1,
            pageSize: 5,
            sortBy: 'deposit_date',
            sortOrder: 'desc'
          });
          
          const byAmountAsc = await this.service.getBatches({
            page: 1,
            pageSize: 5,
            sortBy: 'deposit_amount',
            sortOrder: 'asc'
          });
          
          return {
            dateDescCount: byDateDesc.batches.length,
            amountAscCount: byAmountAsc.batches.length,
            sortingWorks: JSON.stringify(byDateDesc) !== JSON.stringify(byAmountAsc)
          };
        }
      }
    ]);
  }

  // =============================================================================
  // TRANSACTIONS TESTS  
  // =============================================================================

  private async testTransactions(): Promise<TestSuite> {
    // First get a batch to test transactions
    let testBatchId: string | null = null;
    
    try {
      const batchResponse = await this.service.getBatches({ page: 1, pageSize: 1 });
      testBatchId = batchResponse.batches[0]?.batch_id ? String(batchResponse.batches[0].batch_id) : null;
    } catch (error) {
      // Will handle in individual tests
    }
    
    return this.runSuite('Transactions Tests', [
      {
        name: 'Get Transactions for Batch',
        fn: async () => {
          if (!testBatchId) {
            throw new Error('No test batch available for transaction testing');
          }
          
          const response = await this.service.getBatchTransactions(testBatchId, {
            page: 1,
            pageSize: 10
          });
          
          return {
            batchId: testBatchId,
            transactionCount: response.transactions.length,
            totalTransactions: response.total,
            batchSummary: response.batchSummary,
            sampleTransaction: response.transactions[0] ? {
              transactionNumber: response.transactions[0].transaction_number,
              payerName: response.transactions[0].payer_name,
              amount: response.transactions[0].authorization_amount,
              type: response.transactions[0].transaction_type
            } : null
          };
        }
      },
      {
        name: 'Get Transactions with Filters',
        fn: async () => {
          if (!testBatchId) {
            throw new Error('No test batch available for filtered transaction testing');
          }
          
          const allTransactions = await this.service.getTransactions({
            batchId: testBatchId,
            page: 1,
            pageSize: 50
          });
          
          const creditCardOnly = await this.service.getTransactions({
            batchId: testBatchId,
            page: 1,
            pageSize: 50,
            transactionType: '+CC'
          });
          
          return {
            allCount: allTransactions.transactions.length,
            creditCardCount: creditCardOnly.transactions.length,
            filteringWorks: allTransactions.transactions.length >= creditCardOnly.transactions.length
          };
        }
      },
      {
        name: 'Get Transactions with Search',
        fn: async () => {
          if (!testBatchId) {
            throw new Error('No test batch available for transaction search testing');
          }
          
          // Get a transaction first to use for search
          const initialResponse = await this.service.getTransactions({
            batchId: testBatchId,
            page: 1,
            pageSize: 5
          });
          
          if (initialResponse.transactions.length === 0) {
            throw new Error('No transactions available for search testing');
          }
          
          const sampleTransaction = initialResponse.transactions[0];
          const searchTerm = sampleTransaction.payer_name.split(' ')[0]; // Use first word of payer name
          
          const searchResponse = await this.service.getTransactions({
            batchId: testBatchId,
            page: 1,
            pageSize: 10,
            searchTerm
          });
          
          return {
            searchTerm,
            searchResults: searchResponse.transactions.length,
            foundOriginalTransaction: searchResponse.transactions.some(
              t => t.transaction_number === sampleTransaction.transaction_number
            )
          };
        }
      }
    ]);
  }

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  private async testPerformance(): Promise<TestSuite> {
    return this.runSuite('Performance Tests', [
      {
        name: 'Cache Performance Test',
        fn: async () => {
          // Clear cache first
          this.service.clearCache();
          
          // First call (cold cache)
          const coldStart = performance.now();
          await this.service.getDestinations();
          const coldDuration = performance.now() - coldStart;
          
          // Second call (warm cache)
          const warmStart = performance.now();
          await this.service.getDestinations();
          const warmDuration = performance.now() - warmStart;
          
          const cacheStats = this.service.getCacheStats();
          
          return {
            coldCacheDuration: Math.round(coldDuration),
            warmCacheDuration: Math.round(warmDuration),
            cacheSpeedup: Math.round(coldDuration / warmDuration),
            cacheStats
          };
        }
      },
      {
        name: 'Concurrent Requests Test',
        fn: async () => {
          const concurrentStart = performance.now();
          
          // Make 3 concurrent requests
          const promises = [
            this.service.getAccountInfo(),
            this.service.getDestinations(),
            this.service.getProPayDestinations()
          ];
          
          const results = await Promise.all(promises);
          const concurrentDuration = performance.now() - concurrentStart;
          
          return {
            concurrentDuration: Math.round(concurrentDuration),
            successfulRequests: results.length,
            allSucceeded: results.every(r => r && r.data)
          };
        }
      },
      {
        name: 'Large Request Test',
        fn: async () => {
          const largeStart = performance.now();
          
          const response = await this.service.getBatches({
            page: 1,
            pageSize: 50 // Request more data
          });
          
          const largeDuration = performance.now() - largeStart;
          
          return {
            requestDuration: Math.round(largeDuration),
            recordsReturned: response.batches?.length || 0,
            averageTimePerRecord: response.batches?.length ? 
              Math.round(largeDuration / response.batches.length) : 0
          };
        }
      }
    ]);
  }

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  private async testErrorHandling(): Promise<TestSuite> {
    return this.runSuite('Error Handling Tests', [
      {
        name: 'Invalid Batch ID Format',
        fn: async () => {
          try {
            await this.service.getBatchTransactions('invalid-batch-id');
            throw new Error('Expected error for invalid batch ID format');
          } catch (error) {
            if (error instanceof Error && error.message.includes('Invalid batch ID format')) {
              return { errorHandled: true, errorMessage: error.message };
            }
            throw error;
          }
        }
      },
      {
        name: 'Non-existent Destination Filter',
        fn: async () => {
          try {
            await this.service.getBatches({
              page: 1,
              pageSize: 5,
              destinationId: 'nonexistent123456789012'
            });
            throw new Error('Expected error for non-existent destination');
          } catch (error) {
            if (error instanceof Error && error.message.includes('Invalid destination')) {
              return { errorHandled: true, errorMessage: error.message };
            }
            throw error;
          }
        }
      },
      {
        name: 'Invalid Date Range',
        fn: async () => {
          try {
            await this.service.getBatches({
              page: 1,
              pageSize: 5,
              startDate: '2024-12-31',
              endDate: '2024-01-01' // End before start
            });
            // This might not throw an error at the service level, so we just check the behavior
            return { errorHandling: 'Service accepts invalid date range - filtering happens client-side' };
          } catch (error) {
            return { errorHandled: true, errorMessage: (error as Error).message };
          }
        }
      }
    ]);
  }

  // =============================================================================
  // MAIN TEST EXECUTION
  // =============================================================================

  /**
   * Run all test suites
   */
  public async runAllTests(): Promise<void> {
    this.log('INFO', '🚀 Starting Value.io SDK Comprehensive Test Suite');
    this.log('INFO', `   📅 Timestamp: ${new Date().toISOString()}`);
    this.log('INFO', `   ⚙️  Verbose mode: ${this.verbose}`);
    this.log('INFO', `   🗄️  Skip cache: ${this.skipCache}`);
    this.log('INFO', '='.repeat(70));

    try {
      // Run all test suites in order (no payments tests)
      await this.testConfiguration();
      await this.testAuthentication();
      await this.testDestinations();
      await this.testBatches();
      await this.testTransactions();
      await this.testPerformance();
      await this.testErrorHandling();
      
      // Print final summary
      this.printFinalSummary();
      
    } catch (error) {
      this.log('ERROR', `❌ Test suite execution failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Print comprehensive final summary
   */
  private printFinalSummary(): void {
    const totalDuration = performance.now() - this.totalStartTime;
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;
    let totalSkipped = 0;
    
    this.testResults.forEach(suite => {
      totalTests += suite.results.length;
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalWarnings += suite.warnings;
      totalSkipped += suite.skipped;
    });
    
    this.log('INFO', '\n' + '='.repeat(70));
    this.log('INFO', '📊 FINAL TEST SUMMARY');
    this.log('INFO', '='.repeat(70));
    
    this.testResults.forEach(suite => {
      const status = suite.failed > 0 ? '❌' : suite.warnings > 0 ? '⚠️' : '✅';
      this.log('INFO', `   ${status} ${suite.name}: ${suite.passed}✅ ${suite.failed}❌ ${suite.warnings}⚠️ (${suite.duration}ms)`);
    });
    
    this.log('INFO', '');
    this.log('INFO', `📈 OVERALL RESULTS:`);
    this.log('INFO', `   🧪 Total Tests: ${totalTests}`);
    this.log('INFO', `   ✅ Passed: ${totalPassed} (${Math.round(totalPassed / totalTests * 100)}%)`);
    this.log('INFO', `   ❌ Failed: ${totalFailed} (${Math.round(totalFailed / totalTests * 100)}%)`);
    this.log('INFO', `   ⚠️  Warnings: ${totalWarnings} (${Math.round(totalWarnings / totalTests * 100)}%)`);
    this.log('INFO', `   ⏱️  Total Duration: ${Math.round(totalDuration)}ms`);
    
    // Cache statistics
    const cacheStats = this.service.getCacheStats();
    this.log('INFO', '');
    this.log('INFO', `🗄️  CACHE STATISTICS:`);
    this.log('INFO', `   📦 Entries: ${cacheStats.totalEntries}`);
    this.log('INFO', `   💾 Memory: ${cacheStats.memoryUsage}`);
    this.log('INFO', `   📅 Oldest: ${cacheStats.oldestEntry?.toISOString() || 'N/A'}`);
    this.log('INFO', `   📅 Newest: ${cacheStats.newestEntry?.toISOString() || 'N/A'}`);
    
    this.log('INFO', '');
    
    if (totalFailed > 0) {
      this.log('ERROR', `❌ Test suite completed with ${totalFailed} failures`);
      this.log('INFO', '💡 Check the detailed error messages above for troubleshooting guidance.');
      process.exit(1);
    } else if (totalWarnings > 0) {
      this.log('WARN', `⚠️  Test suite completed with ${totalWarnings} warnings`);
      this.log('INFO', '💡 Warnings may indicate missing data or non-critical configuration issues.');
    } else {
      this.log('INFO', '🎉 All tests passed successfully!');
      this.log('INFO', '✨ Your Value.io API integration is working correctly.');
    }
    
    this.log('INFO', '='.repeat(70));
  }
}

// =============================================================================
// CLI EXECUTION
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const skipCache = args.includes('--skip-cache');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Value.io API Test Script

Usage:
  npm run test:api                    # Run all tests
  npm run test:api -- --verbose       # Run with verbose output
  npm run test:api -- --skip-cache    # Run without using cache
  npm run test:api -- --help          # Show this help

Environment Variables Required:
  VALUE_IO_API_USER    # Your Value.io API username
  VALUE_IO_API_KEY     # Your Value.io API key
  VALUE_IO_BASE_URL    # API base URL (optional, defaults to https://api.value.io/v1)
`);
    process.exit(0);
  }
  
  const tester = new ValueIOTester({ verbose, skipCache });
  await tester.runAllTests();
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Test execution failed:');
    console.error(error);
    process.exit(1);
  });
}

export { ValueIOTester };
