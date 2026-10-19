import * as THREE from 'three';
import { getProject, getType } from '#lib/data/index.ts';
import type { Site } from '../layout.ts';
import { buildBase } from './base.ts';
import { City } from './City.ts';
import { modelColours } from './kit.ts';
import { buildTemplate } from './template.ts';

export { City } from './City.ts';

/* Builders keyed by project ID */
const cityBuilders: Record<string, (city: City) => void> = {};

export function buildCity(site: Site): City {
	const project = site.id === 'core' ? null : (getProject(site.id) ?? null);
	const accent = site.type
		? new THREE.Color(getType(site.type).accent).getHex()
		: modelColours.blue;
	const city = new City(site, project, accent);

	buildBase(city);
	(cityBuilders[site.id] ?? buildTemplate)(city);

	return city;
}
