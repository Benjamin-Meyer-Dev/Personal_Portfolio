import { describe, expect, it } from 'vitest';
import {
	futureProjects,
	projectTypes,
	allProjects,
	skillBar,
	skillInfo,
	getProject,
	lotsFor,
	projectList,
	projectsUsing,
	skillsOf
} from './index';

const everyProject = [...allProjects, ...futureProjects];

describe('project data', () => {
	it('gives every project a unique ID', () => {
		const IDs = everyProject.map((project) => project.ID);
		expect(new Set(IDs).size).toBe(IDs.length);
	});

	it('only uses project types that exist', () => {
		const types = projectTypes.map((type) => type.ID);
		for (const project of everyProject) {
			expect(types, project.ID).toContain(project.Type);
		}
	});

	it('only uses skills that exist', () => {
		for (const project of everyProject) {
			for (const skill of Object.keys(project.Uses))
				expect(Object.keys(skillInfo), project.ID).toContain(skill);
		}
	});

	it('fills in the text every card and panel shows', () => {
		for (const project of allProjects) {
			expect(project.Title, project.ID).not.toBe('');
			expect(project.Summary.length, project.ID).toBeGreaterThan(20);
			expect(project.Scene.length, project.ID).toBeGreaterThan(20);
			expect(Object.keys(project.Uses).length, project.ID).toBeGreaterThan(0);
		}
	});

	it('gives every sky-bar skill a line colour', () => {
		for (const skill of skillBar) {
			expect(skillInfo[skill], skill).toHaveProperty('Colour');
		}
	});
});

describe('helpers', () => {
	it('adds sample projects after the real ones', () => {
		const list = projectList(2);
		expect(list).toHaveLength(allProjects.length + 2);
		expect(list.at(-1)?.Preview).toBe(true);
		expect(projectList()).toHaveLength(allProjects.length);
	});

	it('finds projects by ID', () => {
		expect(getProject('beacon')?.Title).toBe('Beacon');
		expect(getProject('next-work')?.Preview).toBe(true);
		expect(getProject('nope')).toBeUndefined();
	});

	it('lists sky-bar skills first', () => {
		const chaos = getProject('chaos')!;
		const skills = skillsOf(chaos);
		expect(skills[0]).toBe('python');
		expect(skills.at(-1)).not.toBe('python');
	});

	it('finds every project on a line', () => {
		expect(projectsUsing('knex').map((project) => project.ID)).toEqual(['compass']);
		expect(projectsUsing('python').length).toBeGreaterThan(3);
	});

	it('always keeps a free lot', () => {
		expect(lotsFor(0)).toBe(2);
		expect(lotsFor(1)).toBe(2);
		expect(lotsFor(2)).toBe(4);
		expect(lotsFor(3)).toBe(4);
	});
});
