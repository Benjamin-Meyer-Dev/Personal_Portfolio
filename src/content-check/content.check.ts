import { expect, it } from 'vitest';
import { findPlaceholders } from '#lib/data/placeholders.ts';

it('has no placeholder text left', () => {
	const left = findPlaceholders().map((placeholder) => `${placeholder.where}: ${placeholder.text}`);
	expect(left, `Still to fill in:\n  ${left.join('\n  ')}`).toEqual([]);
});
