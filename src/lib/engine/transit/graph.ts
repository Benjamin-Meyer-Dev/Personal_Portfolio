import * as THREE from 'three';
import {
	skillBar,
	skillInfo,
	skillsOf,
	type Project,
	type SkillId,
	type SkillInfo
} from '#lib/data/index.ts';
import { layoutSizes, type Layout } from '../layout.ts';
import { cssColour } from '#lib/styles/tokens.ts';

/* Height of the guideway above the water */
export const guideHeight = 1.15;

/* How far each track is from the middle */
export const trackOffset = 0.17;

/* Radius of the loop around the capital */
export const ringRadius = 2.9;

/* Order lines visit the islands in so routes are predictable */
export const islandOrder = ['cloud', 'work', 'self', 'data'];

/* Short messages the trains carry by skill */
export const linePackets: Partial<Record<SkillId, string[]>> = {
	python: ['pytest: 48 passed', 'uvicorn up', 'cron 02:00'],
	gha: ['on: schedule', 'deploy #412', 'tests passed'],
	ml: ['model.fit()', 'p = 0.62', 'regime: trend'],
	cdk: ['cdk deploy', 'stack synth'],
	serverless: ['GET /health 200', 'p99 412 ms'],
	typescript: ['tsc --strict', 'nest build'],
	selfHost: ['pi@home', 'docker up'],
	docker: ['docker compose up'],
	sqlServer: ['plan: index seek'],
	knex: ['knex migrate']
};

export type EdgeKind = 'ring' | 'main' | 'wye' | 'spine' | 'spur' | 'loop';

export interface Edge {
	i: number;
	from: string;
	to: string;
	pts: THREE.Vector3[];
	len: number;
	label: string;
	kind: EdgeKind;
	lines: number[];
}

export interface GNode {
	id: string;
	position: THREE.Vector3;
	adj: Edge[];
}

/* One train's run: from the capital out to the furthest stop on one island */
export interface Segment {
	central: string;
	island: string;
	pts: THREE.Vector3[];
	cum: number[];
	len: number;
	stopS: number[];
}

export interface Line {
	skill: SkillId;
	name: string;
	colour: number;
	users: string[];
	packets: string[];
	stops: string[];
	segments: Segment[];
}

export interface Network {
	nodes: Record<string, GNode>;
	edges: Edge[];
	lines: Line[];
	laneGap: number;
	stationOf(projectId: string): string | null;
}

/* Evenly spaced points along a curve */
export function sampleCurve(curve: THREE.Curve<THREE.Vector3>, step: number): THREE.Vector3[] {
	const divisions = Math.max(2, Math.ceil(curve.getLength() / step));
	return curve.getSpacedPoints(divisions);
}

/* The unit vector pointing left of the way */
function leftOf(from: THREE.Vector3, to: THREE.Vector3): { x: number; z: number } {
	const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
	return { x: (to.z - from.z) / length, z: -(to.x - from.x) / length };
}

/* A path moved sideways point by point */
export function offsetPath(pts: THREE.Vector3[], offsets: number[]): THREE.Vector3[] {
	const last = pts.length - 1;

	return pts.map((point, index) => {
		const before = leftOf(pts[Math.max(index - 1, 0)], pts[Math.max(index, 1)]);
		const after = leftOf(pts[Math.min(index, last - 1)], pts[Math.min(index + 1, last)]);
		const length = Math.hypot(before.x + after.x, before.z + after.z) || 1;
		const leftX = (before.x + after.x) / length;
		const leftZ = (before.z + after.z) / length;
		const reach = offsets[index] / Math.max(0.5, leftX * before.x + leftZ * before.z);

		return new THREE.Vector3(point.x + leftX * reach, point.y, point.z + leftZ * reach);
	});
}

/* A teardrop of single track past the end of a line so trains can turn around */
function turningLoop(end: THREE.Vector3, ahead: { x: number; z: number }): THREE.Vector3[] {
	const reach = 1.1;
	const radius = 0.55;
	const left = { x: ahead.z, z: -ahead.x };
	const at = (along: number, side: number) =>
		new THREE.Vector3(
			end.x + ahead.x * along + left.x * side,
			end.y,
			end.z + ahead.z * along + left.z * side
		);
	const toCentre = Math.hypot(reach, trackOffset);
	const tangent = Math.sqrt(toCentre * toCentre - radius * radius);
	const heading = Math.atan2(trackOffset, reach) - Math.asin(radius / toCentre);
	const touchAlong = tangent * Math.cos(heading);
	const touchSide = -trackOffset + tangent * Math.sin(heading);
	const start = Math.atan2(touchSide, touchAlong - reach);
	const pts: THREE.Vector3[] = [];

	for (let step = 0; step < 5; step++) {
		const share = step / 5;
		pts.push(at(touchAlong * share, -trackOffset + (touchSide + trackOffset) * share));
	}

	for (let step = 0; step <= 24; step++) {
		const angle = start - (2 * start * step) / 24;
		pts.push(at(reach + radius * Math.cos(angle), radius * Math.sin(angle)));
	}

	for (let step = 1; step <= 5; step++) {
		const share = step / 5;
		pts.push(at(touchAlong * (1 - share), -touchSide + (touchSide + trackOffset) * share));
	}

	return pts;
}

export function buildNetwork(layout: Layout, projects: Project[]): Network {
	const nodes: Record<string, GNode> = {};
	const edges: Edge[] = [];
	const guidePoint = (x: number, z: number, y = guideHeight) => new THREE.Vector3(x, y, z);
	const node = (id: string, position: THREE.Vector3) => {
		nodes[id] = { id, position, adj: [] };
		return id;
	};
	const edge = (from: string, to: string, pts: THREE.Vector3[], label: string, kind: EdgeKind) => {
		let len = 0;

		for (let index = 1; index < pts.length; index++) {
			len += pts[index].distanceTo(pts[index - 1]);
		}

		const newEdge: Edge = { i: edges.length, from, to, pts, len, label, kind, lines: [] };
		edges.push(newEdge);
		nodes[from].adj.push(newEdge);
		nodes[to].adj.push(newEdge);

		return newEdge;
	};

	const radius = ringRadius;
	const ring = ['rE', 'rS', 'rW', 'rN'];

	ring.forEach((id, quarter) =>
		node(
			id,
			guidePoint(
				Math.cos((quarter * Math.PI) / 2) * radius,
				Math.sin((quarter * Math.PI) / 2) * radius
			)
		)
	);

	ring.forEach((id, quarter) => {
		const pts: THREE.Vector3[] = [];

		for (let step = 0; step <= 24; step++) {
			const th = ((quarter + step / 24) * Math.PI) / 2;
			pts.push(guidePoint(Math.cos(th) * radius, Math.sin(th) * radius));
		}

		edge(
			id,
			ring[(quarter + 1) % 4],
			pts,
			'The loop around the capital, where every line meets',
			'ring'
		);
	});

	for (const sx of [-1, 1]) {
		const side = sx < 0 ? 'W' : 'E';
		const islands = layout.islands.filter((island) => island.sx === sx);
		const nearest = islands.length ? Math.min(...islands.map((island) => sx * island.spineX)) : 14;
		const jx = sx * (nearest - 2.0);

		node('j' + side, guidePoint(jx, 0));
		edge(
			sx < 0 ? 'rW' : 'rE',
			'j' + side,
			sampleCurve(new THREE.LineCurve3(guidePoint(sx * radius, 0), guidePoint(jx, 0)), 0.25),
			`The ${sx < 0 ? 'west' : 'east'} main line`,
			'main'
		);

		for (const island of islands) {
			const key = island.type.id;
			const spineX = island.spineX;
			const sz = island.sz;
			const name = island.type.name.toLowerCase().replace(" · stubbe's", '');

			node('p_' + key, guidePoint(spineX, sz * 2.0));
			edge(
				'j' + side,
				'p_' + key,
				sampleCurve(
					new THREE.QuadraticBezierCurve3(
						guidePoint(jx, 0),
						guidePoint(spineX, 0),
						guidePoint(spineX, sz * 2.0)
					),
					0.2
				),
				`Junction for the ${name} island`,
				'wye'
			);

			let prev = 'p_' + key;
			let prevZ = sz * 2.0;

			for (let row = 0; row < island.rows; row++) {
				const zr =
					sz *
					(island.rowStart + layoutSizes.lot / 2 + row * (layoutSizes.lot + layoutSizes.rowGap));
				const id = node(`s_${key}_${row}`, guidePoint(spineX, zr));

				edge(
					prev,
					id,
					sampleCurve(
						new THREE.LineCurve3(guidePoint(spineX, prevZ), guidePoint(spineX, zr)),
						0.25
					),
					`${island.type.name.split(' · ')[0]} island line`,
					'spine'
				);

				prev = id;
				prevZ = zr;
			}

			const endZ = prevZ + sz * 1.6;

			node('t_' + key, guidePoint(spineX, endZ));
			edge(
				prev,
				't_' + key,
				sampleCurve(
					new THREE.LineCurve3(guidePoint(spineX, prevZ), guidePoint(spineX, endZ)),
					0.25
				),
				'End of the line, room to extend',
				'spur'
			);

			edge(
				't_' + key,
				't_' + key,
				turningLoop(guidePoint(spineX, endZ), { x: 0, z: sz }),
				'Turning loop',
				'loop'
			);
		}
	}

	const lotOf = new Map(
		layout.sites.filter((site) => site.lot).map((site) => [site.id, site.lot!])
	);
	const stationOf = (pid: string) => {
		const lot = lotOf.get(pid);
		return lot ? `s_${lot.island.type.id}_${lot.row}` : null;
	};
	const lines: Line[] = [];
	const onMap = projects.filter((project) => lotOf.has(project.id));

	for (const skill of skillBar) {
		const users = onMap
			.filter((project) => skillsOf(project).includes(skill))
			.map((project) => project.id);

		if (!users.length) {
			continue;
		}

		users.sort((firstId, secondId) => {
			const firstLot = lotOf.get(firstId)!;
			const secondLot = lotOf.get(secondId)!;

			return (
				islandOrder.indexOf(firstLot.island.type.id) -
					islandOrder.indexOf(secondLot.island.type.id) ||
				firstLot.row - secondLot.row ||
				firstLot.col - secondLot.col
			);
		});

		const info: SkillInfo = skillInfo[skill];
		lines.push({
			skill,
			name: info.name,
			colour: new THREE.Color(info.colour ?? cssColour('--grey')).getHex(),
			users,
			packets: linePackets[skill] ?? [info.name],
			stops: [],
			segments: []
		});
	}

	const islandOf = (key: string) => layout.islands.find((island) => island.type.id === key)!;
	const centralFor = (key: string) => (islandOf(key).sz < 0 ? 'rN' : 'rS');
	const runsOf = lines.map((skillLine) => {
		const furthest = new Map<string, { st: string; row: number }>();

		for (const pid of skillLine.users) {
			const st = stationOf(pid);

			if (!st) {
				continue;
			}

			const [, key, row] = st.split('_');

			if (!furthest.has(key) || +row > furthest.get(key)!.row) {
				furthest.set(key, { st, row: +row });
			}
		}

		return islandOrder
			.filter((key) => furthest.has(key))
			.map((key) => ({ key, leaf: furthest.get(key)!.st }));
	});

	const bundles = new Map<string, number[]>();

	runsOf.forEach((runs, li) => {
		for (const { key } of runs) {
			bundles.set(key, [...(bundles.get(key) ?? []), li]);
		}
	});

	const biggest = Math.max(1, ...[...bundles.values()].map((bundle) => bundle.length));
	const laneGap = Math.min(0.07, 0.21 / biggest);
	const net: Network = { nodes, edges, lines, laneGap, stationOf };

	lines.forEach((skillLine, li) => {
		for (const { key } of runsOf[li]) {
			if (!skillLine.stops.includes(centralFor(key))) {
				skillLine.stops.push(centralFor(key));
			}
		}

		for (const pid of skillLine.users) {
			const st = stationOf(pid);

			if (st && !skillLine.stops.includes(st)) {
				skillLine.stops.push(st);
			}
		}

		for (const { key, leaf } of runsOf[li]) {
			const island = islandOf(key);
			const central = centralFor(key);
			const bundle = bundles.get(key)!;
			const slot = bundle.indexOf(li) + 0.5;
			const side = -island.sx * island.sz;
			const half = side * slot * laneGap;
			const middle = side * (slot - bundle.length / 2) * laneGap;
			const centre: THREE.Vector3[] = [];
			const offsets: number[] = [];
			const stopAt = [0];

			for (const step of route(net, central, leaf, li)) {
				const edgePoints = step.fwd ? step.edge.pts : [...step.edge.pts].reverse();

				if (!step.edge.lines.includes(li)) {
					step.edge.lines.push(li);
				}

				const kind = step.edge.kind;

				edgePoints.forEach((point, index) => {
					if (centre.length && index === 0) {
						return;
					}

					const along = index / (edgePoints.length - 1);
					let blend = 0;

					if (kind === 'wye') {
						blend = along * along * (3 - 2 * along);
					} else if (kind === 'spine' || kind === 'spur') {
						blend = 1;
					}

					centre.push(point);
					offsets.push(half + (middle - half) * blend);
				});

				const at = step.fwd ? step.edge.to : step.edge.from;

				if (skillLine.stops.includes(at)) {
					stopAt.push(centre.length - 1);
				}
			}

			const pts = offsetPath(centre, offsets);
			const cum = [0];

			for (let index = 1; index < pts.length; index++) {
				cum.push(cum[index - 1] + pts[index].distanceTo(pts[index - 1]));
			}

			const stopS = stopAt.map((index) => cum[index]);

			if (pts.length > 1) {
				skillLine.segments.push({ central, island: key, pts, cum, len: cum.at(-1)!, stopS });
			}
		}
	});

	return net;
}

/* Shortest path along the guideway */
export function route(net: Network, from: string, to: string, li: number) {
	const dist: Record<string, number> = { [from]: 0 };
	const prev: Record<string, { node: string; edge: Edge }> = {};
	const done = new Set<string>();
	const queue = [from];

	while (queue.length) {
		queue.sort((first, second) => dist[first] - dist[second]);

		const node = queue.shift()!;

		if (done.has(node)) {
			continue;
		}

		done.add(node);

		if (node === to) {
			break;
		}

		for (const edge of net.nodes[node].adj) {
			const neighbour = edge.from === node ? edge.to : edge.from;
			let weight = edge.len;

			if (edge.kind === 'ring') {
				const north = edge.from === 'rW' || edge.from === 'rN';
				weight += (li % 2 === 0) === north ? 0 : 0.01;
			}

			if (dist[neighbour] === undefined || dist[node] + weight < dist[neighbour]) {
				dist[neighbour] = dist[node] + weight;
				prev[neighbour] = { node, edge };
				queue.push(neighbour);
			}
		}
	}

	const path: { edge: Edge; fwd: boolean }[] = [];
	let cur = to;

	while (cur !== from && prev[cur]) {
		const hop = prev[cur];
		path.unshift({ edge: hop.edge, fwd: hop.edge.from === hop.node });
		cur = hop.node;
	}

	return path;
}

/* The point distance along a segment */
export function pointAt(segment: Segment, distance: number, out: THREE.Vector3): THREE.Vector3 {
	distance = Math.max(0, Math.min(segment.len, distance));

	let lo = 0;
	let hi = segment.cum.length - 1;

	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;

		if (segment.cum[mid] <= distance) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const span = segment.cum[hi] - segment.cum[lo] || 1;

	return out.copy(segment.pts[lo]).lerp(segment.pts[hi], (distance - segment.cum[lo]) / span);
}
