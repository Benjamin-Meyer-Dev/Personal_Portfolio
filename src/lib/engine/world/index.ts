import * as THREE from 'three';
import type { Project } from '#lib/data/types.ts';
import type { FitPoint } from '../CameraRig.ts';
import { landOutline, layoutProjects, type Layout } from '../layout.ts';
import type { MapScene } from '../MapScene.ts';
import { buildCapitalIsland, buildIsland, type IslandParts, type Layers } from './island.ts';
import { buildLake, landLevels, type LakeParts } from './lake.ts';
import { worldRandom } from './seed.ts';
import { hexColour } from '#lib/styles/tokens.ts';

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
	const lake = map.add(buildLake(map.scene, layout));
	const shadows = false;
	const islands = layout.islands.map((island) => buildIsland(map.scene, island, shadows));
	const capital = buildCapitalIsland(map.scene, layout, shadows);

	map.scene.add(new THREE.AmbientLight(hexColour('--light-ambient'), 1.2));

	const sun = new THREE.DirectionalLight(hexColour('--light-sun'), 2.4);
	sun.position.set(-11, 19, 8);

	map.scene.add(sun);

	const fitPoints: FitPoint[] = [];

	for (const island of layout.islands) {
		for (const [x, z] of landOutline(island.land, 16)) {
			fitPoints.push({ point: new THREE.Vector3(x, island.elev, z) });
		}
	}

	return { layout, lake, islands, capital, fitPoints };
}
