import * as THREE from 'three';
import type { Project } from '#lib/data/types.ts';
import type { FitPoint } from '../CameraRig.ts';
import { landOutline, layoutProjects, type Layout } from '../layout.ts';
import { applyStudioLook } from '../look.ts';
import type { MapScene } from '../MapScene.ts';
import { buildCapitalIsland, buildIsland, type IslandParts, type Layers } from './island.ts';
import { buildLake, landLevels, type LakeParts } from './lake.ts';
import { worldRandom } from './seed.ts';
import { buildNature } from './nature.ts';

export interface World {
	layout: Layout;
	lake: LakeParts;
	islands: IslandParts[];
	capital: Layers;
	fitPoints: FitPoint[];
}

export function buildWorld(map: MapScene, projects: Project[]): World {
	const layout = layoutProjects(projects, {
		coreElev: landLevels.coreElev,
		rnd: worldRandom(5)
	});
	const { shadows } = applyStudioLook(map);
	const lake = map.add(buildLake(map.scene, layout));
	const islands = layout.islands.map((island) => buildIsland(map.scene, island, shadows));
	const capital = buildCapitalIsland(map.scene, layout, shadows);

	buildNature(map.scene, layout, lake, islands, capital, shadows);

	const fitPoints: FitPoint[] = [];

	for (const island of layout.islands) {
		for (const [x, z] of landOutline(island.land, 16)) {
			fitPoints.push({ point: new THREE.Vector3(x, island.elev, z) });
		}
	}

	return { layout, lake, islands, capital, fitPoints };
}
