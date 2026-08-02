import { getSlugsWithEntries } from '$lib/changelog/entries';
import { getProjects } from '$lib/server/markdown';

export const SITE_ORIGIN = 'https://aylith.com';

const STATIC_PATHS = ['/', '/about', '/projects', '/design'];

/** Every prerendered, publicly linked page. Kept in step with the routes that emit HTML. */
export function sitemapPaths(): string[] {
	const withChangelog = new Set(getSlugsWithEntries());

	const projectPaths = getProjects().flatMap((project) => {
		const paths = [`/projects/${project.slug}`];
		// The changelog page prerenders for every project, but only the ones with entries have
		// anything to index — and none of them appeared in the sitemap at all before.
		if (withChangelog.has(project.slug)) paths.push(`/projects/${project.slug}/changelog`);
		return paths;
	});

	return [...STATIC_PATHS, ...projectPaths];
}

export function sitemapXml(paths: string[] = sitemapPaths()): string {
	const urls = paths
		.map((path) => `\t<url>\n\t\t<loc>${SITE_ORIGIN}${path}</loc>\n\t</url>`)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
