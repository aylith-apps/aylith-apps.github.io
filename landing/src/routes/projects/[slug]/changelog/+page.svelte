<script lang="ts">
	import type { Project } from '$lib/types/project';
	import type { ChangelogEntry, ChangelogTag } from '$lib/types/changelog';
	import { reveal } from '$lib/actions/reveal';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
	let project: Project = $derived(data.project);
	let entries: ChangelogEntry[] = $derived(data.entries);

	const tagStyles: Record<ChangelogTag, string> = {
		added: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
		changed: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
		fixed: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
		removed: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
		infra: 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
		docs: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300'
	};

	const dateFormat = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	function formatDate(iso: string): string {
		return dateFormat.format(new Date(`${iso}T00:00:00Z`));
	}
</script>

<Seo
	title="{project.name} Changelog — Aylith"
	description="Release history for {project.name}: {project.tagline}"
	type="article"
/>

<!-- Header -->
<section class="relative overflow-hidden">
	<div
		class="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
		style="background: linear-gradient(135deg, {project.gradientFrom}, {project.gradientTo})"
	></div>

	<div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
		<a
			href="/projects/{project.slug}"
			class="mb-8 inline-flex items-center gap-1.5 text-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-warm-400 dark:hover:text-warm-200"
		>
			<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			{project.name}
		</a>

		<div class="flex items-start gap-5">
			<svg
				class="mt-1 size-10 shrink-0 sm:size-12"
				style="color: {project.gradientFrom}"
				fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={project.iconPath} />
			</svg>

			<div>
				<h1 class="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl dark:text-warm-50">
					{project.name} <span class="font-normal text-surface-400 dark:text-warm-400">Changelog</span>
				</h1>
				<p class="mt-2 max-w-2xl text-surface-500 dark:text-warm-300">
					Every meaningful change to {project.name}, told with the media it deserves — screenshots
					and clips adapt to your current theme.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Timeline -->
<section class="py-12 sm:py-16 lg:py-20">
	<div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
		{#if entries.length === 0}
			<div
				class="rounded-xl border border-dashed border-surface-300 p-10 text-center sm:p-14 dark:border-warm-700"
				use:reveal
			>
				<p class="text-surface-600 dark:text-warm-300">No changelog entries yet.</p>
				<p class="mt-2 text-sm text-surface-400 dark:text-warm-400">
					{project.name} is {project.status === 'research' || project.status === 'planning'
						? 'still on the drawing board'
						: 'under active development'} — entries land here the moment something ships.
				</p>
			</div>
		{:else}
			<ol class="relative space-y-16 border-l border-surface-200 pl-8 sm:pl-10 dark:border-warm-700">
				{#each entries as entry (entry.id)}
					<li id={entry.id} class="relative scroll-mt-24" use:reveal>
						<span
							class="absolute top-1.5 -left-8 size-3 -translate-x-1/2 rounded-full border-2 border-white sm:-left-10 dark:border-warm-950"
							style="background: {project.gradientFrom}"
						></span>

						<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
							<a
								href="#{entry.id}"
								class="text-sm font-medium text-surface-400 tabular-nums hover:text-surface-600 dark:text-warm-400 dark:hover:text-warm-200"
							>
								<time datetime={entry.date}>{formatDate(entry.date)}</time>
							</a>
							{#each entry.tags as tag (tag)}
								<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {tagStyles[tag] ?? tagStyles.changed}">
									{tag}
								</span>
							{/each}
						</div>

						<h2 class="mt-2 text-xl font-bold text-surface-900 sm:text-2xl dark:text-warm-50">
							{entry.title}
						</h2>

						<div
							class="prose prose-surface mt-4 max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-accent-600 dark:prose-a:text-accent-400 dark:prose-p:text-warm-300 dark:prose-li:text-warm-300 dark:prose-strong:text-warm-100"
						>
							<entry.component />
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>
