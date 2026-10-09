export interface Role {
	version: string;
	current?: boolean;
	dates: string;
	title: string;
	where: string;
	notes: string[];
	stack: string[];
}

export const roles: Role[] = [
	{
		version: 'v3',
		current: true,
		dates: '2025 - Present',
		title: 'Software Developer',
		where: "Stubbe's · Harley · Ontario",
		notes: ['Test Note number 1'],
		stack: ['NestJS', 'Knex', 'SQL Server', 'TypeScript']
	}
];
