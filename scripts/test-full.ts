#!/usr/bin/env bun
/**
 * Full Test Suite Runner
 *
 * Runs all tests in sequence:
 * 1. Unit tests
 * 2. Integration tests (with live DB)
 * 3. E2E tests (via Playwright)
 *
 * DANGER: Uses test_ prefix isolation and cleans up after
 */

import { $ } from 'bun';

const TEST_PREFIX = 'test_';

console.log('🧪 Starting full test suite...\n');

async function runTests() {
  let failed = false;

  // Step 1: Unit tests
  console.log('1️⃣ Running unit tests...');
  try {
    await $`bun test src/__tests__/unit`;
    console.log('✅ Unit tests passed\n');
  } catch (error) {
    console.error('❌ Unit tests failed:', error);
    failed = true;
  }

  // Step 2: Clean up before integration tests
  console.log('2️⃣ Cleaning test data before integration tests...');
  try {
    await $`bun --env-file=.env.local run scripts/cleanup-test-data.ts`;
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.log('⚠️ Cleanup warning (may be empty):', error);
  }

  // Step 3: Integration tests
  console.log('3️⃣ Running integration tests (live DB)...');
  try {
    await $`bun --env-file=.env.local test src/__tests__/happy`;
    console.log('✅ Integration tests passed\n');
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    failed = true;
  }

  // Step 4: Clean up before E2E tests
  console.log('4️⃣ Cleaning test data before E2E tests...');
  try {
    await $`bun --env-file=.env.local run scripts/cleanup-test-data.ts`;
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error);
  }

  // Step 5: E2E tests (requires dev server running)
  console.log('5️⃣ Running E2E tests (Playwright)...');
  console.log('   Make sure dev server is running on localhost:3000');
  try {
    await $`npx playwright test`;
    console.log('✅ E2E tests passed\n');
  } catch (error) {
    console.error('❌ E2E tests failed:', error);
    failed = true;
  }

  // Final cleanup
  console.log('6️⃣ Final cleanup...');
  try {
    await $`bun --env-file=.env.local run scripts/cleanup-test-data.ts`;
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error);
  }

  if (failed) {
    console.error('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

runTests();
