/* The design tokens live in global.css.  This reads them for the TypeScript side
 * (the 3D map, canvas labels and the project data), so a colour or font is
 * defined once and used everywhere.
 */
import stylesheet from './global.css?raw';

type TokenName = `--${string}`;

/* Every `--name: value;` declared in global.css */
const declared = new Map<string, string>(
	[...stylesheet.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((match) => [
		match[1],
		match[2].replace(/\s+/g, ' ').trim()
	])
);

/* A token's value, following `var(--other)` to the token it points at */
export function cssValue(name: TokenName): string {
	const value = declared.get(name);

	if (value === undefined) {
		throw new Error(`${name} is not defined in global.css`);
	}

	const alias = /^var\((--[\w-]+)\)$/.exec(value);

	return alias ? cssValue(alias[1] as TokenName) : value;
}

/* The same colour, see-through: `alpha` from 0 to 1, as #rrggbbaa */
export function withAlpha(colour: string, alpha: number): string {
	const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);

	return byte === 255
		? colour.slice(0, 7)
		: colour.slice(0, 7) + byte.toString(16).padStart(2, '0');
}

/* A colour token as #rrggbb or #rrggbbaa when it's see-through */
export function cssColour(name: TokenName): string {
	const value = cssValue(name);

	if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
		return value.toLowerCase();
	}

	const mix = /^color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/.exec(value);

	if (mix) {
		return withAlpha(cssColour(mix[1] as TokenName), Number(mix[2]) / 100);
	}

	throw new Error(`${name} is not a colour TypeScript can read: ${value}`);
}

/* A colour token as a number, the way three.js takes colours */
export function hexColour(name: TokenName): number {
	return parseInt(cssColour(name).slice(1, 7), 16);
}
