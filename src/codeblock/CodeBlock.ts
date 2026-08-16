import type PrismExpressiveCodePlugin from '../main';
import {
  type MarkdownPostProcessorContext,
  MarkdownRenderChild,
} from 'obsidian';
import { toDom } from 'hast-util-to-dom';
import {
  findFenceInfo,
  stripCommonIndentation,
  estimateCodeBlockHeight,
  type FenceInfo,
} from './CodeBlockUtils';

export class CodeBlock extends MarkdownRenderChild {
  plugin: PrismExpressiveCodePlugin;
  source: string;
  language: string;
  ctx: MarkdownPostProcessorContext;
  currentFilePath: string;
  isLoaded = false;

  private currentFenceInfo: FenceInfo = { meta: '', level: 0, indent: '' };
  rendered = false;
  private renderedSource = '';
  private renderedMeta = '';

  constructor(
    plugin: PrismExpressiveCodePlugin,
    containerEl: HTMLElement,
    source: string,
    language: string,
    ctx: MarkdownPostProcessorContext,
  ) {
    super(containerEl);

    this.plugin = plugin;
    this.source = source;
    this.language = language;
    this.ctx = ctx;
    this.currentFilePath = ctx.sourcePath;
  }

  private async render(fenceInfo: FenceInfo): Promise<void> {
    if (!this.plugin.highlighter?.ec) {
      return;
    }

    const { meta: metaString, level, indent: fenceIndent } = fenceInfo;
    const cleanedSource = stripCommonIndentation(this.source, fenceIndent);

    // Early return if already rendered with the exact same content & meta
    if (
      this.rendered &&
      this.renderedSource === cleanedSource &&
      this.renderedMeta === metaString
    ) {
      return;
    }

    const win = this.containerEl.ownerDocument?.defaultView || window;
    const isPrintMode = win.matchMedia('print').matches;

    // Maintain min-height and set estimated height CSS variable to prevent CLS / scroll jitter
    const estimatedHeight = estimateCodeBlockHeight(
      cleanedSource,
      metaString,
      fenceIndent,
    );
    this.containerEl.style.minHeight = `${estimatedHeight}px`;
    this.containerEl.style.setProperty(
      '--pec-estimated-height',
      `${estimatedHeight}px`,
    );

    const props: Record<string, unknown> = {};
    if (isPrintMode) {
      props.wrap = this.plugin.settings.pdfExportWrap;
    }

    const result = await this.plugin.highlighter.ec.render({
      code: cleanedSource,
      language: this.language,
      meta: metaString,
      props,
    });

    win.requestAnimationFrame(() => {
      if (!this.isLoaded) return;

      this.containerEl.classList.add('pec-code-block');
      if (level > 0) {
        this.containerEl.style.setProperty(
          '--pec-indent-level',
          level.toString(),
        );
        this.containerEl.setAttribute('data-indent-level', level.toString());
      } else {
        this.containerEl.style.removeProperty('--pec-indent-level');
        this.containerEl.removeAttribute('data-indent-level');
      }

      const domNode = toDom(result.renderedGroupAst);
      const fragment = createFragment();
      fragment.appendChild(domNode);

      this.containerEl.empty();
      this.containerEl.appendChild(fragment);
      this.containerEl.style.removeProperty('min-height');

      this.renderedSource = cleanedSource;
      this.renderedMeta = metaString;
      this.rendered = true;
    });
  }

  public async rerenderOnNoteChange(): Promise<void> {
    const newFenceInfo = findFenceInfo(this.ctx, this.containerEl, this.source);
    if (
      newFenceInfo.meta !== this.currentFenceInfo.meta ||
      newFenceInfo.level !== this.currentFenceInfo.level ||
      newFenceInfo.indent !== this.currentFenceInfo.indent
    ) {
      this.currentFenceInfo = newFenceInfo;
      if (this.rendered) {
        await this.render(newFenceInfo);
      }
    }
  }

  public async forceRerender(): Promise<void> {
    this.currentFenceInfo = findFenceInfo(
      this.ctx,
      this.containerEl,
      this.source,
    );
    await this.render(this.currentFenceInfo);
  }

  public onload(): void {
    super.onload();
    this.isLoaded = true;
    this.plugin.codeBlockManager.add(this);

    this.currentFenceInfo = findFenceInfo(
      this.ctx,
      this.containerEl,
      this.source,
    );

    // Estimate height to prevent Cumulative Layout Shift (CLS)
    const estimatedHeight = estimateCodeBlockHeight(
      this.source,
      this.currentFenceInfo.meta,
      this.currentFenceInfo.indent,
    );
    this.containerEl.style.minHeight = `${estimatedHeight}px`;
    this.containerEl.style.setProperty(
      '--pec-estimated-height',
      `${estimatedHeight}px`,
    );

    // Render immediately on load
    void this.render(this.currentFenceInfo);
  }

  public onunload(): void {
    super.onunload();
    this.isLoaded = false;
    this.plugin.codeBlockManager.remove(this);
    this.containerEl.empty();
    this.rendered = false;
  }
}
