import * as THREE from 'three';
import { capitalInfo } from '#lib/data/index.ts';
import type { MapScene, Part } from './MapScene.ts';
import type { World } from './world/index.ts';
import type { LotParts } from './world/lots.ts';

export interface MapEvents {
	onSelect?: (id: string) => void;
	onHover?: (text: string | null) => void;
}

export class MapController implements Part {
	hoverCity: string | null = null;
	hoverLot: LotParts | null = null;
	hoverEdge: number | null = null;

	private raycaster = new THREE.Raycaster();
	private ndc = new THREE.Vector2();
	private pointer: { x: number; y: number } | null = null;
	private dirty = false;
	private cityHits: THREE.Object3D[];
	private lotHits: THREE.Object3D[];

	constructor(
		private map: MapScene,
		private world: World,
		private events: MapEvents = {}
	) {
		this.cityHits = [
			...world.cities.map((city) => city.hit),
			...world.placards.map((placard) => placard.body)
		];

		this.lotHits = world.lots.map((lot) => lot.hit);

		const canvas = map.canvas;
		canvas.addEventListener('pointermove', this.onMove);
		canvas.addEventListener('pointerup', this.onUp);
		canvas.addEventListener('pointerleave', this.onLeave);
	}

	update(dt: number): void {
		if (this.dirty && !this.map.rig.isDragging) {
			this.dirty = false;
			this.pick();
		}

		const ease = Math.min(1, dt * 8);

		for (const city of this.world.cities) {
			city.hover += ((city.id === this.hoverCity ? 1 : 0) - city.hover) * ease;
		}

		const trainFocus = this.world.trains.focus;
		trainFocus.hoverCity = this.hoverCity;
		trainFocus.hoverEdge = this.hoverEdge;
	}

	dispose(): void {
		const canvas = this.map.canvas;
		canvas.removeEventListener('pointermove', this.onMove);
		canvas.removeEventListener('pointerup', this.onUp);
		canvas.removeEventListener('pointerleave', this.onLeave);
	}

	private onMove = (event: PointerEvent) => {
		this.pointer = { x: event.clientX, y: event.clientY };
		this.dirty = true;
	};

	private onLeave = () => {
		this.pointer = null;
		this.setHover(null, null, null);
	};

	private onUp = (event: PointerEvent) => {
		if (this.map.rig.wasDrag) {
			return;
		}

		this.pointer = { x: event.clientX, y: event.clientY };
		this.pick();

		if (this.hoverCity) {
			this.events.onSelect?.(this.hoverCity);
		}
	};

	private pick(): void {
		if (!this.pointer) {
			return;
		}

		const rect = this.map.canvas.getBoundingClientRect();

		if (!rect.width) {
			return;
		}

		this.ndc.set(
			((this.pointer.x - rect.left) / rect.width) * 2 - 1,
			-((this.pointer.y - rect.top) / rect.height) * 2 + 1
		);
		this.raycaster.setFromCamera(this.ndc, this.map.camera);

		const cityHit = this.raycaster
			.intersectObjects(this.cityHits, false)
			.find((hit) => this.cityVis(hit.object.userData.cityId) > 0.3);

		if (cityHit) {
			return this.setHover(cityHit.object.userData.cityId, null, null);
		}

		const lot = this.raycaster.intersectObjects(this.lotHits, false)[0];
		const track = this.raycaster.intersectObjects(this.world.track.hits, false)[0];

		if (lot && (!track || lot.distance < track.distance)) {
			const lotParts = this.world.lots.find((x) => x.hit === lot.object) ?? null;
			return this.setHover(null, lotParts, null);
		}

		if (track) {
			return this.setHover(null, null, track.object.userData.edge);
		}

		this.setHover(null, null, null);
	}

	private cityVis(id: string): number {
		return this.world.cities.find((city) => city.id === id)?.vis ?? 0;
	}

	private setHover(city: string | null, lot: LotParts | null, edge: number | null): void {
		if (city === this.hoverCity && lot === this.hoverLot && edge === this.hoverEdge) {
			return;
		}

		this.hoverCity = city;
		this.hoverLot = lot;
		this.hoverEdge = edge;

		if (!this.map.rig.isDragging) {
			this.map.canvas.style.cursor = city ? 'pointer' : 'grab';
		}

		this.events.onHover?.(this.hoverText());
	}

	private hoverText(): string | null {
		if (this.hoverCity) {
			const city = this.world.cities.find((x) => x.id === this.hoverCity)!;
			const title = city.project?.title ?? capitalInfo.title;
			const sub = city.project?.sub ?? capitalInfo.sub;

			return `${title} · ${sub} · click to fly in`;
		}

		if (this.hoverLot) {
			return `Free lot on the ${this.hoverLot.lot.island.type.name} island · my next project of this type gets built here`;
		}

		if (this.hoverEdge !== null) {
			const { network } = this.world;
			const edge = network.edges[this.hoverEdge];
			const names = edge.lines.map((i) => network.lines[i].name);

			if (!names.length) {
				return `${edge.label} · no lines yet`;
			}

			return `${edge.label} · ${names.join(', ')} ${names.length === 1 ? 'line' : 'lines'}`;
		}

		return null;
	}
}
