#!/usr/bin/env node

// Build-time catalog collector.
//
// Lists every repo in the aylith-labs org, drops archived repos, the site repo
// itself, and any repo carrying the EXCLUDE_TOPIC. For each remaining repo it
// fetches `.aylith/project.md`; when that's absent it synthesizes a "Planning"
// placeholder from the repo name + GitHub description. Results are written as
// frontmatter+body Markdown into landing/.generated/projects/<slug>.md so the
// existing gray-matter + marked pipeline (server/markdown.ts) reads them unchanged.
//
// The pure transforms live in ./manifest.js; this file owns the network and disk.
//
// Auth: CATALOG_GITHUB_TOKEN (preferred) or GITHUB_TOKEN. Unauthenticated runs
// hit the 60 req/hr ceiling, so a token is effectively required in CI.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Octokit } from '@octokit/rest';
import { EXCLUDE_TOPIC, ORG, SELF_REPO } from '../src/lib/catalog/defaults.js';
import { placeholderProject, projectFromManifest, toMarkdown } from './manifest.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '../.generated/projects');
// Written first, swapped into place only on success — a mid-run failure then
// leaves any prior output untouched and the build falls back to the snapshot.
const tmpDir = path.resolve(scriptDir, '../.generated/projects.tmp');
const snapshotDir = path.resolve(scriptDir, '../src/content/projects');
const MANIFEST_PATH = '.aylith/project.md';

const token = process.env.CATALOG_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
	console.error(
		'[collect] No CATALOG_GITHUB_TOKEN / GITHUB_TOKEN set — refusing to run unauthenticated.'
	);
	console.error(
		'[collect] (local dev: server/markdown.ts falls back to the committed snapshot dir, so this is fine to skip.)'
	);
	process.exit(1);
}

const octokit = new Octokit({ auth: token });

/** Fetch the raw text of a file at the repo's default branch, or null if missing. */
async function fetchFile(repo, filePath) {
	try {
		const { data } = await octokit.repos.getContent({ owner: ORG, repo, path: filePath });
		if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') return null;
		return Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf-8').toString(
			'utf-8'
		);
	} catch (error) {
		if (error.status === 404) return null;
		throw error;
	}
}

/** Slugs present in the committed snapshot — the set the live site currently shows. */
function snapshotSlugs() {
	if (!fs.existsSync(snapshotDir)) return [];
	return fs
		.readdirSync(snapshotDir)
		.filter((filename) => filename.endsWith('.md'))
		.map((filename) => filename.replace(/\.md$/, ''));
}

/**
 * A token that cannot see the org's private repos still succeeds — it just returns
 * fewer repos, and the site quietly deploys with projects missing. Comparing against
 * the committed snapshot turns that silent shrink into a visible warning.
 */
function reportDroppedProjects(collectedSlugs) {
	const collected = new Set(collectedSlugs);
	const dropped = snapshotSlugs().filter((slug) => !collected.has(slug));
	if (dropped.length === 0) return;
	console.warn(
		`::warning::[collect] ${dropped.length} project(s) in the committed snapshot were not collected: ${dropped.join(', ')}. ` +
			'Expected if those repos were archived or removed; otherwise the token cannot see them (CATALOG_GITHUB_TOKEN needs org read access).'
	);
}

async function main() {
	console.log(`[collect] Listing repos for org "${ORG}"…`);
	const repos = await octokit.paginate(octokit.repos.listForOrg, {
		org: ORG,
		type: 'all',
		per_page: 100
	});

	const included = repos.filter((repo) => {
		if (repo.archived) return false;
		if (repo.name === SELF_REPO) return false;
		if ((repo.topics || []).includes(EXCLUDE_TOPIC)) return false;
		return true;
	});

	console.log(`[collect] ${repos.length} repos total → ${included.length} after exclusions.`);

	fs.rmSync(tmpDir, { recursive: true, force: true });
	fs.mkdirSync(tmpDir, { recursive: true });

	let fromManifest = 0;
	let placeholders = 0;

	for (const repo of included) {
		const manifest = await fetchFile(repo.name, MANIFEST_PATH);
		let project;
		if (manifest) {
			try {
				project = projectFromManifest(repo.name, repo.html_url, manifest);
				fromManifest += 1;
				console.log(`[collect]   ✓ ${repo.name} (manifest)`);
			} catch (error) {
				console.warn(
					`[collect]   ! ${repo.name} manifest invalid (${error.message}) — using placeholder.`
				);
			}
		}
		if (!project) {
			const readme = await fetchFile(repo.name, 'README.md');
			project = placeholderProject(repo, readme);
			placeholders += 1;
			console.log(`[collect]   · ${repo.name} (placeholder)`);
		}
		fs.writeFileSync(path.join(tmpDir, `${repo.name}.md`), toMarkdown(project), 'utf-8');
	}

	// Atomic swap: only replace the live dir once every repo has been written.
	fs.rmSync(outDir, { recursive: true, force: true });
	fs.renameSync(tmpDir, outDir);

	reportDroppedProjects(included.map((repo) => repo.name));

	console.log(
		`[collect] Wrote ${included.length} projects → ${outDir} (${fromManifest} manifest, ${placeholders} placeholder).`
	);
}

main().catch((error) => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
	console.error('[collect] Failed:', error);
	process.exit(1);
});
