import { cssColour } from '#lib/styles/tokens.ts';

export interface SkillInfo {
	Name: string;
	Short: string;
	Colour?: string;
}

export const skillInfo = {
	python: { Name: 'Python', Short: 'Python', Colour: cssColour('--skill-python') },
	typescript: { Name: 'TypeScript', Short: 'TypeScript', Colour: cssColour('--skill-typescript') },
	nestJS: { Name: 'NestJS', Short: 'NestJS' },
	react: { Name: 'React', Short: 'React' },
	RN: { Name: 'React Native', Short: 'RN' },
	CDK: { Name: 'AWS CDK', Short: 'AWS CDK', Colour: cssColour('--skill-cdk') },
	serverless: { Name: 'Serverless', Short: 'Serverless', Colour: cssColour('--skill-serverless') },
	GHA: { Name: 'GitHub Actions', Short: 'Actions', Colour: cssColour('--skill-actions') },
	docker: { Name: 'Docker', Short: 'Docker', Colour: cssColour('--skill-docker') },
	selfHost: { Name: 'Self-Hosting', Short: 'Self-host', Colour: cssColour('--skill-self-host') },
	cloudflare: { Name: 'Cloudflare Pages', Short: 'Cloudflare' },
	OBS: { Name: 'Observability', Short: 'Observability' },
	sqlServer: { Name: 'SQL Server', Short: 'SQL Server', Colour: cssColour('--skill-sql-server') },
	knex: { Name: 'Knex', Short: 'Knex', Colour: cssColour('--skill-knex') },
	migration: { Name: 'Data migration', Short: 'Migration' },
	sqlite: { Name: 'SQLite', Short: 'SQLite' },
	ML: { Name: 'ML and Modeling', Short: 'ML', Colour: cssColour('--skill-ml') },
	fastApi: { Name: 'FastAPI', Short: 'FastAPI' }
} satisfies Record<string, SkillInfo>;

export type SkillID = keyof typeof skillInfo;

/* The skills that get a transit line on the map, in the order the skill picker shows them */
export const skillBar: SkillID[] = [
	'python',
	'CDK',
	'serverless',
	'typescript',
	'sqlServer',
	'knex',
	'ML',
	'GHA',
	'docker',
	'selfHost'
];

export function skillName(ID: SkillID): string {
	return skillInfo[ID].Name;
}
