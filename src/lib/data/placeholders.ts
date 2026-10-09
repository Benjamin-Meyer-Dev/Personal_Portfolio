import { contactInfo } from './contact';
import { roles } from './experience';
import { capitalInfo, projectTypes, allProjects } from './projects';

const placeholderPattern = /\[[A-Z][A-Z0-9 ,.'-]+\]/g;

export interface Placeholder {
	where: string;
	text: string;
}

/* Walks any value and reports every placeholder with the path where it was found */
function scan(value: unknown, where: string, out: Placeholder[]): void {
	if (typeof value === 'string') {
		for (const match of value.match(placeholderPattern) ?? []) {
			out.push({ where, text: match });
		}
	} else if (Array.isArray(value)) {
		value.forEach((child, index) => scan(child, `${where}[${index}]`, out));
	} else if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			scan(child, `${where}.${key}`, out);
		}
	}
}

/* Every placeholder in `sources`, each labelled with its path */
export function placeholdersIn(sources: Record<string, unknown>): Placeholder[] {
	const out: Placeholder[] = [];

	for (const [name, value] of Object.entries(sources)) {
		scan(value, name, out);
	}

	return out;
}

/* Every placeholder still left in the site's content */
export function findPlaceholders(): Placeholder[] {
	return placeholdersIn({ projectTypes, capitalInfo, allProjects, roles, contactInfo });
}
