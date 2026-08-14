import {
  ExpressiveCodeTheme,
  type ExpressiveCodeEngineConfig,
} from '@expressive-code/core';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginFrames } from '@expressive-code/plugin-frames';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginTextMarkers } from '@expressive-code/plugin-text-markers';
import { customPluginPrism } from './prism/CustomPluginPrism';
import { pluginPdfExportWrap } from './plugins/pluginPdfExportWrap';
import { type ThemeRegistration, type ThemeDefinition } from './themes/types';

// ============================================================================
// 1. 테마 설정 (Themes Configuration)
// ============================================================================
export const THEMES: ThemeDefinition[] = [
  {
    id: 'one-dark-pro',
    displayName: 'One Dark Pro (dark)',
    theme: {
      name: 'one-dark-pro',
      type: 'dark',
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
      },
    },
  },
  {
    id: 'one-light',
    displayName: 'One Light (light)',
    theme: {
      name: 'one-light',
      type: 'light',
      colors: {
        'editor.background': '#fafafa',
        'editor.foreground': '#383a42',
      },
    },
  },
];

export const VALID_THEME_IDS = new Set(THEMES.map((t) => t.id));

export const THEME_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  THEMES.map((t) => [t.id, t.displayName]),
);

// ============================================================================
// 2. 언어 설정 (Language Configuration)
// ============================================================================
export const LANGUAGE_SPECIAL = new Set([
  'plaintext',
  'txt',
  'text',
  'plain',
  'ansi',
]);

export const LANGUAGE_ALIASES: Record<string, string> = {
  zsh: 'bash',
  asm: 'nasm',
};

// ============================================================================
// 3. Expressive Code 엔진 설정 (Engine Configuration)
// ============================================================================
export interface EcSettingsProps {
  ecDefaultShowLineNumbers: boolean;
  ecDefaultWrap: boolean;
  pdfExportWrap: boolean;
  ecDefaultFrame: 'code' | 'terminal' | 'none' | 'auto';
  ecDefaultCollapseStyle:
    'github' | 'collapsible-start' | 'collapsible-end' | 'collapsible-auto';
}

export interface EcConfigInput {
  theme: ThemeRegistration;
  settings: EcSettingsProps;
}

export function createEcEngineConfig(
  input: EcConfigInput,
): ExpressiveCodeEngineConfig {
  return {
    themes: [new ExpressiveCodeTheme(input.theme)],
    plugins: [
      customPluginPrism(),
      pluginPdfExportWrap({ pdfExportWrap: input.settings.pdfExportWrap }),
      pluginCollapsibleSections(),
      pluginTextMarkers(),
      pluginLineNumbers(),
      pluginFrames(),
    ].filter(Boolean),
    styleOverrides: {
      codeFontFamily: 'var(--font-monospace)',
      codeFontSize: 'var(--code-size)',
      uiFontFamily: 'var(--font-monospace)',
      borderWidth: '0px',
      borderColor: 'transparent',
      frames: {
        frameBoxShadowCssValue: 'none',
      },
    },
    minSyntaxHighlightingColorContrast: 0,
    themeCssRoot: 'div.expressive-code',
    defaultProps: {
      showLineNumbers: input.settings.ecDefaultShowLineNumbers,
      wrap: input.settings.ecDefaultWrap,
      frame: input.settings.ecDefaultFrame,
      collapseStyle: input.settings.ecDefaultCollapseStyle,
    },
  };
}
