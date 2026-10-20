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

export type EdgeKind = 'ring' | 'main' | 'wye' | 'spine' | 'spur';

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
	lane: number;
	stops: string[];
	central: string;
	segments: Segment[];
}

export interface Network {
	nodes: Record<string, GNode>;
	edges: Edge[];
	lines: Line[];
	stationOf(projectId: string): string | null;
}

/* Evenly spaced points along a curve */
export function sampleCurve(curve: THREE.Curve<THREE.Vector3>, step: number): THREE.Vector3[] {
	const divisions = Math.max(2, Math.ceil(curve.getLength() / step));
	return curve.getSpacedPoints(divisions);
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
			lane: 0,
			stops: [],
			central: '',
			segments: []
		});
	}

	const net: Network = { nodes, edges, lines, stationOf };
	const lineCount = lines.length;

	lines.forEach((skillLine, li) => {
		skillLine.lane = (li - (lineCount - 1) / 2) * Math.min(0.11, 0.56 / Math.max(1, lineCount));
		skillLine.central = li % 2 ? 'rS' : 'rN';
		skillLine.stops = [skillLine.central];

		for (const pid of skillLine.users) {
			const st = stationOf(pid);

			if (st && !skillLine.stops.includes(st)) {
				skillLine.stops.push(st);
			}
		}

		const furthest = new Map<string, { st: string; row: number }>();

		for (const st of skillLine.stops) {
			if (!st.startsWith('s_')) {
				continue;
			}

			const [, key, row] = st.split('_');

			if (!furthest.has(key) || +row > furthest.get(key)!.row) {
				furthest.set(key, { st, row: +row });
			}

			const leaves = islandOrder
				.filter((islandKey) => furthest.has(islandKey))
				.map((islandKey) => furthest.get(islandKey)!.st);

			for (const leaf of leaves) {
				const path = route(net, skillLine.central, leaf, li);
				const pts: THREE.Vector3[] = [];
				const cum = [0];
				const stopS = [0];

				for (const step of path) {
					const edgePoints = step.fwd ? step.edge.pts : [...step.edge.pts].reverse();

					if (!step.edge.lines.includes(li)) {
						step.edge.lines.push(li);
					}

					edgePoints.forEach((point, j) => {
						if (pts.length && j === 0) {
							return;
						}

						pts.push(point.clone());

						if (pts.length > 1) {
							cum.push(cum.at(-1)! + point.distanceTo(pts[pts.length - 2]));
						}
					});

					const at = step.fwd ? step.edge.to : step.edge.from;

					if (skillLine.stops.includes(at)) {
						stopS.push(cum.at(-1)!);
					}
				}

				if (pts.length > 1) {
					skillLine.segments.push({ pts, cum, len: cum.at(-1)!, stopS });
				}
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
