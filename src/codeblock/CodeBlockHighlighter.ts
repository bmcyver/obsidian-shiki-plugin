import { ExpressiveCodeEngine } from '@expressive-code/core';

import type PrismExpressiveCodePlugin from '../main';
import { getPrism } from '../prism/prismUtils';
import { getThemeForEC } from '../themes/ThemeMapper';
import { getDynamicThemeCss } from '../themes/PrismThemeCss';
import type { ThemeRegistration } from '../themes/types';
import {
  createEcEngineConfig,
  LANGUAGE_ALIASES,
  LANGUAGE_SPECIAL,
} from '../config';

function createHeadElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
): HTMLElementTagNameMap[K] {
  const win = (
    doc as Document & {
      win?: Window & {
        createEl?: <T extends keyof HTMLElementTagNameMap>(
          tag: T,
        ) => HTMLElementTagNameMap[T];
      };
    }
  ).win;

  return win?.createEl ? win.createEl(tag) : doc.createElement(tag);
}

export class CodeBlockHighlighter {
  plugin: PrismExpressiveCodePlugin;

  ec!: ExpressiveCodeEngine;
  activeTheme: ThemeRegistration | null = null;
  ecStyleElements = new Map<Document, HTMLStyleElement>();
  ecScriptElements = new Map<Document, HTMLScriptElement>();
  supportedLanguages!: string[];
  safeLanguagesSet!: Set<string>;

  constructor(plugin: PrismExpressiveCodePlugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    const prism = getPrism();
    if (!prism) {
      return;
    }

    const loadedPrismLangs = Object.keys(prism.languages).filter(
      (key) => typeof prism.languages[key] === 'object',
    );
    this.supportedLanguages = Array.from(
      new Set([
        ...loadedPrismLangs,
        ...Object.keys(LANGUAGE_ALIASES),
        ...LANGUAGE_SPECIAL,
      ]),
    );
    this.safeLanguagesSet = new Set(this.supportedLanguages);

    this.activeTheme = getThemeForEC(
      this.plugin.app,
      this.plugin.loadedSettings,
    );

    this.ec = new ExpressiveCodeEngine(
      createEcEngineConfig({
        theme: this.activeTheme,
        settings: this.plugin.loadedSettings,
      }),
    );

    this.clearAllStyles();
    this.cachedThemeStyles = '';
    this.cachedJsModules = '';

    const docs = this.getAllDocuments();
    for (const doc of docs) {
      await this.injectStyles(doc);
    }
  }

  private getAllDocuments(): Set<Document> {
    const docs = new Set<Document>();
    if (typeof activeDocument !== 'undefined') {
      docs.add(activeDocument);
    }
    if (this.plugin.app.workspace.containerEl?.ownerDocument) {
      docs.add(this.plugin.app.workspace.containerEl.ownerDocument);
    }
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view?.containerEl?.ownerDocument) {
        docs.add(leaf.view.containerEl.ownerDocument);
      }
    });
    return docs;
  }

  private cachedThemeStyles = '';
  private cachedJsModules = '';

  public async injectStyles(doc: Document): Promise<void> {
    if (!this.ec) return;
    try {
      if (!this.cachedThemeStyles) {
        const [ecBaseStyles, ecThemeStyles, jsModules] = await Promise.all([
          this.ec.getBaseStyles(),
          this.ec.getThemeStyles(),
          this.ec.getJsModules(),
        ]);
        const themeName =
          this.activeTheme?.name ??
          (this.plugin.app.isDarkMode() ? 'dark' : 'light');
        const prismDynamicStyles = getDynamicThemeCss(themeName);
        this.cachedThemeStyles = `${ecBaseStyles}\n${ecThemeStyles}\n${prismDynamicStyles}`;
        this.cachedJsModules = jsModules.join('\n');
      }

      const themeStyles = this.cachedThemeStyles;
      let styleEl = doc.getElementById(
        'pec-theme-styles',
      ) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = createHeadElement(doc, 'style');
        styleEl.id = 'pec-theme-styles';
        doc.head.appendChild(styleEl);
      }
      if (styleEl.textContent !== themeStyles) {
        styleEl.textContent = themeStyles;
      }
      this.ecStyleElements.set(doc, styleEl);

      if (this.cachedJsModules) {
        let scriptEl = doc.getElementById(
          'pec-js-modules',
        ) as HTMLScriptElement | null;
        if (!scriptEl) {
          scriptEl = createHeadElement(doc, 'script');
          scriptEl.id = 'pec-js-modules';
          scriptEl.textContent = this.cachedJsModules;
          doc.head.appendChild(scriptEl);
        } else if (scriptEl.textContent !== this.cachedJsModules) {
          scriptEl.textContent = this.cachedJsModules;
        }
        this.ecScriptElements.set(doc, scriptEl);
      }
    } catch (e) {
      console.warn('Failed to inject Expressive Code styles into document', e);
    }
  }

  public removeStyles(doc: Document): void {
    const styleEl = this.ecStyleElements.get(doc);
    if (styleEl) {
      styleEl.remove();
      this.ecStyleElements.delete(doc);
    }
    const scriptEl = this.ecScriptElements.get(doc);
    if (scriptEl) {
      scriptEl.remove();
      this.ecScriptElements.delete(doc);
    }
  }

  private clearAllStyles(): void {
    for (const styleEl of this.ecStyleElements.values()) {
      styleEl.remove();
    }
    this.ecStyleElements.clear();

    for (const scriptEl of this.ecScriptElements.values()) {
      scriptEl.remove();
    }
    this.ecScriptElements.clear();
  }

  async unload(): Promise<void> {
    this.clearAllStyles();
  }

  /**
   * All languages that are safe to use with Obsidian's `registerMarkdownCodeBlockProcessor`.
   */
  obsidianSafeLanguageNames(): string[] {
    return Array.from(this.safeLanguagesSet ?? []);
  }
}
