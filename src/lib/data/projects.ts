import type { Capital, Project, ProjectType } from './types';
import { cssColour } from '#lib/styles/tokens.ts';

export const projectTypes: ProjectType[] = [
	{
		ID: 'cloud',
		Name: 'Cloud and Reliability',
		Sub: 'AWS · Serverless · Observability',
		Ink: cssColour('--cloud'),
		Fill: cssColour('--cloud-fill'),
		Accent: cssColour('--cloud-accent'),
		Noun: 'Cloud Project'
	},
	{
		ID: 'work',
		Name: "Work · Stubbe's",
		Sub: 'Software Developer · 2025 - Present',
		Ink: cssColour('--work'),
		Fill: cssColour('--work-fill'),
		Accent: cssColour('--work-accent'),
		Noun: 'Project at Work'
	},
	{
		ID: 'data',
		Name: 'Data and ML',
		Sub: 'Python · Modeling · Regime Detection',
		Ink: cssColour('--data'),
		Fill: cssColour('--data-fill'),
		Accent: cssColour('--data-accent'),
		Noun: 'Data or ML Project'
	},
	{
		ID: 'self',
		Name: 'Self-Hosted and Automation',
		Sub: 'Docker · Raspberry Pi · Agents',
		Ink: cssColour('--self'),
		Fill: cssColour('--self-fill'),
		Accent: cssColour('--self-accent'),
		Noun: 'Self-Hosted Project'
	}
];

export const capitalInfo: Capital = {
	Kicker: 'About',
	Title: 'Benjamin Meyer',
	Sub: 'Python · AWS · Data Systems',
	Summary:
		'Python and cloud developer in Kitchener-Waterloo, Ontario. I focus on systems that keep working when something breaks.',
	Scene:
		'The capital sits inside the transit loop, where every line meets. Light up the stack and each skill in the sky beams down to the projects that use it.',
	Actions: [{ ID: 'stack', Label: 'Light Up My Stack' }],
	Facts: ['Python, AWS and SQL Server', 'Focused on cloud architecture and systems design'],
	Tags: ['Python', 'AWS', 'SQL Server', 'TypeScript']
};

/* The project list */
export const allProjects: Project[] = [
	{
		ID: 'chaos',
		Type: 'cloud',
		City: 'Data Center City',
		Kicker: 'Flagship · Interactive',
		Title: 'Chaos Lab',
		Sub: 'Simulation · AWS',
		Summary:
			'A simulated two-region AWS stack you can overload and break, then fix with queues, retires and circuit breakers.',
		Scene:
			'The two rows are two regions. Particels are requests moving through API Gateway, Lambda, SQS and DynamoDB. Red flashes are failures.',
		Actions: [
			{ ID: 'Spike', Label: 'Spike Traffic 8x' },
			{ ID: 'Kill', Label: 'Kill US-East-1' }
		],
		Facts: [
			'Runs entirely in the browser, $0 to host',
			'Queueing model checked against Erlang C in pytest'
		],
		Tags: ['TypeScript', 'Web Workers', 'AWS Architecture'],
		Uses: {
			python: 'pytest suite that checks the simulator',
			typescript: 'Simulation engine and UI',
			react: 'React Three Fiber scene',
			CDK: 'Architecture modeled on real AWS limits',
			serverless: 'Lambda, SQS and DynamoDB under load',
			GHA: 'Nightly data refresh and deploys',
			OBS: 'p99 latency, errors and SLOs'
		},
		Map: { Radius: 2.2, LabelY: 2.3, Focus: { Distance: 9.5, TY: 0.9, EL: 0.56 } }
	},
	{
		ID: 'beacon',
		Type: 'cloud',
		City: 'Lighthouse Harbor',
		Kicker: 'Personal · Cloud',
		Title: 'Beacon',
		Sub: 'AWS CDK · Serverless',
		Summary: 'Serverless website and API monitoring, deployed end to end with AWS CDK.',
		Scene:
			'Checks run from three AWS regions to endpoints around the world. Each pulse is one health check.',
		Actions: [{ ID: 'check', Label: 'Run Checks Now' }],
		Facts: ['Infrastructure as code with AWS CDK', 'CI/CD on GitHub Actions'],
		Tags: ['AWS CDK', 'Serverless', 'Observability'],
		Uses: {
			python: 'Python app base, rebuilt to be cloud native',
			CDK: 'Infrastructure as code for the platform',
			serverless: 'Serverless health checks',
			GHA: 'CI/CD pipeline',
			OBS: 'Uptime and latency monitoring'
		},
		Map: { Radius: 1.9, LabelY: 2.95, Focus: { Distance: 9.5, TY: 2.1, EL: 0.34 } }
	},
	{
		ID: 'compass',
		Type: 'work',
		City: 'Construction City',
		Kicker: "Work · Stubbe's · 2026",
		Title: 'Compass PM V2',
		Sub: 'NestJS · Knex · SQL Server',
		Summary:
			'Moving a live project-management platform off 44 stored procedures and onto Knex, without changing anything the frontend sees.',
		Scene:
			'The tree is a project: phases, tasks and subtasks. Move a branch and watch how many rows each design has to rewrite.',
		Actions: [
			{ ID: 'v1', Label: 'Move a branch: hierarchyid' },
			{ ID: 'v2', Label: 'Move a branch: parent + sort key' }
		],
		Facts: [
			'About 80,000 live tasks across 90 projects',
			'Expand and contract, with parity checks before every cutover'
		],
		Tags: ['NestJS', 'Knex', 'SQL Server', 'Data migration'],
		Uses: {
			typescript: 'NestJS API layers',
			nestJS: 'Services that replace stored procedures',
			sqlServer: 'Schema redesign backed by execution plans',
			knex: 'Transactional queries replacing 44 procedures',
			migration: 'Expand and contract with parity checks'
		},
		Map: { Radius: 2.2, LabelY: 2.95, Focus: { Distance: 10.5, TY: 1.7, EL: 0.34 } }
	},
	{
		ID: 'kairos',
		Type: 'data',
		City: 'Financial District',
		Kicker: 'Personal · Python',
		Title: 'Kairos',
		Sub: 'Python · ML',
		Summary:
			'A paper-trading crypto bot with regime detection, per-coin threshold tuning, confidence-based position sizing and an expectancy gate.',
		Scene:
			'Each bar is a candle. The floor shows the detected regime: trend, chop or downtrend. Floating markers are entries and exits.',
		Actions: [
			{ ID: 'replay', Label: 'Replay the Market' },
			{ ID: 'gate', Label: 'Toggle the expectancy gate' }
		],
		Facts: ['Trading cycles scheduled on GitHub Actions', 'Dashboard hosted on Cloudflare Pages'],
		Tags: ['Python 3.12', 'SQLite', 'GitHub Actions'],
		Uses: {
			python: 'Trading engine and ML strategy features',
			GHA: 'Scheduled trading cycles',
			selfHost: 'Cycles moving to a Raspberry Pi Zero 2 W',
			cloudflare: 'Dashboard on Cloudflare Pages',
			sqlite: 'Trade history and post-mortems',
			ML: 'Regime detection and confidence sizing'
		},
		Map: { Radius: 2.2, LabelY: 3.0, Focus: { Distance: 12, TY: 1.4, EL: 0.36 } }
	},
	{
		ID: 'edge',
		Type: 'data',
		City: 'Stadium Town',
		Kicker: 'Personal · Modeling',
		Title: 'The Edge',
		Sub: 'Modeling · React Native',
		Summary:
			'Probability modeling across MLB, NBA, NFL, NHL and college basketball, in an Android app built with Expo.',
		Scene:
			'Each ridge is a league. The curves are predicted outcome distributions, re-fit as new game data arrives.',
		Actions: [{ ID: 'refit', Label: 'Feed in new game data' }],
		Facts: ['React Native and Expo', 'Standalone APK built with EAS'],
		Tags: ['React Native', 'Expo', 'Modeling'],
		Uses: { RN: 'Expo Android app', ML: 'Multi-sport prediction models' },
		Map: { Radius: 1.8, LabelY: 2.3, Focus: { Distance: 8.5, TY: 1.1, EL: 0.46 } }
	},
	{
		ID: 'finance',
		Type: 'self',
		City: 'The Suburbs',
		Kicker: 'Personal · Self-hosted',
		Title: 'Personal Finance',
		Sub: 'Local ML · Docker',
		Summary:
			'A self-hosted budget tracker that sorts transactions with a fully local model. No aggregators, no external AI, no data leaving the house.',
		Scene:
			'Transactions drop into the chip in the middle, the local model, and get sorted into category bins.',
		Actions: [{ ID: 'import', Label: 'Import a sample CSV' }],
		Facts: ['Runs in Docker, moving to a Raspberry Pi 5', 'Bill reminders by email and SMS'],
		Tags: ['Local ML', 'Docker', 'Raspberry Pi'],
		Uses: {
			docker: 'Containerized self-hosting',
			selfHost: 'Runs 24/7 on a Raspberry Pi 5',
			ML: 'Fully local transaction sorting'
		},
		Map: { Radius: 2.0, LabelY: 2.4, Focus: { Distance: 8.5, TY: 0.9, EL: 0.6 } }
	},
	{
		ID: 'sentinel',
		Type: 'self',
		City: 'The Citadel',
		Kicker: 'Personal · Python',
		Title: 'Sentinel',
		Sub: 'Automation',
		Summary:
			'An automation watchtower that keeps an eye on my machines and services, and fixes routine problems before I notice them.',
		Scene:
			'The ring around the tower is the services Sentinel watches. Inject a fault and watch it spot the problem and fix it.',
		Actions: [{ ID: 'fault', Label: 'Inject a fault' }],
		Facts: [
			'Scheduled checks written in Python',
			'Routine fixes run on their own, the rest alert me'
		],
		Tags: ['Python', 'Automation'],
		Uses: { python: 'Automation scripts' },
		Map: { Radius: 1.5, LabelY: 2.3, Focus: { Distance: 7.5, TY: 1.0, EL: 0.48 } }
	},
	{
		ID: 'arena',
		Type: 'self',
		City: 'The Colosseum',
		Kicker: 'Personal · Python',
		Title: 'Agent Arena',
		Sub: 'FastAPI · agents',
		Summary:
			'AI agents take on the same task in rounds, and a FastAPI referee scores every answer to pick a winner.',
		Scene:
			'Four agents circle the arena. Run a match and they fire answers at the referee in the middle while the scoreboard keeps count.',
		Actions: [{ ID: 'match', Label: 'Run a match' }],
		Facts: ['Referee service built with FastAPI', 'Every round scored and logged per agent'],
		Tags: ['FastAPI', 'Python'],
		Uses: { python: 'FastAPI service', fastApi: 'The referee service' },
		Map: { Radius: 1.6, LabelY: 2.4, Focus: { Distance: 8, TY: 1.0, EL: 0.5 } }
	}
];

const starterScene =
	"A city built from the project's skills. It stays this way until the project gets a custom scene.";

/* Sample entries that preview how the map grows - not shown unless specified */
export const futureProjects: Project[] = [
	{
		ID: 'next-data',
		Type: 'data',
		Preview: true,
		City: 'Under Construction',
		Kicker: 'Preview · next lot',
		Title: 'Next ML project',
		Sub: '[PROJECT NAME]',
		Summary:
			'A preview of how the map grows. Adding one entry to the project list put this city on the next free Data and ML lot and ran the Python and ML lines out to it.',
		Scene: starterScene,
		Actions: [],
		Facts: [],
		Tags: ['Python', 'ML'],
		Uses: { python: '[HOW IT USES PYTHON]', ML: '[WHAT THE MODEL DOES]' }
	},
	{
		ID: 'next-cloud',
		Type: 'cloud',
		Preview: true,
		City: 'Under Construction',
		Kicker: 'Preview · next lot',
		Title: 'Next cloud project',
		Sub: '[PROJECT NAME]',
		Summary:
			'A preview of how the map grows. This one landed on the next free Cloud and reliability lot and joined the AWS CDK and Serverless lines.',
		Scene: starterScene,
		Actions: [],
		Facts: [],
		Tags: ['AWS CDK', 'Serverless'],
		Uses: { CDK: '[WHAT THE STACK DEPLOYS]', serverless: '[WHAT RUNS ON LAMBDA]' }
	},
	{
		ID: 'next-self',
		Type: 'self',
		Preview: true,
		City: 'Under Construction',
		Kicker: 'Preview · next lot',
		Title: 'Next home-lab project',
		Sub: '[PROJECT NAME]',
		Summary:
			'A preview of how the map grows. The self-hosted island was full, so it grew a new row of lots and this project took the first one.',
		Scene: starterScene,
		Actions: [],
		Facts: [],
		Tags: ['Docker', 'Self-hosting'],
		Uses: { docker: '[WHAT RUNS IN DOCKER]', selfHost: '[WHERE IT RUNS]' }
	},
	{
		ID: 'next-work',
		Type: 'work',
		Preview: true,
		City: 'Under construction',
		Kicker: 'Preview · next lot',
		Title: 'Next work project',
		Sub: '[PROJECT NAME]',
		Summary:
			'A preview of how the map grows. A second project at work lands next to Compass and shares its TypeScript and SQL Server lines.',
		Scene: starterScene,
		Actions: [],
		Facts: [],
		Tags: ['TypeScript', 'SQL Server'],
		Uses: { typescript: '[WHAT YOU BUILT]', sqlServer: '[WHAT CHANGED IN THE DATA]' }
	}
];
