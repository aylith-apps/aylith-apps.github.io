#!/usr/bin/env node
// Link check over the prerendered output.
//
// Walks build/, extracts every internal href/src, and asserts each one resolves to a file that
// was actually emitted. Deploys are automatic (push, hourly cron, catalog-refresh dispatch), so a
// route renamed in one place and not the other would otherwise reach the live site as a 404.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { candidateFiles, extractLinks, isInternal, resolveTarget } from './links.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(scriptDir, '../build');

if (!fs.existsSync(buildDir)) {
	console.error(`[links] No build output at ${buildDir}. Run \`npm run build\` first.`);
	process.exit(1);
}

/** Every file in the build, as root-relative paths. */
function walk(dir, base = '') {
	const found = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const rel = `${base}/${entry.name}`;
		if (entry.isDirectory()) {
			found.push(...walk(path.join(dir, entry.name), rel));
		} else {
			found.push(rel);
		}
	}
	return found;
}

const allFiles = walk(buildDir);
const fileSet = new Set(allFiles);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));

/** `/projects/bract/index.html` is served at `/projects/bract`. */
function pagePath(file) {
	if (file === '/index.html') return '/';
	return file.replace(/\/index\.html$/, '').replace(/\.html$/, '');
}

const broken = [];
let checked = 0;

for (const file of htmlFiles) {
	const html = fs.readFileSync(path.join(buildDir, file), 'utf-8');
	const from = pagePath(file);

	for (const href of new Set(extractLinks(html))) {
		if (!isInternal(href)) continue;
		const target = resolveTarget(from, href);
		if (!target) continue;
		checked += 1;
		if (!candidateFiles(target).some((candidate) => fileSet.has(candidate))) {
			broken.push({ from, href, target });
		}
	}
}

console.log(`[links] ${htmlFiles.length} pages, ${checked} internal links checked.`);

if (broken.length > 0) {
	console.error(`[links] ${broken.length} broken link(s):`);
	for (const entry of broken) {
		console.error(`  ${entry.from} → ${entry.href} (resolved to ${entry.target})`);
	}
	process.exit(1);
}

console.log('[links] No broken internal links.');
