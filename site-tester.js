#!/usr/bin/env node

/**
 * 🔍 CLAUDE SITE TESTER
 * Universal website testing tool that generates reports for Claude
 * 
 * USAGE:
 *   node site-tester.js https://your-site.com
 *   node site-tester.js https://your-site.com --config tests.json
 * 
 * SETUP:
 *   1. Save this file as site-tester.js
 *   2. Run: npm init -y && npm install node-fetch@2
 *   3. Run: node site-tester.js https://teacherpotato.xyz
 *   4. Copy the output and paste to Claude
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  timeout: 10000, // 10 seconds
  userAgent: 'ClaudeSiteTester/1.0',
};

// ============================================
// HTTP HELPERS
// ============================================

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
        'User-Agent': CONFIG.userAgent,
        ...options.headers,
      },
      timeout: CONFIG.timeout,
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
          json: () => Promise.resolve(JSON.parse(data)),
          headers: res.headers,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// ============================================
// DEFAULT TESTS (Universal)
// ============================================

const DEFAULT_TESTS = [
  {
    id: 'home_page',
    name: 'Home Page Loads',
    category: 'Core',
    description: 'Check if the home page loads correctly',
    test: async (baseUrl) => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 100) throw new Error('Page content too short');
      return { passed: true, details: `Page loaded (${html.length} bytes)` };
    }
  },
  {
    id: 'has_title',
    name: 'Page Has Title',
    category: 'Core',
    description: 'Check if the page has a title tag',
    test: async (baseUrl) => {
      const res = await fetch(baseUrl);
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (!titleMatch) throw new Error('No title tag found');
      return { passed: true, details: `Title: "${titleMatch[1]}"` };
    }
  },
  {
    id: 'no_server_error',
    name: 'No Server Errors',
    category: 'Core',
    description: 'Page does not return 5xx error',
    test: async (baseUrl) => {
      const res = await fetch(baseUrl);
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
      return { passed: true, details: `Status: ${res.status}` };
    }
  },
  {
    id: 'response_time',
    name: 'Response Time',
    category: 'Performance',
    description: 'Page loads in under 5 seconds',
    test: async (baseUrl) => {
      const start = Date.now();
      await fetch(baseUrl);
      const duration = Date.now() - start;
      if (duration > 5000) throw new Error(`Slow response: ${duration}ms`);
      return { passed: true, details: `Response time: ${duration}ms` };
    }
  },
];

// ============================================
// WHALE/TEACHERPOTATO SPECIFIC TESTS
// ============================================

const WHALE_TESTS = [
  // Navigation
  {
    id: 'admin_page',
    name: 'Admin Dashboard',
    category: 'Navigation',
    description: 'Check if /admin loads',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/admin`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Admin page accessible' };
    }
  },
  {
    id: 'games_page',
    name: 'Games Page',
    category: 'Navigation',
    description: 'Check if /games loads',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/games`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.toLowerCase().includes('coming soon')) {
        throw new Error('Still shows "Coming Soon"');
      }
      return { passed: true, details: 'Games page loads' };
    }
  },
  {
    id: 'montree_page',
    name: 'Montree Page',
    category: 'Navigation',
    description: 'Check if /admin/montree loads',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/admin/montree`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Montree page loads' };
    }
  },
  
  // Cleanup verification
  {
    id: 'no_student_route',
    name: 'Student Route Removed',
    category: 'Cleanup',
    description: 'Verify /student returns 404',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/student`);
      if (res.status === 200) {
        const html = await res.text();
        // Check if it's a real student page or just a 404 page
        if (html.includes('student') && !html.includes('404') && !html.includes('not found')) {
          throw new Error('Student route still exists');
        }
      }
      return { passed: true, details: `Status: ${res.status}` };
    }
  },
  {
    id: 'no_teacher_route',
    name: 'Teacher Route Removed',
    category: 'Cleanup',
    description: 'Verify /teacher returns 404',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/teacher`);
      if (res.status === 200) {
        const html = await res.text();
        if (html.includes('teacher') && !html.includes('404') && !html.includes('not found')) {
          throw new Error('Teacher route still exists');
        }
      }
      return { passed: true, details: `Status: ${res.status}` };
    }
  },
  
  // API Tests
  {
    id: 'api_montree_children',
    name: 'Montree Children API',
    category: 'API',
    description: 'Check /api/montree/children',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/montree/children`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Response is not an array');
      return { passed: true, details: `${data.length} children` };
    }
  },
  {
    id: 'api_whale_children',
    name: 'Whale Children API',
    category: 'API',
    description: 'Check /api/whale/children',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/whale/children`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'API accessible' };
    }
  },
  
  // Games
  {
    id: 'game_letter_sounds',
    name: 'Letter Sounds Game',
    category: 'Games',
    description: 'Check /games/letter-sounds',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/games/letter-sounds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Game accessible' };
    }
  },
  {
    id: 'game_word_building',
    name: 'Word Building Game',
    category: 'Games',
    description: 'Check /games/word-building',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/games/word-building`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Game accessible' };
    }
  },
  {
    id: 'game_letter_trace',
    name: 'Letter Trace Game',
    category: 'Games',
    description: 'Check /games/letter-trace',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/games/letter-trace`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Game accessible' };
    }
  },
  
  // Audio
  {
    id: 'audio_letter_a',
    name: 'Audio File (Letter A)',
    category: 'Assets',
    description: 'Check /audio/games/letters/a.mp3',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/audio/games/letters/a.mp3`, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Audio file exists' };
    }
  },
  {
    id: 'audio_correct',
    name: 'Audio File (Correct)',
    category: 'Assets',
    description: 'Check /audio/games/ui/correct.mp3',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/audio/games/ui/correct.mp3`, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Audio file exists' };
    }
  },
];

// ============================================
// JEFFY SPECIFIC TESTS
// ============================================

const JEFFY_TESTS = [
  {
    id: 'home_page',
    name: 'Home Page',
    category: 'Core',
    description: 'Check home page loads',
    test: async (baseUrl) => {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Home page loads' };
    }
  },
  {
    id: 'products_page',
    name: 'Products Page',
    category: 'Navigation',
    description: 'Check /products loads',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Products page loads' };
    }
  },
  {
    id: 'api_products',
    name: 'Products API',
    category: 'API',
    description: 'Check /api/products',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'API accessible' };
    }
  },
  {
    id: 'admin_page',
    name: 'Admin Page',
    category: 'Navigation',
    description: 'Check /admin loads',
    test: async (baseUrl) => {
      const res = await fetch(`${baseUrl}/admin`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { passed: true, details: 'Admin page loads' };
    }
  },
];

// ============================================
// TEST RUNNER
// ============================================

async function runTests(baseUrl, tests) {
  const results = [];
  
  console.log('\n🔍 Running tests...\n');
  
  for (const test of tests) {
    process.stdout.write(`  Testing: ${test.name}... `);
    
    try {
      const result = await test.test(baseUrl);
      results.push({ ...test, status: 'passed', details: result.details });
      console.log('✅');
    } catch (error) {
      results.push({ ...test, status: 'failed', details: error.message });
      console.log('❌');
    }
  }
  
  return results;
}

// ============================================
// REPORT GENERATOR
// ============================================

function generateReport(baseUrl, results, siteName = 'Site') {
  const timestamp = new Date().toISOString();
  const passed = results.filter(t => t.status === 'passed').length;
  const failed = results.filter(t => t.status === 'failed').length;
  
  let report = `# ${siteName.toUpperCase()} TEST REPORT FOR CLAUDE

## Test Summary
- **Site URL**: ${baseUrl}
- **Timestamp**: ${timestamp}
- **Total Tests**: ${results.length}
- **Passed**: ${passed} ✅
- **Failed**: ${failed} ❌

---

`;

  // Group by category
  const categories = [...new Set(results.map(t => t.category))];
  
  for (const category of categories) {
    const categoryTests = results.filter(t => t.category === category);
    const categoryPassed = categoryTests.filter(t => t.status === 'passed').length;
    
    report += `## ${category} (${categoryPassed}/${categoryTests.length} passed)\n\n`;
    
    for (const test of categoryTests) {
      const icon = test.status === 'passed' ? '✅' : '❌';
      report += `### ${icon} ${test.name}\n`;
      report += `- **Status**: ${test.status.toUpperCase()}\n`;
      report += `- **Details**: ${test.details}\n`;
      if (test.status === 'failed') {
        report += `- **Test ID**: ${test.id}\n`;
      }
      report += '\n';
    }
  }
  
  // Failed tests action items
  const failedTests = results.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    report += `---

## ⚠️ ACTION REQUIRED - FAILED TESTS

Claude, please help fix these ${failedTests.length} failing tests:

`;
    for (const test of failedTests) {
      report += `1. **${test.name}** (${test.id})
   - Error: ${test.details}
   - Category: ${test.category}

`;
    }
    
    report += `Please provide the code fixes needed for each failed test.
`;
  } else {
    report += `---

## 🎉 ALL TESTS PASSED!

The site is functioning correctly.
`;
  }
  
  report += `
---
*Generated by Claude Site Tester*
`;

  return report;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🔍 CLAUDE SITE TESTER
=====================

Usage:
  node site-tester.js <url> [options]

Options:
  --whale     Run Whale/TeacherPotato specific tests
  --jeffy     Run Jeffy Commerce specific tests
  --basic     Run basic universal tests only
  --help      Show this help

Examples:
  node site-tester.js https://teacherpotato.xyz --whale
  node site-tester.js https://jeffy.com --jeffy
  node site-tester.js https://any-site.com --basic

The report will be printed to console. Copy and paste it to Claude.
`);
    return;
  }
  
  const url = args[0].replace(/\/$/, '');
  
  // Determine which tests to run
  let tests = DEFAULT_TESTS;
  let siteName = 'Site';
  
  if (args.includes('--whale')) {
    tests = [...DEFAULT_TESTS, ...WHALE_TESTS];
    siteName = 'Whale/TeacherPotato';
  } else if (args.includes('--jeffy')) {
    tests = [...DEFAULT_TESTS, ...JEFFY_TESTS];
    siteName = 'Jeffy Commerce';
  } else if (args.includes('--basic')) {
    tests = DEFAULT_TESTS;
    siteName = 'Site';
  } else {
    // Auto-detect based on URL
    if (url.includes('teacherpotato') || url.includes('whale')) {
      tests = [...DEFAULT_TESTS, ...WHALE_TESTS];
      siteName = 'Whale/TeacherPotato';
    } else if (url.includes('jeffy')) {
      tests = [...DEFAULT_TESTS, ...JEFFY_TESTS];
      siteName = 'Jeffy Commerce';
    }
  }
  
  console.log(`\n🔍 Claude Site Tester`);
  console.log(`   URL: ${url}`);
  console.log(`   Tests: ${tests.length} (${siteName})`);
  
  try {
    const results = await runTests(url, tests);
    const report = generateReport(url, results, siteName);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 REPORT (Copy everything below this line)');
    console.log('='.repeat(60) + '\n');
    console.log(report);
    
    // Also save to file
    const filename = `test-report-${Date.now()}.md`;
    fs.writeFileSync(filename, report);
    console.log(`\n📁 Report also saved to: ${filename}`);
    
  } catch (error) {
    console.error('\n❌ Error running tests:', error.message);
  }
}

main();


