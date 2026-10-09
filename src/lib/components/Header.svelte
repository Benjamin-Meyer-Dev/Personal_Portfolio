<script lang="ts">
	interface Props {
		Demos?: boolean;
		Touring?: boolean;
		IncidentRunning?: boolean;
		OnTour?: () => void;
		OnIncident?: () => void;
	}

	let {
		Demos = false,
		Touring = false,
		IncidentRunning = false,
		OnTour,
		OnIncident
	}: Props = $props();

	let menuOpen = $state(false);

	const links = [
		{ href: '#systems', label: 'Systems' },
		{ href: '#experience', label: 'Experience' },
		{ href: '#contact', label: 'Contact' }
	];
</script>

<header>
	<a class="brand" href="#top">
		<span class="mark">BM</span>
		<span class="name">
			<span class="title">Benjamin Meyer</span>
			<span class="sub">Python · AWS · Data systems</span>
		</span>
	</a>

	<nav aria-label="Primary">
		{#if Demos}
			<button type="button" class="pill tour" onclick={OnTour}>
				{Touring ? 'Stop tour' : 'Take the 1-Minute Tour'}
			</button>
			<button
				type="button"
				class="pill incident"
				aria-disabled={IncidentRunning}
				onclick={OnIncident}
			>
				<span class="dot" aria-hidden="true"></span>
				{IncidentRunning ? 'Incident Running' : 'Trigger an Incident'}
			</button>
			<span class="divider" aria-hidden="true"></span>
		{/if}
		<span class="links">
			{#each links as link (link.href)}
				<a href={link.href}>{link.label}</a>
			{/each}
		</span>
		<button
			type="button"
			class="menu"
			aria-label={menuOpen ? 'Close Menu' : 'Open Menu'}
			aria-expanded={menuOpen}
			aria-controls="mobile-menu"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				{#if menuOpen}
					<path d="M4 4l10 10M14 4L4 14" />
				{:else}
					<path d="M2 5h14M2 9h14M2 13h14" />
				{/if}
			</svg>
		</button>
	</nav>

	{#if menuOpen}
		<div id="mobile-menu" class="sheet">
			{#each links as link (link.href)}
				<a href={link.href} onclick={() => (menuOpen = false)}>{link.label}</a>
			{/each}
		</div>
	{/if}
</header>

<style>
	header {
		position: fixed;
		inset: 0 0 auto 0;
		z-index: var(--layer-header);
		height: var(--header-h);
		padding: 0 var(--space-28);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-20);
		background: var(--header-glass);
		backdrop-filter: blur(var(--blur-md));
		border-bottom: 1px solid var(--line);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-12);
		min-height: var(--tap-size);
		color: var(--ink);
	}

	.mark {
		width: 34px;
		height: 34px;
		border: 1px solid var(--line-3);
		border-radius: var(--radius-lg);
		background: var(--surface);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--mono);
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		color: var(--blue);
	}

	.name {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.title {
		font-weight: var(--weight-semibold);
		font-size: var(--text-lg);
		letter-spacing: var(--tracking-tight-xs);
	}

	.sub {
		font-family: var(--mono);
		font-size: var(--text-3xs);
		letter-spacing: var(--tracking-wide-md);
		text-transform: uppercase;
		color: var(--ink-4);
	}

	nav {
		display: flex;
		align-items: center;
		gap: var(--space-10);
		font-size: var(--text-md);
	}

	.pill {
		height: var(--control-height);
		padding: 0 var(--space-16);
		border-radius: var(--radius-pill);
		background: var(--surface);
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
		cursor: pointer;
		box-shadow: var(--shadow-control);
		display: inline-flex;
		align-items: center;
		gap: var(--space-8);
	}

	.tour {
		border: 1px solid var(--blue);
		color: var(--ink);
	}

	.tour:hover {
		background: var(--blue-soft);
	}

	.incident {
		border: 1px solid var(--red);
		color: var(--red-ink);
	}

	.incident:hover {
		background: var(--red-soft);
	}

	.incident[aria-disabled='true'] {
		opacity: 0.6;
	}

	.dot {
		width: var(--dot-size);
		height: var(--dot-size);
		border-radius: var(--radius-round);
		background: var(--red);
		animation: pulse var(--duration-pulse) var(--ease-in-out) infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}

	.divider {
		width: 1px;
		height: 22px;
		margin: 0 var(--space-6);
		background: var(--line-2);
	}

	.links {
		display: flex;
		align-items: center;
		gap: var(--space-22);
	}

	.links a {
		color: var(--ink-3);
		min-height: var(--tap-size);
		display: inline-flex;
		align-items: center;
	}

	.links a:hover {
		color: var(--ink);
	}

	.menu {
		display: none;
		width: var(--tap-size);
		height: var(--tap-size);
		border-radius: var(--radius-xl);
		border: 1px solid var(--line-3);
		background: var(--surface);
		color: var(--ink);
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.menu path {
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		fill: none;
	}

	.sheet {
		position: absolute;
		top: calc(var(--header-h) - 1px);
		right: 0;
		left: 0;
		padding: var(--space-8) var(--space-16) var(--space-16);
		display: flex;
		flex-direction: column;
		background: var(--surface-2);
		border-bottom: 1px solid var(--line);
		box-shadow: var(--shadow-float);
	}

	.sheet a {
		min-height: var(--tap-size-lg);
		display: flex;
		align-items: center;
		font-size: var(--text-2xl);
		color: var(--ink);
		border-bottom: 1px solid var(--line);
	}

	@media (max-width: 980px) {
		.sub,
		.links,
		.divider {
			display: none;
		}
	}

	@media (max-width: 767px) {
		header {
			height: var(--header-h-phone);
			padding: 0 var(--space-16);
			background: var(--surface-2);
		}

		.sheet {
			top: calc(var(--header-h-phone) - 1px);
		}

		.menu {
			display: inline-flex;
		}

		.mark {
			width: 32px;
			height: 32px;
			border-radius: var(--radius-md);
			font-size: var(--text-xs);
		}

		.tour {
			display: none;
		}
	}
</style>
