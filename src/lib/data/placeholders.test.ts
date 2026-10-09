import { describe, expect, it } from 'vitest';
import { placeholdersIn } from './placeholders';

describe('the placeholder finder', () => {
	it('finds each placeholder and the path to it', () => {
		const found = placeholdersIn({
			roles: [{ title: '[ROLE TITLE]', dates: '2024 to Present ' }],
			contactInfo: {
				email: '[YOUR PERSONAL EMAIL]',
				github: 'https://github.com/example'
			}
		});

		expect(found).toEqual([
			{ where: 'roles[0].title', text: '[ROLE TITLE]' },
			{ where: 'contactInfo.email', text: '[YOUR PERSONAL EMAIL]' }
		]);
	});

	it("ignores square brackets that aren't placeholders", () => {
		expect(placeholdersIn({ notes: ['see note [1]', 'a [lowercase] aside'] })).toEqual([]);
	});
});
