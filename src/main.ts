import { debounce, loadPrism, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type Settings } from './settings/types';
import { PrismExpressiveCodeSettingTab } from './settings/SettingsTab';
import { CodeBlockHighlighter } from './codeblock/CodeBlockHighlighter';
import { CodeBlockManager } from './codeblock/CodeBlockManager';
import { registerCodeBlockProcessors } from './codeblock/CodeBlockProcessor';
import { VALID_THEME_IDS } from './config';
import {
  registerPrismHook,
  unregisterPrismHook,
  filterExpressiveCodeElements,
} from './prism/prismUtils';
import { prismCm6Extension } from './prism/cm6PrismExtension';

import 'src/styles.css';

export default class PrismExpressiveCodePlugin extends Plugin {
  highlighter!: CodeBlockHighlighter;
  codeBlockManager!: CodeBlockManager;
  declare settings: Settings;
  loadedSettings!: Settings;
  lastDarkMode = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.loadedSettings = structuredClone(this.settings);
    this.addSettingTab(new PrismExpressiveCodeSettingTab(this));

    this.highlighter = new CodeBlockHighlighter(this);
    this.codeBlockManager = new CodeBlockManager(this);
    this.codeBlockManager.registerEvents();
    this.registerEditorExtension(prismCm6Extension);

    this.lastDarkMode = this.app.isDarkMode();

    this.app.workspace.onLayoutReady(async () => {
      try {
        await loadPrism();
        await this.highlighter.load();

        registerCodeBlockProcessors(this);

        await this.registerPrismPlugin();

        // Force rerender any code blocks that were loaded before the highlighter was ready
        void this.codeBlockManager.forceRerenderAll();
      } catch (e) {
        console.warn(
          'Failed to initialize Expressive Code Highlighter in the background.',
          e,
        );
      }
    });

    const debouncedReload = debounce(
      () => {
        void this.reloadHighlighter();
      },
      500,
      true,
    );

    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        const currentDarkMode = this.app.isDarkMode();
        if (currentDarkMode !== this.lastDarkMode) {
          this.lastDarkMode = currentDarkMode;
          debouncedReload();
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on('window-open', (winInfo) => {
        const win = (winInfo as unknown as { win: Window }).win || winInfo;
        if (win && win.document) {
          void this.highlighter.injectStyles(win.document);
          this.registerDomEvent(win, 'unload', () => {
            this.highlighter.removeStyles(win.document);
          });
        }
      }),
    );

    this.addCommand({
      id: 'reload-highlighter',
      name: 'Reload highlighter',
      callback: () => {
        void this.reloadHighlighter();
      },
    });
  }

  async reloadHighlighter(): Promise<void> {
    this.lastDarkMode = this.app.isDarkMode();
    await this.highlighter.unload();

    this.loadedSettings = structuredClone(this.settings);

    await this.highlighter.load();

    await this.codeBlockManager.forceRerenderAll();
  }

  async registerPrismPlugin(): Promise<void> {
    registerPrismHook(filterExpressiveCodeElements);
  }

  unregisterPrismPlugin(): void {
    unregisterPrismHook(filterExpressiveCodeElements);
  }

  onunload(): void {
    this.unregisterPrismPlugin();
    void this.highlighter.unload();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData(),
    ) as Settings;

    if (this.validateSettings()) {
      await this.saveSettings();
    }
  }

  private validateSettings(): boolean {
    let needsSave = false;
    if (!VALID_THEME_IDS.has(this.settings.darkTheme)) {
      this.settings.darkTheme = 'one-dark-pro';
      needsSave = true;
    }
    if (!VALID_THEME_IDS.has(this.settings.lightTheme)) {
      this.settings.lightTheme = 'one-light';
      needsSave = true;
    }
    return needsSave;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
