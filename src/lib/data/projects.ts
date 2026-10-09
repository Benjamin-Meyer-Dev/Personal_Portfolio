import type { Capital, Project, ProjectType } from './types';
import { cssColour } from '#lib/styles/tokens.ts';

export const projectTypes: ProjectType[] = [
	{
		id: 'cloud',
		name: 'Cloud and Reliability',
		sub: 'AWS · Serverless · Observability',
		ink: cssColour('--cloud'),
		fill: cssColour('--cloud-fill'),
		accent: cssColour('--cloud-accent'),
		noun: 'Cloud Project'
	},
	{
		id: 'work',
		name: "Work · Stubbe's",
		sub: 'Software Developer · 2025 - Present',
		ink: cssColour('--work'),
		fill: cssColour('--work-fill'),
		accent: cssColour('--work-accent'),
		noun: 'Project at Work'
	},
	{
		id: 'data',
		name: 'Data and ML',
		sub: 'Python · Modeling · Regime Detection',
		ink: cssColour('--data'),
		fill: cssColour('--data-fill'),
		accent: cssColour('--data-accent'),
		noun: 'Data or ML Project'
	},
	{
		id: 'self',
		name: 'Self-Hosted and Automation',
		sub: 'Docker · Raspberry Pi · Agents',
		ink: cssColour('--self'),
		fill: cssColour('--self-fill'),
		accent: cssColour('--self-accent'),
		noun: 'Self-Hosted Project'
	}
];

export const capitalInfo: Capital = {
	kicker: 'About',
	title: 'Benjamin Meyer',
	sub: 'Python · AWS · Data Systems',
	summary:
		'Python and cloud developer in Kitchener-Waterloo, Ontario. I focus on systems that keep working when something breaks.',
	scene:
		'The capital sits inside the transit loop, where every line meets. Light up the stack and each skill in the sky beams down to the projects that use it.',
	actions: [{ id: 'stack', label: 'Light Up My Stack' }],
	facts: ['Python, AWS and SQL Server', 'Focused on cloud architecture and systems design'],
	tags: ['Python', 'AWS', 'SQL Server', 'TypeScript']
};

/* The project list */
export const allProjects: Project[] = [
	{
		id: 'chaos',
		type: 'cloud',
		city: 'Data Center City',
		kicker: 'Flagship · Interactive',
		title: 'Chaos Lab',
		sub: 'Simulation · AWS',
		summary:
			'A simulated two-region AWS stack you can overload and break, then fix with queues, retires and circuit breakers.',
		scene:
			'The two rows are two regions. Particels are requests moving through API Gateway, Lambda, SQS and DynamoDB. Red flashes are failures.',
		actions: [
			{ id: 'spike', label: 'Spike Traffic 8x' },
			{ id: 'kill', label: 'Kill US-East-1' }
		],
		facts: [
			'Runs entirely in the browser, $0 to host',
			'Queueing model checked against Erlang C in pytest'
		],
		tags: ['TypeScript', 'Web Workers', 'AWS Architecture'],
		uses: {
			python: 'pytest suite that checks the simulator',
			typescript: 'Simulation engine and UI',
			react: 'React Three Fiber scene',
			cdk: 'Architecture modeled on real AWS limits',
			serverless: 'Lambda, SQS and DynamoDB under load',
			gha: 'Nightly data refresh and deploys',
			obs: 'p99 latency, errors and SLOs'
		},
		map: { radius: 2.2, labelY: 2.3, focus: { distance: 9.5, ty: 0.9, el: 0.56 } }
	},
	{
		id: 'beacon',
		type: 'cloud',
		city: 'Lighthouse Harbor',
		kicker: 'Personal · Cloud',
		title: 'Beacon',
		sub: 'AWS CDK · Serverless',
		summary: 'Serverless website and API monitoring, deployed end to end with AWS CDK.',
		scene:
			'Checks run from three AWS regions to endpoints around the world. Each pulse is one health check.',
		actions: [{ id: 'check', label: 'Run Checks Now' }],
		facts: ['Infrastructure as code with AWS CDK', 'CI/CD on GitHub Actions'],
		tags: ['AWS CDK', 'Serverless', 'Observability'],
		uses: {
			python: 'Python app base, rebuilt to be cloud native',
			cdk: 'Infrastructure as code for the platform',
			serverless: 'Serverless health checks',
			gha: 'CI/CD pipeline',
			obs: 'Uptime and latency monitoring'
		},
		map: { radius: 1.9, labelY: 2.95, focus: { distance: 9.5, ty: 2.1, el: 0.34 } }
	},
	{
		id: 'compass',
		type: 'work',
		city: 'Construction City',
		kicker: "Work · Stubbe's · 2026",
		title: 'Compass PM V2',
		sub: 'NestJS · Knex · SQL Server',
		summary:
			'Moving a live project-management platform off 44 stored procedures and onto Knex, without changing anything the frontend sees.',
		scene:
			'The tree is a project: phases, tasks and subtasks. Move a branch and watch how many rows each design has to rewrite.',
		actions: [
			{ id: 'v1', label: 'Move a branch: hierarchyid' },
			{ id: 'v2', label: 'Move a branch: parent + sort key' }
		],
		facts: [
			'About 80,000 live tasks across 90 projects',
			'Expand and contract, with parity checks before every cutover'
		],
		tags: ['NestJS', 'Knex', 'SQL Server', 'Data migration'],
		uses: {
			typescript: 'NestJS API layers',
			nestJs: 'Services that replace stored procedures',
			sqlServer: 'Schema redesign backed by execution plans',
			knex: 'Transactional queries replacing 44 procedures',
			migration: 'Expand and contract with parity checks'
		},
		map: { radius: 2.2, labelY: 2.95, focus: { distance: 10.5, ty: 1.7, el: 0.34 } }
	},
	{
		id: 'kairos',
		type: 'data',
		city: 'Financial District',
		kicker: 'Personal · Python',
		title: 'Kairos',
		sub: 'Python · ML',
		summary:
			'A paper-trading crypto bot with regime detection, per-coin threshold tuning, confidence-based position sizing and an expectancy gate.',
		scene:
			'Each bar is a candle. The floor shows the detected regime: trend, chop or downtrend. Floating markers are entries and exits.',
		actions: [
			{ id: 'replay', label: 'Replay the Market' },
			{ id: 'gate', label: 'Toggle the expectancy gate' }
		],
		facts: ['Trading cycles scheduled on GitHub Actions', 'Dashboard hosted on Cloudflare Pages'],
		tags: ['Python 3.12', 'SQLite', 'GitHub Actions'],
		uses: {
			python: 'Trading engine and ML strategy features',
			gha: 'Scheduled trading cycles',
			selfHost: 'Cycles moving to a Raspberry Pi Zero 2 W',
			cloudflare: 'Dashboard on Cloudflare Pages',
			sqlite: 'Trade history and post-mortems',
			ml: 'Regime detection and confidence sizing'
		},
		map: { radius: 2.2, labelY: 3.0, focus: { distance: 12, ty: 1.4, el: 0.36 } }
	},
	{
		id: 'edge',
		type: 'data',
		city: 'Stadium Town',
		kicker: 'Personal · Modeling',
		title: 'The Edge',
		sub: 'Modeling · React Native',
		summary:
			'Probability modeling across MLB, NBA, NFL, NHL and college basketball, in an Android app built with Expo.',
		scene:
			'Each ridge is a league. The curves are predicted outcome distributions, re-fit as new game data arrives.',
		actions: [{ id: 'refit', label: 'Feed in new game data' }],
		facts: ['React Native and Expo', 'Standalone APK built with EAS'],
		tags: ['React Native', 'Expo', 'Modeling'],
		uses: { rn: 'Expo Android app', ml: 'Multi-sport prediction models' },
		map: { radius: 1.8, labelY: 2.3, focus: { distance: 8.5, ty: 1.1, el: 0.46 } }
	},
	{
		id: 'finance',
		type: 'self',
		city: 'The Suburbs',
		kicker: 'Personal · Self-hosted',
		title: 'Personal Finance',
		sub: 'Local ML · Docker',
		summary:
			'A self-hosted budget tracker that sorts transactions with a fully local model. No aggregators, no external AI, no data leaving the house.',
		scene:
			'Transactions drop into the chip in the middle, the local model, and get sorted into category bins.',
		actions: [{ id: 'import', label: 'Import a sample CSV' }],
		facts: ['Runs in Docker, moving to a Raspberry Pi 5', 'Bill reminders by email and SMS'],
		tags: ['Local ML', 'Docker', 'Raspberry Pi'],
		uses: {
			docker: 'Containerized self-hosting',
			selfHost: 'Runs 24/7 on a Raspberry Pi 5',
			ml: 'Fully local transaction sorting'
		},
		map: { radius: 2.0, labelY: 2.4, focus: { distance: 8.5, ty: 0.9, el: 0.6 } }
	},
	{
		id: 'sentinel',
		type: 'self',
		city: 'The Citadel',
		kicker: 'Personal · Python',
		title: 'Sentinel',
		sub: 'Automation',
		summary:
			'An automation watchtower that keeps an eye on my machines and services, and fixes routine problems before I notice them.',
		scene:
			'The ring around the tower is the services Sentinel watches. Inject a fault and watch it spot the problem and fix it.',
		actions: [{ id: 'fault', label: 'Inject a fault' }],
		facts: [
			'Scheduled checks written in Python',
			'Routine fixes run on their own, the rest alert me'
		],
		tags: ['Python', 'Automation'],
		uses: { python: 'Automation scripts' },
		map: { radius: 1.5, labelY: 2.3, focus: { distance: 7.5, ty: 1.0, el: 0.48 } }
	},
	{
		id: 'arena',
		type: 'self',
		city: 'The Colosseum',
		kicker: 'Personal · Python',
		title: 'Agent Arena',
		sub: 'FastAPI · agents',
		summary:
			'AI agents take on the same task in rounds, and a FastAPI referee scores every answer to pick a winner.',
		scene:
			'Four agents circle the arena. Run a match and they fire answers at the referee in the middle while the scoreboard keeps count.',
		actions: [{ id: 'match', label: 'Run a match' }],
		facts: ['Referee service built with FastAPI', 'Every round scored and logged per agent'],
		tags: ['FastAPI', 'Python'],
		uses: { python: 'FastAPI service', fastApi: 'The referee service' },
		map: { radius: 1.6, labelY: 2.4, focus: { distance: 8, ty: 1.0, el: 0.5 } }
	}
];

const starterScene =
	"A city built from the project's skills. It stays this way until the project gets a custom scene.";

/* Sample entries that preview how the map grows - not shown unless specified */
export const futureProjects: Project[] = [
	{
		id: 'next-data',
		type: 'data',
		preview: true,
		city: 'Under Construction',
		kicker: 'Preview · next lot',
		title: 'Next ML project',
		sub: '[PROJECT NAME]',
		summary:
			'A preview of how the map grows. Adding one entry to the project list put this city on the next free Data and ML lot and ran the Python and ML lines out to it.',
		scene: starterScene,
		actions: [],
		facts: [],
		tags: ['Python', 'ML'],
		uses: { python: '[HOW IT USES PYTHON]', ml: '[WHAT THE MODEL DOES]' }
	},
	{
		id: 'next-cloud',
		type: 'cloud',
		preview: true,
		city: 'Under Construction',
		kicker: 'Preview · next lot',
		title: 'Next cloud project',
		sub: '[PROJECT NAME]',
		summary:
			'A preview of how the map grows. This one landed on the next free Cloud and reliability lot and joined the AWS CDK and Serverless lines.',
		scene: starterScene,
		actions: [],
		facts: [],
		tags: ['AWS CDK', 'Serverless'],
		uses: { cdk: '[WHAT THE STACK DEPLOYS]', serverless: '[WHAT RUNS ON LAMBDA]' }
	},
	{
		id: 'next-self',
		type: 'self',
		preview: true,
		city: 'Under Construction',
		kicker: 'Preview · next lot',
		title: 'Next home-lab project',
		sub: '[PROJECT NAME]',
		summary:
			'A preview of how the map grows. The self-hosted island was full, so it grew a new row of lots and this project took the first one.',
		scene: starterScene,
		actions: [],
		facts: [],
		tags: ['Docker', 'Self-hosting'],
		uses: { docker: '[WHAT RUNS IN DOCKER]', selfHost: '[WHERE IT RUNS]' }
	},
	{
		id: 'next-work',
		type: 'work',
		preview: true,
		city: 'Under construction',
		kicker: 'Preview · next lot',
		title: 'Next work project',
		sub: '[PROJECT NAME]',
		summary:
			'A preview of how the map grows. A second project at work lands next to Compass and shares its TypeScript and SQL Server lines.',
		scene: starterScene,
		actions: [],
		facts: [],
		tags: ['TypeScript', 'SQL Server'],
		uses: { typescript: '[WHAT YOU BUILT]', sqlServer: '[WHAT CHANGED IN THE DATA]' }
	}
];
