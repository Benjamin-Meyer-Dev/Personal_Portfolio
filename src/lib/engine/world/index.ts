import * as THREE from 'three';
import type { Project } from '#lib/data/types.ts';
import type { FitPoint } from '../CameraRig.ts';
import { buildCity, type City } from '../cities/index.ts';
import { landOutline, layoutProjects, type Layout } from '../layout.ts';
import { applyStudioLook } from '../look.ts';
import type { MapScene } from '../MapScene.ts';
import { buildCapitalIsland, buildIsland, type IslandParts, type Layers } from './island.ts';
import { buildLake, landLevels, type LakeParts } from './lake.ts';
import { buildNetwork, type Network } from '../transit/graph.ts';
import { buildTrack, type Track } from '../transit/track.ts';
import { Trains } from '../transit/trains.ts';
import { buildLot, type LotParts } from './lots.ts';
import { buildNature } from './nature.ts';
import { worldRandom } from './seed.ts';

export interface World {
	layout: Layout;
	lake: LakeParts;
	islands: IslandParts[];
	capital: Layers;
	cities: City[];
	lots: LotParts[];
	network: Network;
	track: Track;
	trains: Trains;
	fitPoints: FitPoint[];
}

export function buildWorld(map: MapScene, projects: Project[]): World {
	const layout = layoutProjects(projects, {
		coreElev: landLevels.coreElev,
		rnd: worldRandom(5)
	});
	const { shadows } = applyStudioLook(map);
	const lake = map.add(buildLake(map.scene, layout));
	const islands = layout.islands.map((island) => buildIsland(map.scene, island));
	const capital = buildCapitalIsland(map.scene, layout);

	buildNature(map.scene, layout, lake, islands, capital, shadows);

	const lots = layout.freeLots.map((lot) => buildLot(map.scene, lot));
	map.add({
		update: (dt, time) => {
			lots.forEach((lot, i) => {
				for (const child of lot.group.children) {
					if (child.userData.flag) {
						child.rotation.y = 0.3 * Math.sin(time * 2 + i);
					}
				}
			});
		}
	});

	const cities = layout.sites.map((site) => {
		const city = buildCity(site);
		map.scene.add(city.group);
		map.add({ update: (dt, time) => city.update(dt, time) });

		return city;
	});

	const fitPoints: FitPoint[] = [];

	for (const island of layout.islands) {
		for (const [x, z] of landOutline(island.land, 16)) {
			fitPoints.push({ point: new THREE.Vector3(x, island.elev, z) });
		}
	}

	const network = buildNetwork(layout, projects);
	const track = buildTrack(map.scene, network, layout, shadows);
	const trains = map.add(new Trains(map.scene, network, shadows));

	for (const city of cities) {
		const radius = city.radius * city.scale;

		for (let step = 0; step < 20; step++) {
			const angle = (step / 20) * Math.PI * 2;

			fitPoints.push({
				point: new THREE.Vector3(
					city.site.x + Math.cos(angle) * radius,
					city.elev,
					city.site.z + Math.sin(angle) * radius
				)
			});
		}
	}

	return { layout, lake, islands, capital, cities, lots, network, track, trains, fitPoints };
}
