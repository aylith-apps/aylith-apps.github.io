import { describe, expect, it } from 'vitest';
import {
	DEFAULT_GRADIENT_FROM,
	DEFAULT_GRADIENT_TO,
	DEFAULT_ICON,
	PLACEHOLDER_CATEGORY,
	PLACEHOLDER_STATUS
} from '../src/lib/catalog/defaults.js';
import {
	firstParagraph,
	placeholderProject,
	projectFromManifest,
	titleCase,
	toMarkdown
} from './manifest.js';

const FULL_MANIFEST = `---
name: Bract
tagline: Ship telemetry without the platform tax
description: A collector and dashboard you can run yourself.
category: developer-tools
status: beta
features:
  - Collectors
  - Live logs
targetUser: Small teams
featured: true
order: 3
icon: M4 4h16
gradientFrom: '#111111'
gradientTo: '#222222'
---

The long-form body.
`;

describe('titleCase', () => {
	it.each([
		['entity-graph', 'Entity Graph'],
		['bract', 'Bract'],
		['aylith_infra', 'Aylith Infra'],
		['a--b', 'A B']
	])('turns %p into %p', (slug, expected) => {
		expect(titleCase(slug)).toBe(expected);
	});
});

describe('firstParagraph', () => {
	it('returns the first prose paragraph, skipping headings, quotes and images', () => {
		const readme = [
			'# Bract',
			'',
			'> A tagline in a blockquote',
			'',
			'![banner](https://example.com/b.png)',
			'',
			'The real first paragraph,',
			'wrapped across two lines.',
			'',
			'A second paragraph.'
		].join('\n');
		expect(firstParagraph(readme)).toBe('The real first paragraph, wrapped across two lines.');
	});

	it('returns undefined for empty or heading-only input', () => {
		expect(firstParagraph(undefined)).toBeUndefined();
		expect(firstParagraph('')).toBeUndefined();
		expect(firstParagraph('# Title\n\n## Subtitle\n')).toBeUndefined();
	});
});

describe('projectFromManifest', () => {
	it('carries every curated field through unchanged', () => {
		const project = projectFromManifest('bract', 'https://github.com/aylith-labs/bract', FULL_MANIFEST);
		expect(project).toMatchObject({
			slug: 'bract',
			name: 'Bract',
			tagline: 'Ship telemetry without the platform tax',
			category: 'developer-tools',
			status: 'beta',
			features: ['Collectors', 'Live logs'],
			targetUser: 'Small teams',
			featured: true,
			order: 3,
			icon: 'M4 4h16',
			gradientFrom: '#111111',
			gradientTo: '#222222',
			repoUrl: 'https://github.com/aylith-labs/bract'
		});
		expect(project.body).toBe('The long-form body.');
	});

	it('fills defaults for a manifest that only declares a name', () => {
		const project = projectFromManifest('minimal', 'https://example.com/minimal', '---\nname: Minimal\n---\n');
		expect(project).toMatchObject({
			name: 'Minimal',
			tagline: '',
			description: '',
			category: PLACEHOLDER_CATEGORY,
			status: PLACEHOLDER_STATUS,
			features: [],
			targetUser: '',
			featured: false,
			icon: DEFAULT_ICON,
			gradientFrom: DEFAULT_GRADIENT_FROM,
			gradientTo: DEFAULT_GRADIENT_TO
		});
		expect(project.order).toBeUndefined();
		expect(project.body).toBeUndefined();
	});

	it('ignores fields of the wrong type rather than publishing them', () => {
		const project = projectFromManifest(
			'odd',
			'https://example.com/odd',
			'---\nname: Odd\ntagline: 42\nfeatures: "not a list"\nfeatured: "yes"\norder: "3"\ngradientFrom: "   "\n---\n'
		);
		expect(project.tagline).toBe('');
		expect(project.features).toEqual([]);
		// Only a real boolean promotes a project onto the front page.
		expect(project.featured).toBe(false);
		expect(project.order).toBeUndefined();
		expect(project.gradientFrom).toBe(DEFAULT_GRADIENT_FROM);
	});

	it.each([
		['no frontmatter at all', 'just a body\n'],
		['a missing name', '---\ntagline: no name here\n---\n'],
		['a blank name', '---\nname: "   "\n---\n'],
		['a non-string name', '---\nname: 7\n---\n']
	])('throws on %s so the caller can fall back to a placeholder', (_label, raw) => {
		expect(() => projectFromManifest('broken', 'https://example.com/broken', raw)).toThrow(
			/missing a "name"/
		);
	});
});

describe('placeholderProject', () => {
	it('builds a planning entry from repo metadata', () => {
		const project = placeholderProject(
			{ name: 'entity-graph', description: '  Graphs for entities.  ', html_url: 'https://example.com/eg' },
			'# Entity Graph\n\nMaps relationships.\n'
		);
		expect(project).toMatchObject({
			slug: 'entity-graph',
			name: 'Entity Graph',
			tagline: 'Graphs for entities.',
			category: PLACEHOLDER_CATEGORY,
			status: PLACEHOLDER_STATUS,
			featured: false,
			repoUrl: 'https://example.com/eg',
			body: 'Maps relationships.'
		});
	});

	it('tolerates a repo with no description and no readme', () => {
		const project = placeholderProject({ name: 'bare', description: null, html_url: 'https://example.com/bare' }, null);
		expect(project.tagline).toBe('');
		expect(project.body).toBeUndefined();
	});
});

describe('toMarkdown', () => {
	it('round-trips a project back through the manifest parser', () => {
		const original = projectFromManifest('bract', 'https://github.com/aylith-labs/bract', FULL_MANIFEST);
		const reparsed = projectFromManifest('bract', 'https://github.com/aylith-labs/bract', toMarkdown(original));
		expect(reparsed).toEqual(original);
	});

	it('omits order when the project has none, so the loader applies its own fallback', () => {
		const project = projectFromManifest('minimal', 'https://example.com/minimal', '---\nname: Minimal\n---\n');
		expect(toMarkdown(project)).not.toContain('order:');
	});
});
