<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import { tick } from 'svelte';
	import { renderMarkdown } from './markdown';

	type Props = {
		apiUrl: string;
		/** Returns the compact page snapshot sent with each turn. */
		pageContext?: () => unknown;
		placeholder?: string;
		suggestions?: string[];
	};

	let {
		apiUrl,
		pageContext = () => undefined,
		placeholder = 'Ask anything about the Aylith suite…',
		suggestions = [
			'What is Aylith and what tools are in the suite?',
			'I need something to track API schemas — what fits?',
			'Which products are live versus still building?',
			'How do the tools connect to each other?'
		]
	}: Props = $props();

	const chat = new Chat({
		transport: new DefaultChatTransport({
			api: `${apiUrl}/api/chat`,
			prepareSendMessagesRequest: ({ messages, body }) => ({
				body: { ...body, messages, pageContext: pageContext() }
			})
		})
	});

	let input = $state('');
	let scroller: HTMLDivElement | null = $state(null);

	const isBusy = $derived(chat.status === 'submitted' || chat.status === 'streaming');

	function textOf(message: UIMessage): string {
		return message.parts
			.filter((part) => part.type === 'text')
			.map((part) => ('text' in part ? part.text : ''))
			.join('');
	}

	function toolsOf(message: UIMessage): string[] {
		return message.parts
			.filter((part) => part.type.startsWith('tool-'))
			.map((part) => part.type.replace(/^tool-/, ''))
			.filter((name, index, all) => all.indexOf(name) === index);
	}

	async function scrollToEnd() {
		await tick();
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	}

	function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || isBusy) return;
		input = '';
		chat.sendMessage({ text: trimmed });
		scrollToEnd();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			send(input);
		}
	}

	// Auto-scroll as new content streams in.
	$effect(() => {
		// touch length + last message text so this re-runs on stream deltas
		const last = chat.messages.at(-1);
		void chat.messages.length;
		void (last ? textOf(last) : '');
		scrollToEnd();
	});
</script>

<div class="flex h-full flex-col">
	<div bind:this={scroller} class="flex-1 space-y-5 overflow-y-auto px-1 py-4">
		{#if chat.messages.length === 0}
			<div class="mx-auto max-w-2xl pt-6 text-center">
				<p class="text-surface-500 dark:text-surface-400">
					Ask about any tool in the suite, what fits a need, how the tools connect, or — once
					you're signed in — your own data across apps.
				</p>
				<div class="mt-6 grid gap-2 sm:grid-cols-2">
					{#each suggestions as suggestion (suggestion)}
						<button
							onclick={() => send(suggestion)}
							class="btn-press rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-left text-sm text-surface-700 transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-accent-700 dark:hover:bg-surface-800"
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#each chat.messages as message (message.id)}
			{@const tools = toolsOf(message)}
			{@const body = textOf(message)}
			<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div
					class="max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed {message.role ===
					'user'
						? 'bg-accent-600 text-white'
						: 'bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-warm-100'}"
				>
					{#if tools.length > 0}
						<div class="mb-1.5 flex flex-wrap gap-1">
							{#each tools as tool (tool)}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-surface-200/70 px-2 py-0.5 text-[0.7rem] font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300"
								>
									<svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M5 12h14M12 5v14" stroke-linecap="round" />
									</svg>
									{tool}
								</span>
							{/each}
						</div>
					{/if}
					{#if message.role === 'assistant'}
						{#if body}
							<div class="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-surface-900 prose-pre:text-warm-100">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html renderMarkdown(body)}
							</div>
						{:else if isBusy}
							<span class="inline-flex gap-1 py-1">
								<span class="size-1.5 animate-pulse rounded-full bg-surface-400 [animation-delay:-0.3s]"></span>
								<span class="size-1.5 animate-pulse rounded-full bg-surface-400 [animation-delay:-0.15s]"></span>
								<span class="size-1.5 animate-pulse rounded-full bg-surface-400"></span>
							</span>
						{/if}
					{:else}
						<span class="whitespace-pre-wrap">{body}</span>
					{/if}
				</div>
			</div>
		{/each}

		{#if chat.error}
			<div class="mx-auto max-w-2xl rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
				{chat.error.message || 'Something went wrong.'}
				<button class="ml-2 underline" onclick={() => chat.regenerate()}>Retry</button>
			</div>
		{/if}
	</div>

	<div class="border-t border-surface-200 bg-white/60 px-1 pt-3 dark:border-surface-800 dark:bg-surface-950/60">
		<div class="flex items-end gap-2 rounded-2xl border border-surface-200 bg-surface-50 px-3 py-2 focus-within:border-accent-400 dark:border-surface-800 dark:bg-surface-900">
			<textarea
				bind:value={input}
				onkeydown={onKeydown}
				rows="1"
				{placeholder}
				class="max-h-40 flex-1 resize-none bg-transparent py-1 text-[0.95rem] text-surface-900 placeholder:text-surface-400 focus:outline-none dark:text-warm-100"
			></textarea>
			{#if isBusy}
				<button
					onclick={() => chat.stop()}
					class="btn-press rounded-xl bg-surface-200 px-3 py-2 text-surface-700 dark:bg-surface-700 dark:text-surface-200"
					aria-label="Stop"
				>
					<svg class="size-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
				</button>
			{:else}
				<button
					onclick={() => send(input)}
					disabled={!input.trim()}
					class="btn-press rounded-xl bg-accent-600 px-3 py-2 text-white transition-opacity disabled:opacity-40"
					aria-label="Send"
				>
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			{/if}
		</div>
		<p class="px-2 py-1.5 text-center text-[0.7rem] text-surface-400">
			Answers are grounded in the Aylith catalog and the shared entity graph. Verify anything important.
		</p>
	</div>
</div>
