import * as THREE from 'three';
import type { Project } from '#lib/data/types.ts';
import { cityRadius, type Site } from '../layout.ts';

/* One city on the map */
export class City {
	readonly id: string;
	readonly group = new THREE.Group();
	readonly content = new THREE.Group();
	readonly radius: number;
	readonly scale: number;
	readonly elev: number;

	hit!: THREE.Mesh;
	vis = 1;
	hover = 0;
	update: (dt: number, time: number) => void = () => {};
	action: (id: string) => string = () => '';

	private mats: THREE.Material[] = [];

	constructor(
		readonly site: Site,
		readonly project: Project | null,
		readonly accent: number
	) {
		this.id = site.id;
		this.radius = cityRadius(site);
		this.scale = site.scale;
		this.elev = site.elev;
		this.group.position.set(site.x, site.elev, site.z);
		this.group.scale.setScalar(site.scale);
		this.group.add(this.content);
	}

	/* Register a material so `setVis` can fade it */
	track<M extends THREE.Material>(material: M): M {
		material.transparent = true;
		material.userData.base = material.opacity;
		this.mats.push(material);

		return material;
	}

	setVis(visibility: number): void {
		this.vis = visibility;

		for (const material of this.mats) {
			material.opacity = material.userData.base * visibility;
		}
	}
}
