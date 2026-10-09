import { cssColour } from '#lib/styles/tokens.ts';

export interface SkillInfo {
	name: string;
	short: string;
	colour?: string;
}

export const skillInfo = {
	python: { name: 'Python', short: 'Python', colour: cssColour('--skill-python') },
	typescript: { name: 'TypeScript', short: 'TypeScript', colour: cssColour('--skill-typescript') },
	nestJs: { name: 'NestJS', short: 'NestJS' },
	react: { name: 'React', short: 'React' },
	rn: { name: 'React Native', short: 'RN' },
	cdk: { name: 'AWS CDK', short: 'AWS CDK', colour: cssColour('--skill-cdk') },
	serverless: { name: 'Serverless', short: 'Serverless', colour: cssColour('--skill-serverless') },
	gha: { name: 'GitHub Actions', short: 'Actions', colour: cssColour('--skill-actions') },
	docker: { name: 'Docker', short: 'Docker', colour: cssColour('--skill-docker') },
	selfHost: { name: 'Self-Hosting', short: 'Self-host', colour: cssColour('--skill-self-host') },
	cloudflare: { name: 'Cloudflare Pages', short: 'Cloudflare' },
	obs: { name: 'Observability', short: 'Observability' },
	sqlServer: { name: 'SQL Server', short: 'SQL Server', colour: cssColour('--skill-sql-server') },
	knex: { name: 'Knex', short: 'Knex', colour: cssColour('--skill-knex') },
	migration: { name: 'Data migration', short: 'Migration' },
	sqlite: { name: 'SQLite', short: 'SQLite' },
	ml: { name: 'ML and Modeling', short: 'ML', colour: cssColour('--skill-ml') },
	fastApi: { name: 'FastAPI', short: 'FastAPI' }
} satisfies Record<string, SkillInfo>;

export type SkillID = keyof typeof skillInfo;

/* The skills that get a transit line on the map, in the order the skill picker shows them */
export const skillBar: SkillID[] = [
	'python',
	'cdk',
	'serverless',
	'typescript',
	'sqlServer',
	'knex',
	'ml',
	'gha',
	'docker',
	'selfHost'
];

export function skillName(id: SkillID): string {
	return skillInfo[id].name;
}
