import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { projectList, projectsUsing, skillBar } from '#lib/data/index.ts';
import { layoutProjects } from '../layout.ts';
import { mulberry32 } from '../util.ts';
import { buildNetwork, pointAt } from './graph.ts';

describe('the transit network', () => {
	const projects = projectList();
	const net = buildNetwork(layoutProjects(projects), projects);

	it('has one line per sky-bar skill that a project uses', () => {
		const expected = skillBar.filter((skill) => projectsUsing(skill, projects).length > 0);
		expect(net.lines.map((line) => line.skill)).toEqual(expected);
	});

	it('stops every line at every project that uses its skill', () => {
		for (const line of net.lines) {
			for (const pid of projectsUsing(line.skill, projects).map((project) => project.id)) {
				const station = net.stationOf(pid)!;
				expect(line.stops, `${line.skill} -> ${pid}`).toContain(station);

				const node = net.nodes[station].position;
				const reached = line.segments.some((segment) =>
					segment.stopS.some(
						(distance) => pointAt(segment, distance, new THREE.Vector3()).distanceTo(node) < 1e-6
					)
				);

				expect(reached, `${line.skill} train reaches ${pid}`).toBe(true);
			}
		}
	});

	it('starts every run at the capital', () => {
		for (const line of net.lines) {
			const central = net.nodes[line.central].position;

			for (const segment of line.segments) {
				expect(segment.pts[0].distanceTo(central)).toBeLessThan(1e-6);
			}
		}
	});

	it('builds runs with no gaps', () => {
		for (const line of net.lines) {
			for (const segment of line.segments) {
				for (let index = 1; index < segment.pts.length; index++) {
					expect(segment.pts[index].distanceTo(segment.pts[index - 1])).toBeLessThan(0.5);
				}
			}
		}
	});

	it('reaches every island wherever the islands land', () => {
		for (let seed = 1; seed <= 30; seed++) {
			const moved = buildNetwork(layoutProjects(projects, { rnd: mulberry32(seed) }), projects);

			for (const line of moved.lines) {
				const where = `seed ${seed}, ${line.skill}`;
				expect(line.segments.length, where).toBeGreaterThan(0);

				let gap = 0;

				for (const segment of line.segments) {
					for (let index = 1; index < segment.pts.length; index++) {
						gap = Math.max(gap, segment.pts[index].distanceTo(segment.pts[index - 1]));
					}
				}

				expect(gap, where).toBeLessThan(0.5);
			}
		}
	});

	it('runs a new line out to a new project', () => {
		const more = projectList(1);
		const bigger = buildNetwork(layoutProjects(more), more);
		const ml = bigger.lines.find((line) => line.skill === 'ml')!;

		expect(ml.users).toContain('next-data');
	});
});
