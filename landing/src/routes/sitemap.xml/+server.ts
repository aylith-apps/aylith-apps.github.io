import { sitemapXml } from '$lib/server/sitemap';

export const prerender = true;

export function GET() {
	return new Response(sitemapXml(), {
		headers: {
			'Content-Type': 'application/xml'
		}
	});
}
