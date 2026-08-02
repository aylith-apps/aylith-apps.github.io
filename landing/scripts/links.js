// Pure link-extraction helpers for the prerendered-output link check.
// scripts/check-links.mjs walks build/ and applies these; they are kept separate so the
// classification rules can be tested without a build.

const ATTRIBUTE_PATTERN = /\s(?:href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi;

/** Every href/src value in a page, in document order, duplicates included. */
export function extractLinks(html) {
	const links = [];
	for (const match of html.matchAll(ATTRIBUTE_PATTERN)) {
		const value = match[2] ?? match[3] ?? '';
		if (value) links.push(value);
	}
	return links;
}

/**
 * Whether a link points at this site's own prerendered output.
 *
 * Absolute URLs, protocol-relative URLs, and non-navigational schemes (mailto:, tel:, data:,
 * javascript:) belong to somebody else; a bare fragment stays on the page it came from.
 */
export function isInternal(href) {
	if (!href) return false;
	const value = href.trim();
	if (!value || value.startsWith('#')) return false;
	if (value.startsWith('//')) return false;
	return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

// Only ever used as a base for relative resolution; the origin is discarded.
const RESOLUTION_ORIGIN = 'https://links.invalid';

/**
 * Resolve an internal link to a path relative to the site root, dropping any query or fragment.
 * `fromPath` is the page's own root-relative path (e.g. `/projects/bract`).
 *
 * Resolution is delegated to the URL parser so `.`, `..` and directory-versus-file bases follow
 * exactly the rules a browser applies to the same href.
 */
export function resolveTarget(fromPath, href) {
	const withoutHash = href.split('#')[0].split('?')[0];
	if (!withoutHash) return null;
	const { pathname } = new URL(withoutHash, `${RESOLUTION_ORIGIN}${fromPath}`);
	try {
		return decodeURIComponent(pathname);
	} catch {
		// A malformed escape sequence; compare the raw form rather than dropping the link.
		return pathname;
	}
}

/** Candidate files in the build output that would serve `target`. */
export function candidateFiles(target) {
	if (target === '/' || target.endsWith('/')) return [`${target}index.html`];
	return [target, `${target}.html`, `${target}/index.html`];
}
