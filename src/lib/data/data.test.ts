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
		const ids = everyProject.map((project) => project.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('only uses project types that exist', () => {
		const types = projectTypes.map((type) => type.id);
		for (const project of everyProject) {
			expect(types, project.id).toContain(project.type);
		}
	});

	it('only uses skills that exist', () => {
		for (const project of everyProject) {
			for (const skill of Object.keys(project.uses))
				expect(Object.keys(skillInfo), project.id).toContain(skill);
		}
	});

	it('fills in the text every card and panel shows', () => {
		for (const project of allProjects) {
			expect(project.title, project.id).not.toBe('');
			expect(project.summary.length, project.id).toBeGreaterThan(20);
			expect(project.scene.length, project.id).toBeGreaterThan(20);
			expect(Object.keys(project.uses).length, project.id).toBeGreaterThan(0);
		}
	});

	it('gives every sky-bar skill a line colour', () => {
		for (const skill of skillBar) {
			expect(skillInfo[skill], skill).toHaveProperty('colour');
		}
	});
});

describe('helpers', () => {
	it('adds sample projects after the real ones', () => {
		const list = projectList(2);
		expect(list).toHaveLength(allProjects.length + 2);
		expect(list.at(-1)?.preview).toBe(true);
		expect(projectList()).toHaveLength(allProjects.length);
	});

	it('finds projects by ID', () => {
		expect(getProject('beacon')?.title).toBe('Beacon');
		expect(getProject('next-work')?.preview).toBe(true);
		expect(getProject('nope')).toBeUndefined();
	});

	it('lists sky-bar skills first', () => {
		const chaos = getProject('chaos')!;
		const skills = skillsOf(chaos);
		expect(skills[0]).toBe('python');
		expect(skills.at(-1)).not.toBe('python');
	});

	it('finds every project on a line', () => {
		expect(projectsUsing('knex').map((project) => project.id)).toEqual(['compass']);
		expect(projectsUsing('python').length).toBeGreaterThan(3);
	});

	it('always keeps a free lot', () => {
		expect(lotsFor(0)).toBe(2);
		expect(lotsFor(1)).toBe(2);
		expect(lotsFor(2)).toBe(4);
		expect(lotsFor(3)).toBe(4);
	});
});
