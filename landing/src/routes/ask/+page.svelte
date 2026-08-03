<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Assistant from '$lib/ask/Assistant.svelte';
	import { resolveAiUrl } from '$lib/ask/config';

	const apiUrl = resolveAiUrl();

	// The page snapshot the assistant receives each turn — here it just says which
	// surface it's on. The embeddable widget passes far richer per-page state.
	function pageContext() {
		return {
			surface: 'aylith.com — Ask',
			route: '/ask',
			note: 'Full-page studio assistant. No specific product page is open.'
		};
	}
</script>

<Seo
	title="Ask Aylith — the studio assistant"
	description="Ask anything about the Aylith suite: what each tool does, which fits a need, how they connect, and — once signed in — your own data across apps."
/>

<section class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
	<header class="pt-10 pb-2 sm:pt-14">
		<p class="animate-fade-in-up text-xs font-medium uppercase tracking-[0.14em] text-accent-600 dark:text-accent-400">
			Ask
		</p>
		<h1
			class="animate-fade-in-up mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-surface-900 sm:text-4xl dark:text-warm-50"
			style="animation-delay: 0.05s"
		>
			The studio assistant
		</h1>
		<p
			class="animate-fade-in-up mt-3 max-w-2xl text-surface-600 dark:text-warm-300"
			style="animation-delay: 0.1s"
		>
			One assistant across the whole suite — grounded in the catalog and the shared entity graph.
		</p>
	</header>

	<div
		class="animate-fade-in-up mb-10 mt-4 flex min-h-[60vh] flex-1 flex-col rounded-2xl border border-surface-200 bg-white/40 p-2 sm:p-3 dark:border-surface-800 dark:bg-surface-900/30"
		style="animation-delay: 0.15s"
	>
		<Assistant {apiUrl} {pageContext} />
	</div>
</section>
