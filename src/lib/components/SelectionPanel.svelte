<script lang="ts">
	import {
		capitalInfo,
		getProject,
		getType,
		skillBar,
		skillColour,
		skillName,
		skillsOf
	} from '#lib/data/index.ts';
	import { mapState, selectCity, stepCity } from '#lib/state/map.svelte.ts';

	const info = $derived.by(() => {
		const id = mapState.selected;

		if (!id) {
			return null;
		}

		if (id === 'core') {
			return { ...capitalInfo, city: 'The Capital', tint: 'var(--blue)', lines: [] };
		}

		const project = getProject(id);

		if (!project) {
			return null;
		}

		const lines = skillsOf(project)
			.filter((skill) => skillBar.includes(skill))
			.map((skill) => ({
				skill,
				name: skillName(skill),
				color: skillColour(skill),
				how: project.uses[skill]
			}));

		return { ...project, tint: getType(project.type).ink, lines };
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && mapState.selected) {
			selectCity(null);
		}
	}
</script>

<svelte:window onkeydown={onKey} />

{#if info}
	<section class="panel" aria-label="{info.title} details">
		<div class="bar">
			<button type="button" class="back" onclick={() => selectCity(null)}>
				<span aria-hidden="true">←</span> Whole map
			</button>
			<div class="steps">
				<button type="button" aria-label="Previous City" onclick={() => stepCity(-1)}>
					<span aria-hidden="true">‹</span>
				</button>
				<button type="button" aria-label="Next City" onclick={() => stepCity(1)}>
					<span aria-hidden="true">›</span>
				</button>
			</div>
		</div>
		<div class="head">
			<span class="kicker" style:color={info.tint}>{info.kicker} · {info.city}</span>
			<h2>{info.title}</h2>
			<p class="summary">{info.summary}</p>
		</div>
		<p class="scene">
			<span class="label">In the scene · </span>
			{info.scene}
		</p>
		{#if info.lines.length}
			<div class="lines">
				<span class="label">Transit lines that stop here</span>
				<div class="chips">
					{#each info.lines as line (line.skill)}
						<span class="chip" title={line.how}>
							<span class="swatch" style:background={line.color} aria-hidden="true"></span>
							{line.name}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</section>
{/if}

<style>
	.panel {
		position: absolute;
		left: var(--space-28);
		top: calc(var(--header-h) + var(--space-20));
		z-index: var(--layer-panel);
		width: 390px;
		max-height: calc(100% - 196px);
		overflow-y: auto;
		padding: var(--space-20);
		border: 1px solid var(--line);
		border-radius: var(--radius-3xl);
		background: var(--glass-95);
		backdrop-filter: blur(var(--blur-lg));
		box-shadow: var(--shadow-float);
		display: flex;
		flex-direction: column;
		gap: var(--space-14);
	}

	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-8);
	}

	.bar button {
		height: var(--control-height);
		border-radius: var(--radius-pill);
		border: 1px solid var(--line-3);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}

	.bar button:hover {
		border-color: var(--blue);
	}

	.back {
		padding: 0 var(--space-14) 0 var(--space-10);
		font-size: var(--text-sm);
		display: inline-flex;
		align-items: center;
		gap: var(--space-6);
	}

	.steps {
		display: flex;
		gap: var(--space-6);
	}

	.steps button {
		width: var(--control-height);
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.kicker,
	.label {
		font-family: var(--mono);
		font-size: var(--text-2xs);
		letter-spacing: var(--tracking-wide-md);
		text-transform: uppercase;
	}

	.label {
		font-size: var(--text-3xs);
		color: var(--ink-4);
	}

	h2 {
		margin: 0;
		font-size: var(--text-6xl);
		line-height: var(--leading-sm);
		letter-spacing: var(--tracking-tight-md);
		font-weight: var(--weight-semibold);
	}

	.summary {
		margin: 0;
		font-size: var(--text-md);
		line-height: var(--leading-2xl);
		color: var(--ink-3);
	}

	.scene {
		margin: 0;
		padding: var(--space-10) var(--space-12);
		border-radius: var(--radius-xl);
		background: var(--surface-3);
		border: 1px solid var(--panel-border);
		font-size: var(--text-sm);
		line-height: var(--leading-xl);
		color: var(--ink-2);
	}

	.lines {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-6);
	}

	.chip {
		height: var(--chip-height);
		padding: 0 var(--space-10) 0 var(--space-8);
		border-radius: var(--radius-pill);
		border: 1px solid var(--card-border);
		background: var(--surface);
		display: inline-flex;
		align-items: center;
		gap: var(--space-6);
		font-family: var(--mono);
		font-size: var(--text-2xs);
		color: var(--ink-2);
	}

	.swatch {
		width: var(--swatch-size);
		height: 4px;
		border-radius: var(--radius-2xs);
	}
</style>
