export function countup(node: HTMLElement, options: { target: number; duration?: number; suffix?: string } = { target: 0 }) {
	const { target, duration = 1800, suffix = '' } = options;

	node.textContent = `0${suffix}`;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					animate();
					observer.unobserve(node);
				}
			}
		},
		{ threshold: 0.3 }
	);

	function animate() {
		const start = performance.now();

		function tick(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			// ease-out-quart
			const eased = 1 - (1 - progress) ** 4;
			const current = Math.round(eased * target);
			node.textContent = `${current}${suffix}`;

			if (progress < 1) {
				requestAnimationFrame(tick);
			}
		}

		requestAnimationFrame(tick);
	}

	observer.observe(node);

	return {
		destroy() {
			observer.unobserve(node);
		}
	};
}
