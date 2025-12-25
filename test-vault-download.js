#!/usr/bin/env node

/**
 * Test script for vault download endpoint
 * Tests: GET /api/story/admin/vault/download/[id]
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'T';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'redoux';

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          statusText: res.statusMessage,
          text: () => Promise.resolve(data),
          json: () => {
            try {
              return Promise.resolve(JSON.parse(data));
            } catch {
              return Promise.resolve({ error: 'Invalid JSON', raw: data });
            }
          },
          headers: res.headers,
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testVaultDownload() {
  console.log('🧪 Testing Vault Download Endpoint\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Admin: ${ADMIN_USERNAME}\n`);
  
  const results = [];
  
  // Test 1: Login to get token
  console.log('1️⃣ Testing admin login...');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/story/admin/auth`, {
      method: 'POST',
      body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    
    if (!loginRes.ok) {
      const errorData = await loginRes.json();
      const errorText = await loginRes.text();
      throw new Error(`Login failed: ${errorData.error || errorText || loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.session;
    
    if (!token) {
      throw new Error('No token received');
    }
    
    console.log('✅ Login successful\n');
    results.push({ test: 'Login', status: 'PASS', details: 'Token received' });
    
    // Test 2: List files to get a file ID
    console.log('2️⃣ Listing vault files...');
    try {
      const listRes = await fetch(`${BASE_URL}/api/story/admin/vault/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!listRes.ok) {
        const error = await listRes.json();
        throw new Error(`List failed: ${error.error || listRes.status}`);
      }
      
      const listData = await listRes.json();
      const files = listData.files || [];
      
      console.log(`✅ Found ${files.length} files\n`);
      results.push({ test: 'List Files', status: 'PASS', details: `${files.length} files found` });
      
      if (files.length === 0) {
        console.log('⚠️  No files to test download with\n');
        results.push({ test: 'Download (no files)', status: 'SKIP', details: 'No files available' });
      } else {
        // Test 3: Test download endpoint with first file
        const testFile = files[0];
        console.log(`3️⃣ Testing download for file ID: ${testFile.id} (${testFile.filename})...`);
        
        try {
          const downloadRes = await fetch(`${BASE_URL}/api/story/admin/vault/download/${testFile.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!downloadRes.ok) {
            const error = await downloadRes.json();
            throw new Error(`Download failed: ${error.error || downloadRes.status}`);
          }
          
          const contentType = downloadRes.headers['content-type'];
          const contentDisposition = downloadRes.headers['content-disposition'];
          const contentLength = downloadRes.headers['content-length'];
          
          console.log(`✅ Download successful`);
          console.log(`   Content-Type: ${contentType}`);
          console.log(`   Content-Disposition: ${contentDisposition}`);
          console.log(`   Content-Length: ${contentLength} bytes\n`);
          
          results.push({
            test: 'Download File',
            status: 'PASS',
            details: `File downloaded (${contentLength} bytes)`,
          });
        } catch (error) {
          console.log(`❌ Download failed: ${error.message}\n`);
          results.push({
            test: 'Download File',
            status: 'FAIL',
            details: error.message,
          });
        }
      }
      
      // Test 4: Test with invalid file ID
      console.log('4️⃣ Testing with invalid file ID...');
      try {
        const invalidRes = await fetch(`${BASE_URL}/api/story/admin/vault/download/99999`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (invalidRes.status === 404) {
          console.log('✅ Correctly returned 404 for invalid file ID\n');
          results.push({ test: 'Invalid File ID', status: 'PASS', details: '404 returned' });
        } else {
          throw new Error(`Expected 404, got ${invalidRes.status}`);
        }
      } catch (error) {
        console.log(`❌ Invalid ID test failed: ${error.message}\n`);
        results.push({ test: 'Invalid File ID', status: 'FAIL', details: error.message });
      }
      
      // Test 5: Test without authentication
      console.log('5️⃣ Testing without authentication...');
      try {
        const noAuthRes = await fetch(`${BASE_URL}/api/story/admin/vault/download/1`);
        
        if (noAuthRes.status === 401) {
          console.log('✅ Correctly returned 401 without auth\n');
          results.push({ test: 'No Auth', status: 'PASS', details: '401 returned' });
        } else {
          throw new Error(`Expected 401, got ${noAuthRes.status}`);
        }
      } catch (error) {
        console.log(`❌ No auth test failed: ${error.message}\n`);
        results.push({ test: 'No Auth', status: 'FAIL', details: error.message });
      }
      
    } catch (error) {
      console.log(`❌ List files failed: ${error.message}\n`);
      results.push({ test: 'List Files', status: 'FAIL', details: error.message });
    }
    
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}\n`);
    results.push({ test: 'Login', status: 'FAIL', details: error.message });
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.status} - ${result.details}`);
  });
  
  console.log('='.repeat(50));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testVaultDownload().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

