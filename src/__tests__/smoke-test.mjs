/**
 * Frontend smoke test — verifies the built app loads and displays correctly.
 * Run after `npm run build`.
 *
 * Usage: node src/__tests__/smoke-test.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../../dist');

let passed = 0;
let failed = 0;

function check(desc, condition) {
  if (condition) {
    console.log(`  ✅ ${desc}`);
    passed++;
  } else {
    console.log(`  ❌ ${desc}`);
    failed++;
  }
}

console.log('\n📦 Frontend smoke test');

// 1. dist directory exists
check('dist/ directory exists', fs.existsSync(dist));

// 2. index.html exists and has expected content
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
check('index.html exists', html.includes('<!doctype html>'));
check('index.html references JS bundle', html.includes('src="/assets/index-'));
check('index.html has correct title', html.includes('<title>idea-journal</title>'));

// 3. CSS and JS assets exist
const files = fs.readdirSync(path.join(dist, 'assets'));
const cssFiles = files.filter(f => f.endsWith('.css'));
const jsFiles = files.filter(f => f.endsWith('.js'));
check('at least one CSS bundle exists', cssFiles.length > 0);
check('at least one JS bundle exists', jsFiles.length > 0);

// 4. JS bundle is non-trivial (not empty, not just boilerplate)
const jsBundle = path.join(dist, 'assets', jsFiles[0]);
const jsSize = fs.statSync(jsBundle).size;
check(`JS bundle size is reasonable (${(jsSize / 1024).toFixed(0)}KB)`, jsSize > 50000);

// 5. Bundle contains key app strings
const jsContent = fs.readFileSync(jsBundle, 'utf-8');
check('bundle contains THE HOOK', jsContent.includes('THE HOOK'));
check('bundle contains COOLDOWN SCORE', jsContent.includes('COOLDOWN SCORE'));
check('bundle contains status labels', jsContent.includes('ARCHIVED'));
check('bundle contains SHIPPED', jsContent.includes('SHIPPED'));

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed}\n`);
process.exit(failed > 0 ? 1 : 0);