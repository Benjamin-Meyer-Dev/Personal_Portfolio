import * as THREE from 'three';
import { offsetPath, trackOffset, type Network } from './graph.ts';

export const carCount = 3;
export const carGap = 0.56;
const carLength = 0.5;
const trainLength = carGap * (carCount - 1) + carLength;
const dwell = 1.0;
const clearance = 0.3;

/* A circle junction */
interface Zone {
	x: number;
	z: number;
	radius: number;
}

/* One stretch of a train's loop inside a zone */
interface Visit {
	id: number;
	zone: number;
	from: number;
	to: number;
	pts: THREE.Vector3[];
}

/* The loop one train runs on */
export interface Route {
	line: number;
	island: string;
	pts: THREE.Vector3[];
	cum: number[];
	len: number;
	stops: { s: number; station: string }[];
	visits: Visit[];
}

export interface TrainState {
	route: Route;
	s: number;
	wait: number;
	cars: THREE.Vector3[];
}

/* The track points between two neighbouring nodes */
function between(net: Network, from: string, to: string): THREE.Vector3[] {
	const edge = net.nodes[from].adj.find(
		(candidate) => candidate.kind !== 'loop' && (candidate.to === to || candidate.from === to)
	)!;

	return edge.from === from ? edge.pts : [...edge.pts].reverse();
}

/* Rounds each sharp corner into a curve */
function roundCorners(pts: THREE.Vector3[], marks: (string | null)[], cut: number): void {
	const corners: number[] = [];

	for (let index = 1; index < pts.length - 1; index++) {
		const before = pts[index].clone().sub(pts[index - 1]);
		const after = pts[index + 1].clone().sub(pts[index]);

		if (before.angleTo(after) > Math.PI / 4) {
			corners.push(index);
		}
	}

	for (const corner of corners.reverse()) {
		let first = corner;

		while (first > 0 && pts[first].distanceTo(pts[corner]) < cut) {
			first--;
		}

		let last = corner;

		while (last < pts.length - 1 && pts[last].distanceTo(pts[corner]) < cut) {
			last++;
		}

		const curve = new THREE.QuadraticBezierCurve3(pts[first], pts[corner], pts[last]);
		const middle = curve.getPoints(8).slice(1, -1);

		pts.splice(first + 1, last - first - 1, ...middle);
		marks.splice(first + 1, last - first - 1, ...middle.map(() => null));
	}
}

/* The loop for one run */
function buildRoute(net: Network, line: number, island: string, central: string): Route {
	const side = net.nodes['p_' + island].position.x < 0 ? 'W' : 'E';
	const rows = Object.keys(net.nodes).filter((id) => id.startsWith(`s_${island}_`)).length;
	const stations = Array.from({ length: rows }, (_, row) => `s_${island}_${row}`);
	const out = ['r' + side, 'j' + side, 'p_' + island, ...stations, 't_' + island];
	const ring = ['rE', 'rN', 'rW', 'rS'];
	const first = ring.indexOf('r' + side);
	const lap = [1, 2, 3, 4].map((step) => ring[(first + step) % 4]);
	const nodes = [...[...out].reverse(), ...lap, ...out.slice(1)];
	const centre = [net.nodes[nodes[0]].position];
	const marks: (string | null)[] = [nodes[0]];

	for (let index = 1; index < nodes.length; index++) {
		const pts = between(net, nodes[index - 1], nodes[index]);

		for (let point = 1; point < pts.length; point++) {
			centre.push(pts[point]);
			marks.push(point === pts.length - 1 ? nodes[index] : null);
		}
	}

	const pts = offsetPath(
		centre,
		centre.map(() => -trackOffset)
	);

	roundCorners(pts, marks, 0.45);

	const loop = net.edges.find((edge) => edge.kind === 'loop' && edge.from === 't_' + island)!;

	for (const point of loop.pts.slice(1, -1)) {
		pts.push(point);
		marks.push(null);
	}

	const cum = [0];

	for (let index = 1; index < pts.length; index++) {
		cum.push(cum[index - 1] + pts[index].distanceTo(pts[index - 1]));
	}

	const len = cum.at(-1)! + pts.at(-1)!.distanceTo(pts[0]);
	const stopsHere = new Set([
		central,
		...net.lines[line].stops.filter((id) => id.startsWith(`s_${island}_`))
	]);
	const stops = marks
		.flatMap((mark, index) =>
			mark && stopsHere.has(mark) ? [{ s: (cum[index] + carGap) % len, station: mark }] : []
		)
		.sort((firstStop, secondStop) => firstStop.s - secondStop.s);

	return { line, island, pts, cum, len, stops, visits: [] };
}

/* The point `distance` along a loop */
export function routePoint(route: Route, distance: number, out: THREE.Vector3): THREE.Vector3 {
	const s = ((distance % route.len) + route.len) % route.len;
	let lo = 0;
	let hi = route.cum.length;

	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;

		if (route.cum[mid] <= s) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const end = hi === route.cum.length ? route.len : route.cum[hi];
	const next = hi === route.cum.length ? 0 : hi;

	return out
		.copy(route.pts[lo])
		.lerp(route.pts[next], (s - route.cum[lo]) / (end - route.cum[lo] || 1));
}

/* How far forward from `from` you have to go round a loop to reach `to` */
function ahead(from: number, to: number, len: number): number {
	return (((to - from) % len) + len) % len;
}

export class Traffic {
	readonly routes: Route[] = [];
	readonly trains: TrainState[] = [];
	private zones: Zone[] = [];
	private crossing = new Set<string>();
	private point = new THREE.Vector3();
	private heading = new THREE.Vector3();

	constructor(net: Network) {
		net.lines.forEach((line, li) => {
			for (const segment of line.segments) {
				this.routes.push(buildRoute(net, li, segment.island, segment.central));
			}
		});

		for (const side of ['E', 'W']) {
			if (!net.nodes['j' + side]) {
				continue;
			}

			const ringEnd = net.nodes['r' + side].position;
			this.zones.push({ x: ringEnd.x, z: ringEnd.z, radius: 0.9 });
			const junction = net.nodes['j' + side].position;
			this.zones.push({ x: junction.x, z: junction.z, radius: this.junctionReach(junction) });
		}

		let next = 0;

		for (const route of this.routes) {
			const count = route.pts.length;

			this.zones.forEach((zone, zi) => {
				const inside = (index: number) => {
					const point = route.pts[index % count];
					return Math.hypot(point.x - zone.x, point.z - zone.z) < zone.radius;
				};
				const begin = route.pts.findIndex((_, index) => !inside(index));
				let start = -1;

				for (let step = 1; step <= count; step++) {
					const index = (begin + step) % count;

					if (inside(index) && start < 0) {
						start = index;
					}

					if (!inside(index) && start >= 0) {
						const last = (index - 1 + count) % count;
						const pts = [];

						for (let walk = start; walk !== index; walk = (walk + 1) % count) {
							pts.push(route.pts[walk]);
						}

						route.visits.push({
							id: next++,
							zone: zi,
							from: route.cum[start],
							to: route.cum[last],
							pts
						});

						start = -1;
					}
				}
			});
		}

		const visits = this.routes.flatMap((route) => route.visits.map((visit) => ({ visit, route })));

		for (const { visit: first, route: firstRoute } of visits) {
			for (const { visit: second, route: secondRoute } of visits) {
				if (first.id >= second.id || first.zone !== second.zone) {
					continue;
				}

				if (firstRoute.island === secondRoute.island) {
					continue;
				}

				const close = first.pts.some((point) =>
					second.pts.some((other) => point.distanceTo(other) < clearance)
				);

				if (close) {
					this.crossing.add(`${first.id}:${second.id}`).add(`${second.id}:${first.id}`);
				}
			}
		}

		this.routes.forEach((route, index) => {
			const train: TrainState = { route, s: 0, wait: 0, cars: [] };

			for (let attempt = 0; attempt < 200; attempt++) {
				train.s = route.len * ((index * 0.618 + attempt * 0.037) % 1);
				this.place(train);

				const clear =
					train.cars.every((car) =>
						this.zones.every(
							(zone) => Math.hypot(car.x - zone.x, car.z - zone.z) > zone.radius + 0.3
						)
					) &&
					this.trains.every((other) =>
						other.cars.every((car) => train.cars.every((mine) => mine.distanceTo(car) > 1.0))
					);

				if (clear) {
					break;
				}
			}

			this.trains.push(train);
		});
	}

	/* How far a junction's zone has to reach */
	private junctionReach(junction: THREE.Vector3): number {
		const beyond = this.routes.map((route) =>
			route.pts.filter(
				(point) => point.distanceTo(junction) < 8 && Math.abs(point.x) >= Math.abs(junction.x)
			)
		);

		let reach = 0.6;

		this.routes.forEach((first, firstIndex) => {
			this.routes.forEach((second, secondIndex) => {
				if (first.island === second.island) {
					return;
				}

				for (const point of beyond[firstIndex]) {
					if (beyond[secondIndex].some((other) => point.distanceTo(other) < clearance)) {
						reach = Math.max(reach, point.distanceTo(junction));
					}
				}
			});
		});

		return reach + 0.4;
	}

	/* Works out where each of a train's cars is */
	private place(train: TrainState): void {
		for (let car = 0; car < carCount; car++) {
			train.cars[car] ??= new THREE.Vector3();
			routePoint(train.route, train.s - car * carGap, train.cars[car]);
		}
	}

	/* Puts a car's centre in `position` and a point just ahead of it */
	carPose(train: TrainState, car: number, position: THREE.Vector3, facing: THREE.Vector3): void {
		const s = train.s - car * carGap;
		routePoint(train.route, s, position);
		routePoint(train.route, s + 0.2, facing);
	}

	/* True of any car of `train` is on a stretch a visit covers */
	private occupies(train: TrainState, visit: Visit): boolean {
		const span = ahead(visit.from, visit.to, train.route.len) + carLength;

		for (let car = 0; car < carCount; car++) {
			const s = train.s - car * carGap;

			if (ahead(visit.from - carLength / 2, s, train.route.len) <= span) {
				return true;
			}
		}

		return false;
	}

	/* True if the stretch from `from`, a train's length and a bit long has no other car on it */
	private roomAfter(train: TrainState, from: number): boolean {
		for (let along = 0; along <= trainLength + 0.4; along += 0.2) {
			routePoint(train.route, from + along, this.point);

			for (const other of this.trains) {
				if (other !== train && other.cars.some((car) => car.distanceTo(this.point) < 0.25)) {
					return false;
				}
			}
		}

		return true;
	}

	/* Can the lead car move on to `next` along its loop */
	private clear(train: TrainState, next: number): boolean {
		const route = train.route;

		routePoint(route, next, this.point);
		routePoint(route, next + 0.2, this.heading)
			.sub(this.point)
			.normalize();

		for (const other of this.trains) {
			if (other === train) {
				continue;
			}

			for (const car of other.cars) {
				const dx = car.x - this.point.x;
				const dz = car.z - this.point.z;
				const forward = dx * this.heading.x + dz * this.heading.z;
				const sideways = Math.abs(dx * this.heading.z - dz * this.heading.x);

				if (forward > -0.1 && forward < carGap + 0.06 && sideways < 0.24) {
					return false;
				}
			}
		}

		for (const visit of route.visits) {
			const reaching = ahead(train.s, visit.from - carLength / 2, route.len) <= next - train.s;

			if (!reaching || this.occupies(train, visit)) {
				continue;
			}

			for (const other of this.trains) {
				if (other === train) {
					continue;
				}

				for (const theirs of other.route.visits) {
					if (this.crossing.has(`${visit.id}:${theirs.id}`) && this.occupies(other, theirs)) {
						return false;
					}
				}
			}

			if (!this.roomAfter(train, visit.to + carLength / 2)) {
				return false;
			}
		}

		return true;
	}

	/* Moves every train on by `dt` seconds at `speed` */
	step(dt: number, speed: number): TrainState[] {
		const arrived: TrainState[] = [];

		for (const train of this.trains) {
			if (train.wait > 0) {
				train.wait -= dt;
				continue;
			}

			const route = train.route;
			let move = speed * dt;
			const stop = route.stops.find((candidate) => {
				const gap = ahead(train.s, candidate.s, route.len);
				return gap > 1e-6 && gap <= move;
			});

			if (stop) {
				move = ahead(train.s, stop.s, route.len);
			}

			if (!this.clear(train, train.s + move)) {
				continue;
			}

			train.s = (train.s + move) % route.len;
			this.place(train);

			if (stop) {
				train.wait = dwell;
				arrived.push(train);
			}
		}

		return arrived;
	}
}
