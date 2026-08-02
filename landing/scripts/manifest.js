// Pure catalog-manifest logic, split out of collect.mjs so it can be exercised without
// reaching GitHub. collect.mjs keeps the network and filesystem; everything here is a
// plain value-in, value-out transform.

import matter from 'gray-matter';
import {
	DEFAULT_GRADIENT_FROM,
	DEFAULT_GRADIENT_TO,
	DEFAULT_ICON,
	PLACEHOLDER_CATEGORY,
	PLACEHOLDER_STATUS
} from '../src/lib/catalog/defaults.js';

/** Title-case a repo slug for placeholder display names: "entity-graph" -> "Entity Graph". */
export function titleCase(slug) {
	return slug
		.split(/[-_]/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** First non-heading paragraph of a README, used as a placeholder body when present. */
export function firstParagraph(readme) {
	if (!readme) return undefined;
	const lines = readme.split('\n');
	const paragraphs = [];
	let current = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('![')) {
			if (current.length) {
				paragraphs.push(current.join(' '));
				current = [];
			}
			continue;
		}
		current.push(trimmed);
	}
	if (current.length) paragraphs.push(current.join(' '));
	return paragraphs.find((paragraph) => paragraph.length > 0);
}

/**
 * Normalize a manifest's frontmatter into a complete Project record, applying
 * defaults for any omitted curation field. Throws on a structurally invalid
 * manifest so the caller can fall back to a placeholder rather than crash.
 */
export function projectFromManifest(slug, repoUrl, raw) {
	const { data, content } = matter(raw);
	if (!data || typeof data.name !== 'string' || !data.name.trim()) {
		throw new Error(`manifest for ${slug} is missing a "name"`);
	}
	const body = content.trim();
	return {
		slug,
		name: data.name,
		tagline: typeof data.tagline === 'string' ? data.tagline : '',
		description: typeof data.description === 'string' ? data.description : '',
		category: typeof data.category === 'string' ? data.category : PLACEHOLDER_CATEGORY,
		status: typeof data.status === 'string' ? data.status : PLACEHOLDER_STATUS,
		features: Array.isArray(data.features) ? data.features : [],
		targetUser: typeof data.targetUser === 'string' ? data.targetUser : '',
		featured: data.featured === true,
		order: Number.isFinite(data.order) ? data.order : undefined,
		icon: typeof data.icon === 'string' && data.icon.trim() ? data.icon : DEFAULT_ICON,
		gradientFrom:
			typeof data.gradientFrom === 'string' && data.gradientFrom.trim()
				? data.gradientFrom
				: DEFAULT_GRADIENT_FROM,
		gradientTo:
			typeof data.gradientTo === 'string' && data.gradientTo.trim()
				? data.gradientTo
				: DEFAULT_GRADIENT_TO,
		repoUrl,
		body: body || undefined
	};
}

/** Last-resort placeholder built from the repo's own GitHub metadata. */
export function placeholderProject(repo, readme) {
	const description = (repo.description || '').trim();
	return {
		slug: repo.name,
		name: titleCase(repo.name),
		tagline: description,
		description,
		category: PLACEHOLDER_CATEGORY,
		status: PLACEHOLDER_STATUS,
		features: [],
		targetUser: '',
		featured: false,
		order: undefined,
		icon: DEFAULT_ICON,
		gradientFrom: DEFAULT_GRADIENT_FROM,
		gradientTo: DEFAULT_GRADIENT_TO,
		repoUrl: repo.html_url,
		body: firstParagraph(readme)
	};
}

/** Serialize a Project record back to frontmatter + body for the runtime loader. */
export function toMarkdown(project) {
	const frontmatter = {
		name: project.name,
		tagline: project.tagline,
		description: project.description,
		category: project.category,
		status: project.status,
		features: project.features,
		targetUser: project.targetUser,
		featured: project.featured,
		icon: project.icon,
		gradientFrom: project.gradientFrom,
		gradientTo: project.gradientTo,
		repoUrl: project.repoUrl
	};
	if (project.order !== undefined) frontmatter.order = project.order;
	return matter.stringify(project.body ? `\n${project.body}\n` : '', frontmatter);
}
