export enum FrameType {
  Code = 'code',
  Terminal = 'terminal',
  None = 'none',
  Auto = 'auto',
}

export enum CollapseStyle {
  Github = 'github',
  CollapsibleStart = 'collapsible-start',
  CollapsibleEnd = 'collapsible-end',
  CollapsibleAuto = 'collapsible-auto',
}

export interface Settings {
  darkTheme: string;
  lightTheme: string;
  ecDefaultShowLineNumbers: boolean;
  ecDefaultWrap: boolean;
  pdfExportWrap: boolean;
  ecDefaultFrame: FrameType;
  ecDefaultCollapseStyle: CollapseStyle;
}

export const DEFAULT_SETTINGS: Settings = {
  darkTheme: 'one-dark-pro',
  lightTheme: 'one-light',
  ecDefaultShowLineNumbers: false,
  ecDefaultWrap: false,
  pdfExportWrap: true,
  ecDefaultFrame: FrameType.Auto,
  ecDefaultCollapseStyle: CollapseStyle.CollapsibleAuto,
};
