import type { SkillID } from '#lib/data/skills.ts';

/* The four kinds of work, each one is an island on the map */
export type TypeID = 'cloud' | 'work' | 'data' | 'self';

export interface ProjectType {
	ID: TypeID;
	Name: string;
	Sub: string;
	Ink: string;
	Fill: string;
	Accent: string;
	Noun: string;
}

/* A button in a city's panel that runs its demo */
export interface Action {
	ID: string;
	Label: string;
}

export interface Project {
	ID: string;
	Type: TypeID;
	City: string;
	Kicker: string;
	Title: string;
	Sub: string;
	Summary: string;
	Scene: string;
	Actions: Action[];
	Facts: string[];
	Tags: string[];
	Uses: Partial<Record<SkillID, string>>;
	Map?: {
		Radius?: number;
		LabelY?: number;
		Focus?: { Distance: number; TY: number; EL: number };
	};
	Preview?: boolean;
}

/* The capital in the middle of the map */
export interface Capital {
	Kicker: string;
	Title: string;
	Sub: string;
	Summary: string;
	Scene: string;
	Actions: Action[];
	Facts: string[];
	Tags: string[];
}
