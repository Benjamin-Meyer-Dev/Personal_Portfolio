import * as THREE from 'three';
import type { Project } from '#lib/data/types.ts';
import type { FitPoint } from '../CameraRig.ts';
import { layoutProjects, type Layout } from '../layout.ts';
import type { MapScene } from '../MapScene.ts';
import { buildLake, landLevels, type LakeParts } from './lake.ts';
import { hexColour } from '#lib/styles/tokens.ts';

export interface World {
	layout: Layout;
	lake: LakeParts;
	fitPoints: FitPoint[];
}

export function buildWorld(map: MapScene, projects: Project[]): World {
	const layout = layoutProjects(projects, { coreElev: landLevels.coreElev });
	const lake = map.add(buildLake(map.scene, layout));

	map.scene.add(new THREE.AmbientLight(hexColour('--light-ambient'), 1.2));

	const sun = new THREE.DirectionalLight(hexColour('--light-sun'), 2.4);
	sun.position.set(-11, 19, 8);

	map.scene.add(sun);

	const fitPoints: FitPoint[] = [];

	for (const island of layout.islands) {
		for (const x of [island.x0, island.x1]) {
			for (const z of [island.z0, island.z1]) {
				fitPoints.push({ point: new THREE.Vector3(x, island.elev, z) });
			}
		}
	}

	return { layout, lake, fitPoints };
}
