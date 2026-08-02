import { describe, expect, it } from 'vitest';
import { candidateFiles, extractLinks, isInternal, resolveTarget } from './links.js';

describe('extractLinks', () => {
	it('picks up href and src from single and double quotes', () => {
		const html = `
			<a href="/about">About</a>
			<link rel="stylesheet" href='/_app/style.css'>
			<img src="/brand/avatar.svg" alt="">
			<script src="/_app/start.js"></script>
		`;
		expect(extractLinks(html)).toEqual([
			'/about',
			'/_app/style.css',
			'/brand/avatar.svg',
			'/_app/start.js'
		]);
	});

	it('ignores attributes that merely end in href or src', () => {
		// Without the leading-whitespace guard, `data-href` and `srcset` would be collected as links
		// and the check would report phantom breakage on every page that uses them.
		const html = '<img data-href="/nope" srcset="/a.png 1x" src="/real.png">';
		expect(extractLinks(html)).toEqual(['/real.png']);
	});

	it('returns an empty list for markup with no links', () => {
		expect(extractLinks('<p>hello</p>')).toEqual([]);
	});
});

describe('isInternal', () => {
	it.each(['/about', '/projects/bract', 'changelog', './sibling', '../up', '/favicon.svg'])(
		'treats %p as internal',
		(href) => {
			expect(isInternal(href)).toBe(true);
		}
	);

	it.each([
		'https://github.com/aylith-labs',
		'http://example.com',
		'//media.aylith.com/shot.png',
		'mailto:hi@aylith.com',
		'tel:+100',
		'data:image/svg+xml;base64,AAA',
		'javascript:void(0)',
		'#main',
		''
	])('treats %p as external or non-navigational', (href) => {
		expect(isInternal(href)).toBe(false);
	});
});

describe('resolveTarget', () => {
	it('keeps a root-relative link as-is', () => {
		expect(resolveTarget('/projects/bract', '/about')).toBe('/about');
	});

	it('resolves a relative link against the page it came from', () => {
		// A non-directory path resolves against its parent, matching how a browser reads the href.
		expect(resolveTarget('/projects/bract', 'changelog')).toBe('/projects/changelog');
		expect(resolveTarget('/projects/bract/', 'changelog')).toBe('/projects/bract/changelog');
		expect(resolveTarget('/projects/bract/changelog', '../about')).toBe('/projects/about');
		expect(resolveTarget('/projects/bract/', './sibling')).toBe('/projects/bract/sibling');
	});

	it.each([
		['/projects/bract', 'changelog'],
		['/projects/bract/', 'changelog'],
		['/projects/bract/changelog', '../about'],
		['/projects/bract/changelog/', '../../about'],
		['/projects/bract/changelog/', '../../../../about'],
		['/projects/bract/', './sibling'],
		['/', 'about'],
		['/about', '/projects/']
	])('matches URL resolution for %p + %p', (from, href) => {
		// The check reports a 404 for anything it resolves differently from a browser, so the URL
		// parser is the oracle rather than a hand-maintained expectation.
		expect(resolveTarget(from, href)).toBe(new URL(href, `https://aylith.com${from}`).pathname);
	});

	it('drops the query and fragment', () => {
		expect(resolveTarget('/', '/projects?filter=live#top')).toBe('/projects');
	});

	it('returns null when nothing is left to resolve', () => {
		expect(resolveTarget('/', '#top')).toBeNull();
	});
});

describe('candidateFiles', () => {
	it('maps a directory-style path to its index', () => {
		expect(candidateFiles('/')).toEqual(['/index.html']);
		expect(candidateFiles('/projects/')).toEqual(['/projects/index.html']);
	});

	it('accepts the extensionless, .html and index.html forms of a page', () => {
		// adapter-static emits /projects/bract/index.html; the site links to /projects/bract.
		expect(candidateFiles('/projects/bract')).toEqual([
			'/projects/bract',
			'/projects/bract.html',
			'/projects/bract/index.html'
		]);
	});
});
