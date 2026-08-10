import type * as Prism from 'prismjs';
import { LANGUAGE_ALIASES } from '../config';

/**
 * 전역 window 객체에서 Obsidian에 의해 로드된 Prism 인스턴스를 취득합니다.
 */
export function getPrism(): typeof Prism | undefined {
  return (window as unknown as { Prism?: typeof Prism }).Prism;
}

/**
 * Prism 인스턴스와 언어 이름을 기반으로 적절한 Prism Grammar를 찾습니다.
 */
export function resolvePrismGrammar(
  prism: typeof Prism,
  rawLanguage: string,
): Prism.Grammar | undefined {
  if (!prism.languages) return undefined;
  const lowerLang = rawLanguage.toLowerCase();
  const normalizedLang = LANGUAGE_ALIASES[lowerLang] ?? lowerLang;
  return (
    prism.languages[normalizedLang] ??
    prism.languages.plaintext ??
    prism.languages.text
  );
}

export function filterExpressiveCodeElements(env: unknown): void {
  const environment = env as { elements?: Element[] };
  if (environment.elements) {
    environment.elements = environment.elements.filter(
      (element: Element) => !element.matches('div.expressive-code pre code'),
    );
  }
}

export function registerPrismHook(callback: (env: unknown) => void): void {
  const prism = getPrism();
  if (prism?.hooks) {
    unregisterPrismHook(callback);
    prism.hooks.add('before-all-elements-highlight', callback);
  }
}

export function unregisterPrismHook(callback: (env: unknown) => void): void {
  const prism = getPrism();
  if (prism?.hooks?.all) {
    const hooks = prism.hooks.all['before-all-elements-highlight'];
    if (hooks) {
      prism.hooks.all['before-all-elements-highlight'] = hooks.filter(
        (hook) => hook !== callback,
      );
    }
  }
}
