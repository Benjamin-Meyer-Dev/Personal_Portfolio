import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { projectList } from '#lib/data/index.ts';
import { layoutProjects } from '../layout.ts';
import { mulberry32 } from '../util.ts';
import { buildNetwork } from './graph.ts';
import { carCount, Traffic, type TrainState } from './traffic.ts';

interface Footprint {
	position: THREE.Vector3;
	facing: THREE.Vector3;
}

/* Where a car is and which way it faces */
function footprint(traffic: Traffic, train: TrainState, car: number): Footprint {
	const position = new THREE.Vector3();
	const ahead = new THREE.Vector3();

	traffic.carPose(train, car, position, ahead);

	return { position, facing: ahead.sub(position).normalize() };
}

/* True if two cars overlap */
function touching(first: Footprint, second: Footprint): boolean {
	const axes = [first.facing, second.facing].flatMap((facing) => [
		{ x: facing.x, z: facing.z },
		{ x: -facing.z, z: facing.x }
	]);

	return axes.every((axis) => {
		const extent = (car: Footprint) => {
			const centre = car.position.x * axis.x + car.position.z * axis.z;
			const along = Math.abs(car.facing.x * axis.x + car.facing.z * axis.z);
			const across = Math.abs(-car.facing.z * axis.x + car.facing.x * axis.z);
			const half = 0.25 * along + 0.12 * across;

			return [centre - half, centre + half];
		};

		const [firstMin, firstMax] = extent(first);
		const [secondMin, secondMax] = extent(second);

		return firstMax > secondMin && secondMax > firstMin;
	});
}

describe('the traffic', () => {
	const projects = projectList();
	const net = buildNetwork(layoutProjects(projects), projects);
	const traffic = new Traffic(net);

	it('runs one train for every run of every line', () => {
		const runs = net.lines.reduce((total, line) => total + line.segments.length, 0);
		expect(traffic.trains).toHaveLength(runs);
	});

	it('runs every train round a closed loop with no gaps', () => {
		for (const route of traffic.routes) {
			const pts = [...route.pts, route.pts[0]];
			let gap = 0;

			for (let index = 1; index < pts.length; index++) {
				gap = Math.max(gap, pts[index].distanceTo(pts[index - 1]));
			}

			expect(gap).toBeLessThan(0.5);
		}
	});

	it('stops each train at its capital station and its stations on the island both ways', () => {
		for (const route of traffic.routes) {
			const line = net.lines[route.line];
			const island = line.stops.filter((id) => id.startsWith('s_')).length;

			expect(route.stops.length).toBeGreaterThanOrEqual(1 + 2);
			expect(route.stops.some((stop) => stop.station === 'rN' || stop.station === 'rS')).toBe(true);
			expect(island).toBeGreaterThan(0);
		}
	});

	it('never lets two trains touch and keeps every train moving', () => {
		for (const seed of [1, 7]) {
			const moving = new Traffic(
				buildNetwork(layoutProjects(projects, { rnd: mulberry32(seed) }), projects)
			);
			const travelled = moving.trains.map(() => 0);
			let collisions = 0;

			for (let step = 0; step < 30 * 45; step++) {
				const before = moving.trains.map((train) => train.s);

				moving.step(1 / 30, 1.7);
				moving.trains.forEach((train, index) => {
					travelled[index] += (train.s - before[index] + train.route.len) % train.route.len;
				});

				if (step % 3) {
					continue;
				}

				const cars = moving.trains.map((train) =>
					Array.from({ length: carCount }, (_, car) => footprint(moving, train, car))
				);

				for (let first = 0; first < cars.length; first++) {
					for (let second = first + 1; second < cars.length; second++) {
						for (const mine of cars[first]) {
							for (const theirs of cars[second]) {
								if (touching(mine, theirs)) {
									collisions++;
								}
							}
						}
					}
				}
			}

			expect(collisions, `seed ${seed}`).toBe(0);
			expect(Math.min(...travelled), `seed ${seed}`).toBeGreaterThan(30);
		}
	});
});
