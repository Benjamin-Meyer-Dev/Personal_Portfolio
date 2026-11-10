import { allProjects } from '#lib/data/index.js';
import type { MapController } from '#lib/engine/MapController.ts';

export const mapState = $state({
	ready: false,
	selected: null as string | null,
	hint: null as string | null
});

let controller: MapController | null = null;

/* MapCanvas calls this once the engine exists */
export function connectMap(mapController: MapController | null): void {
	controller = mapController;
}

export function selectCity(id: string | null): void {
	mapState.selected = id;
	controller?.select(id);
}

/* Step to the previous or next project, wrapping */
export function stepCity(dir: 1 | -1): void {
	const ids = allProjects.map((project) => project.id);
	const cur = mapState.selected ? ids.indexOf(mapState.selected) : -1;
	const next = cur < 0 ? (dir > 0 ? 0 : ids.length - 1) : (cur + dir + ids.length) % ids.length;

	selectCity(ids[next]);
}
