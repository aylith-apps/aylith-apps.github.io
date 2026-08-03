import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import {
	DEFAULT_GRADIENT_FROM,
	DEFAULT_GRADIENT_TO, 
	DEFAULT_ICON
} from '$lib/catalog/defaults.js';
import type { Project } from '$lib/types/project';

// Source of truth is the collector's output (.generated/projects, fetched from
// each repo's .aylith/project.md at build time). When that's absent — local dev
// or a build without a GitHub token — fall back to the committed snapshot dir.
const generatedDir = path.resolve('.generated/projects');
const snapshotDir = path.resolve('src/content/projects');
const contentDir = fs.existsSync(generatedDir) ? generatedDir : snapshotDir;

// Every manifest field the catalog UI needs but a manifest may omit gets its value
// here. Exported as its own unit because the committed snapshot fills all of these,
// so nothing in the content dir exercises the fallbacks.
export function projectFromFrontmatter(
	data: Record<string, unknown>,
	slug: string,
	body?: string
): Project {
	return {
		...data,
		slug,
		iconPath: data.icon ?? data.iconPath ?? DEFAULT_ICON,
		gradientFrom: data.gradientFrom ?? DEFAULT_GRADIENT_FROM,
		gradientTo: data.gradientTo ?? DEFAULT_GRADIENT_TO,
		featured: data.featured ?? false,
		body
	} as Project;
}

export function getProjects(): Project[] {
	if (!fs.existsSync(contentDir)) return [];

	return fs
		.readdirSync(contentDir)
		.filter((filename: string) => filename.endsWith('.md'))
		.map((filename: string) => {
			const raw = fs.readFileSync(path.join(contentDir, filename), 'utf-8');
			const { data, content } = matter(raw);
			const slug = filename.replace('.md', '');
			const html = content.trim() ? (marked.parse(content) as string) : undefined;

			return projectFromFrontmatter(data, slug, html);
		})
		.sort((first, second) => {
			const firstOrder = first.order ?? Number.MAX_SAFE_INTEGER;
			const secondOrder = second.order ?? Number.MAX_SAFE_INTEGER;
			if (firstOrder !== secondOrder) return firstOrder - secondOrder;
			return first.name.localeCompare(second.name);
		});
}

export function getProject(slug: string): Project | undefined {
	return getProjects().find((project) => project.slug === slug);
}
