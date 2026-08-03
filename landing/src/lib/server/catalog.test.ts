import { describe, expect, it } from 'vitest';
import { DEFAULT_GRADIENT_FROM, DEFAULT_GRADIENT_TO, DEFAULT_ICON } from '$lib/catalog/defaults.js';
import { getProject, getProjects, projectFromFrontmatter } from '$lib/server/markdown';
import { sitemapPaths, sitemapXml } from '$lib/server/sitemap';

// Runs against the committed snapshot in src/content/projects — the same data a tokenless build
// ships, so a malformed snapshot file fails here rather than on the live site.
const projects = getProjects();

describe('getProjects', () => {
	it('loads the committed catalog snapshot', () => {
		expect(projects.length).toBeGreaterThan(0);
	});

	it('gives every project the fields the catalog UI renders', () => {
		for (const project of projects) {
			expect(project.slug, 'slug').toBeTruthy();
			expect(typeof project.name, `${project.slug} name`).toBe('string');
			expect(project.name.length, `${project.slug} name`).toBeGreaterThan(0);
			expect(typeof project.category, `${project.slug} category`).toBe('string');
			expect(typeof project.status, `${project.slug} status`).toBe('string');
			expect(project.iconPath, `${project.slug} iconPath`).toBeTruthy();
			expect(project.gradientFrom, `${project.slug} gradientFrom`).toBeTruthy();
			expect(project.gradientTo, `${project.slug} gradientTo`).toBeTruthy();
			expect(typeof project.featured, `${project.slug} featured`).toBe('boolean');
		}
	});

	it('derives the slug from the filename and keeps them unique', () => {
		const slugs = projects.map((project) => project.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(slugs.every((slug) => /^[a-z0-9][a-z0-9-]*$/.test(slug))).toBe(true);
	});

	it('sorts by explicit order first, then by name', () => {
		const ordered = projects.filter((project) => project.order !== undefined);
		expect(ordered.length, 'no project carries an order — this test would assert nothing').
			toBeGreaterThan(1);
		for (let index = 1; index < ordered.length; index++) {
			expect(ordered[index].order).toBeGreaterThanOrEqual(ordered[index - 1].order as number);
		}
		// Everything without an order sorts after everything with one.
		const firstUnordered = projects.findIndex((project) => project.order === undefined);
		if (firstUnordered !== -1) {
			expect(projects.slice(firstUnordered).every((project) => project.order === undefined)).toBe(
				true
			);
		}
	});

	it('renders the body to HTML only when there is one', () => {
		const withBody = projects.filter((project) => project.body !== undefined);
		expect(withBody.length, 'no project carries a body — this test would assert nothing').
			toBeGreaterThan(0);
		for (const project of withBody) {
			expect(project.body?.trim().length, `${project.slug} body`).toBeGreaterThan(0);
			expect(project.body, `${project.slug} body`).toContain('<');
		}
	});
});

// Every file in the committed snapshot declares icon and both gradients, so the
// fallbacks are unreachable through getProjects(). They are the path a repo whose
// .aylith/project.md omits the curation fields takes, so they are tested directly.
describe('projectFromFrontmatter', () => {
	const required = {
		name: 'Probe',
		tagline: 'tagline',
		description: 'description',
		category: 'developer-tools',
		status: 'building',
		features: [],
		targetUser: 'someone'
	};

	it('fills every curation field a manifest omits', () => {
		const project = projectFromFrontmatter(required, 'probe');

		expect(project.iconPath).toBe(DEFAULT_ICON);
		expect(project.gradientFrom).toBe(DEFAULT_GRADIENT_FROM);
		expect(project.gradientTo).toBe(DEFAULT_GRADIENT_TO);
		expect(project.featured).toBe(false);
	});

	it('keeps the manifest values when they are present', () => {
		const project = projectFromFrontmatter(
			{
				...required,
				icon: 'M1 1h2',
				gradientFrom: '#000000',
				gradientTo: '#ffffff',
				featured: true
			},
			'probe'
		);

		expect(project.iconPath).toBe('M1 1h2');
		expect(project.gradientFrom).toBe('#000000');
		expect(project.gradientTo).toBe('#ffffff');
		expect(project.featured).toBe(true);
	});

	it('reads iconPath when a manifest uses that spelling instead of icon', () => {
		const project = projectFromFrontmatter({ ...required, iconPath: 'M2 2h4' }, 'probe');

		expect(project.iconPath).toBe('M2 2h4');
	});

	it('takes the slug from its argument, not from the frontmatter', () => {
		const project = projectFromFrontmatter({ ...required, slug: 'wrong' }, 'probe');

		expect(project.slug).toBe('probe');
	});
});

describe('getProject', () => {
	it('finds a project by slug', () => {
		const first = projects[0];
		expect(getProject(first.slug)?.name).toBe(first.name);
	});

	it('returns undefined for an unknown slug', () => {
		expect(getProject('definitely-not-a-project')).toBeUndefined();
	});
});

describe('sitemap', () => {
	const paths = sitemapPaths();

	it('lists every static page', () => {
		for (const path of ['/', '/about', '/projects', '/design']) {
			expect(paths).toContain(path);
		}
	});

	it('lists a detail page for every project', () => {
		for (const project of projects) {
			expect(paths).toContain(`/projects/${project.slug}`);
		}
	});

	it('lists the changelog pages, which were previously missing entirely', () => {
		const changelogPaths = paths.filter((path) => path.endsWith('/changelog'));
		expect(changelogPaths.length).toBeGreaterThan(0);
		// Only projects that actually have entries — an empty changelog page is not worth indexing.
		for (const path of changelogPaths) {
			const slug = path.split('/')[2];
			expect(projects.some((project) => project.slug === slug)).toBe(true);
		}
		expect(changelogPaths.length).toBeLessThanOrEqual(projects.length);
	});

	it('emits no duplicates', () => {
		expect(new Set(paths).size).toBe(paths.length);
	});

	it('renders absolute, well-formed XML', () => {
		const xml = sitemapXml(['/', '/about']);
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('<loc>https://aylith.com/</loc>');
		expect(xml).toContain('<loc>https://aylith.com/about</loc>');
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
		expect((xml.match(/<url>/g) ?? []).length).toBe(2);
	});
});
