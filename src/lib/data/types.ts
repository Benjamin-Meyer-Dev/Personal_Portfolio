import type { SkillID } from '#lib/data/skills.ts';

/* The four kinds of work, each one is an island on the map */
export type TypeID = 'cloud' | 'work' | 'data' | 'self';

export interface ProjectType {
	id: TypeID;
	name: string;
	sub: string;
	ink: string;
	fill: string;
	accent: string;
	noun: string;
}

/* A button in a city's panel that runs its demo */
export interface Action {
	id: string;
	label: string;
}

export interface Project {
	id: string;
	type: TypeID;
	city: string;
	kicker: string;
	title: string;
	sub: string;
	summary: string;
	scene: string;
	actions: Action[];
	facts: string[];
	tags: string[];
	uses: Partial<Record<SkillID, string>>;
	map?: {
		radius?: number;
		labelY?: number;
		focus?: { distance: number; ty: number; el: number };
	};
	preview?: boolean;
}

/* The capital in the middle of the map */
export interface Capital {
	kicker: string;
	title: string;
	sub: string;
	summary: string;
	scene: string;
	actions: Action[];
	facts: string[];
	tags: string[];
}
