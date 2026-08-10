import { PluginSettingTab, Setting } from 'obsidian';
import type PrismExpressiveCodePlugin from '../main';
import { THEME_DISPLAY_NAMES } from '../config';
import { FrameType, CollapseStyle } from './types';

export class PrismExpressiveCodeSettingTab extends PluginSettingTab {
  plugin: PrismExpressiveCodePlugin;

  constructor(plugin: PrismExpressiveCodePlugin) {
    super(plugin.app, plugin);

    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();

    const themes = THEME_DISPLAY_NAMES;

    new Setting(this.containerEl).setName('코드 블록 기본 설정').setHeading();

    new Setting(this.containerEl)
      .setName('줄 번호 표시')
      .setDesc('코드 블록에 기본적으로 줄 번호를 표시할지 여부를 설정합니다.')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.ecDefaultShowLineNumbers)
          .onChange(async (value) => {
            this.plugin.settings.ecDefaultShowLineNumbers = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl)
      .setName('자동 줄 바꿈')
      .setDesc(
        '코드 블록의 긴 줄을 기본적으로 자동 줄 바꿈할지 여부를 설정합니다.',
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.ecDefaultWrap)
          .onChange(async (value) => {
            this.plugin.settings.ecDefaultWrap = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl)
      .setName('PDF 내보내기 자동 줄 바꿈')
      .setDesc(
        'PDF 내보내기(프린트 모드) 시 코드 블록의 긴 줄을 Expressive Code 옵션을 통해 자동 줄 바꿈할지 여부를 설정합니다.',
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.pdfExportWrap)
          .onChange(async (value) => {
            this.plugin.settings.pdfExportWrap = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl)
      .setName('프레임 스타일')
      .setDesc('코드 블록의 기본 프레임 형식을 설정합니다.')
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          [FrameType.Auto]: '자동 (Auto)',
          [FrameType.Code]: '코드 (Code)',
          [FrameType.Terminal]: '터미널 (Terminal)',
          [FrameType.None]: '사용 안 함 (None)',
        });
        dropdown
          .setValue(this.plugin.settings.ecDefaultFrame)
          .onChange(async (value) => {
            this.plugin.settings.ecDefaultFrame = value as FrameType;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl)
      .setName('접기 스타일')
      .setDesc('접을 수 있는 코드 영역의 동작 및 스타일을 설정합니다.')
      .addDropdown((dropdown) => {
        dropdown.addOptions({
          [CollapseStyle.CollapsibleAuto]: '자동 접기 (Collapsible Auto)',
          [CollapseStyle.CollapsibleStart]:
            '시작 위치 접기 (Collapsible Start)',
          [CollapseStyle.CollapsibleEnd]: '끝 위치 접기 (Collapsible End)',
          [CollapseStyle.Github]: 'GitHub 스타일 (다시 접기 불가)',
        });
        dropdown
          .setValue(this.plugin.settings.ecDefaultCollapseStyle)
          .onChange(async (value) => {
            this.plugin.settings.ecDefaultCollapseStyle =
              value as CollapseStyle;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl).setName('테마 및 외관').setHeading();

    new Setting(this.containerEl)
      .setName('다크 테마')
      .setDesc(
        'Obsidian의 기본 색상 테마가 다크 모드일 때 사용할 구문 강조 테마입니다.',
      )
      .addDropdown((dropdown) => {
        dropdown.addOptions(themes);
        dropdown
          .setValue(this.plugin.settings.darkTheme)
          .onChange(async (value) => {
            this.plugin.settings.darkTheme = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });

    new Setting(this.containerEl)
      .setName('라이트 테마')
      .setDesc(
        'Obsidian의 기본 색상 테마가 라이트 모드일 때 사용할 구문 강조 테마입니다.',
      )
      .addDropdown((dropdown) => {
        dropdown.addOptions(themes);
        dropdown
          .setValue(this.plugin.settings.lightTheme)
          .onChange(async (value) => {
            this.plugin.settings.lightTheme = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadHighlighter();
          });
      });
  }
}
