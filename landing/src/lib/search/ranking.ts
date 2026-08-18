import type { Project } from '$lib/types/project';

export type RankedProject = {
	project: Project;
	score: number;
	matches: {
		name?: string;
		tagline?: string;
		description?: string;
		keywords?: string[];
	};
};

/**
 * Tokenizes search query into clean terms.
 */
export function tokenize(query: string): string[] {
	return query
		.toLowerCase()
		.trim()
		.split(/\s+/)
		.filter((t) => t.length > 0);
}

/**
 * Ranks and filters projects based on a natural language query or keywords.
 * Fields scored:
 * - Exact name match: +100
 * - Name prefix/includes: +40 per token
 * - Tagline match: +20 per token
 * - Keywords/Features match: +15 per token
 * - Category / Target user / Status match: +10 per token
 * - Description body match: +5 per token
 */
export function rankProjects(projects: Project[], query: string): RankedProject[] {
	const trimmed = query.trim();
	if (!trimmed) {
		return projects.map((project) => ({
			project,
			score: 0,
			matches: {}
		}));
	}

	const tokens = tokenize(trimmed);
	const lowerQuery = trimmed.toLowerCase();
	const results: RankedProject[] = [];

	for (const project of projects) {
		let score = 0;
		const nameLower = project.name.toLowerCase();
		const taglineLower = project.tagline.toLowerCase();
		const descLower = project.description.toLowerCase();
		const targetLower = project.targetUser?.toLowerCase() || '';
		const catLower = project.category.toLowerCase();
		const statusLower = project.status.toLowerCase();
		const featuresLower = (project.features || []).map((f) => f.toLowerCase());

		// 1. Exact or whole-query matches
		if (nameLower === lowerQuery) {
			score += 120;
		} else if (nameLower.startsWith(lowerQuery)) {
			score += 60;
		} else if (nameLower.includes(lowerQuery)) {
			score += 40;
		}

		if (taglineLower.includes(lowerQuery)) {
			score += 30;
		}

		// 2. Tokenized matching
		let matchedTokens = 0;
		const matchedKeywords: string[] = [];

		for (const token of tokens) {
			let tokenHit = false;

			if (nameLower.includes(token)) {
				score += 35;
				tokenHit = true;
			}
			if (taglineLower.includes(token)) {
				score += 20;
				tokenHit = true;
			}
			if (featuresLower.some((f) => f.includes(token))) {
				score += 15;
				tokenHit = true;
				for (const feat of project.features || []) {
					if (feat.toLowerCase().includes(token) && !matchedKeywords.includes(feat)) {
						matchedKeywords.push(feat);
					}
				}
			}
			if (descLower.includes(token)) {
				score += 10;
				tokenHit = true;
			}
			if (catLower.includes(token) || targetLower.includes(token) || statusLower.includes(token)) {
				score += 8;
				tokenHit = true;
			}

			if (tokenHit) matchedTokens++;
		}

		// Require all tokens or significant overlap for multi-word queries
		if (tokens.length > 1 && matchedTokens === tokens.length) {
			score += 25; // Complete phrase/token coverage bonus
		}

		if (score > 0) {
			results.push({
				project,
				score,
				matches: {
					keywords: matchedKeywords
				}
			});
		}
	}

	// Sort highest score first, ties broken by featured flag and project order
	return results.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (a.project.featured !== b.project.featured) return a.project.featured ? -1 : 1;
		return (a.project.order ?? 99) - (b.project.order ?? 99);
	});
}
