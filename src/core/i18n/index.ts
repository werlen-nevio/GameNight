import { de, type Strings } from './de';

/**
 * Minimal i18n. German is the only bundled locale today; the structure is ready
 * for more (add a locale object of the same {@link Strings} shape and switch
 * `active` based on device locale or a user setting).
 */
const locales = { de } as const;
export type LocaleCode = keyof typeof locales;

let active: LocaleCode = 'de';

export function setLocale(code: LocaleCode): void {
  active = code;
}

/** The active string catalogue. Use as `strings().home.play`. */
export function strings(): Strings {
  return locales[active];
}

/** Interpolates `{name}` placeholders: `fmt('Hi {n}', { n: 'Nevio' })`. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

/** Convenience direct export for the common case. */
export const t = de;
