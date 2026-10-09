import { futureProjects, projectTypes, allProjects } from './projects';
import { skillBar, skillInfo, type SkillID } from './skills';
import type { Project, ProjectType, TypeID } from './types';

export * from './types';
export * from './skills';
export * from './projects';

/* The project on the map, plus the first `previews` sample projects to show how it grows */
export function projectList(previews = 0): Project[] {
	return [...allProjects, ...futureProjects.slice(0, Math.max(0, previews))];
}

/* Find a project by ID, incluidng the sample projects */
export function getProject(id: string): Project | undefined {
	return (
		allProjects.find((project) => project.id === id) ??
		futureProjects.find((project) => project.id === id)
	);
}

export function getType(id: TypeID): ProjectType {
	const projectType = projectTypes.find((type) => type.id === id);

	if (!projectType) {
		throw new Error(`Unknown project type: ${id}`);
	}

	return projectType;
}

export function usesSkill(project: Project, skill: SkillID): boolean {
	return Boolean(project.uses[skill]);
}

/* The skills a project uses, in a stable order - sky bar fills first */
export function skillsOf(project: Project): SkillID[] {
	const keys = Object.keys(project.uses) as SkillID[];
	const rank = (skill: SkillID) => {
		const index = skillBar.indexOf(skill);
		return index < 0 ? skillBar.length + Object.keys(skillInfo).indexOf(skill) : index;
	};

	return keys.sort((first, second) => rank(first) - rank(second));
}

export function projectsOfType(type: TypeID, list: Project[] = allProjects): Project[] {
	return list.filter((project) => project.type === type);
}

export function projectsUsing(skill: SkillID, list: Project[] = allProjects): Project[] {
	return list.filter((project) => usesSkill(project, skill));
}

/* Free lots always come in pairs and every listed island keeps at least one free */
export function lotsFor(projectCount: number): number {
	return Math.max(1, Math.ceil((projectCount + 1) / 2)) * 2;
}
