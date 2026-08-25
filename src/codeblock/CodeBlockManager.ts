import type PrismExpressiveCodePlugin from '../main';
import { TFile } from 'obsidian';
import { type CodeBlock } from './CodeBlock';

export class CodeBlockManager {
  plugin: PrismExpressiveCodePlugin;
  activeCodeBlocks: Map<string, Set<CodeBlock>>;

  constructor(plugin: PrismExpressiveCodePlugin) {
    this.plugin = plugin;
    this.activeCodeBlocks = new Map();
  }

  public registerEvents(): void {
    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        if (file instanceof TFile && this.activeCodeBlocks.has(file.path)) {
          for (const codeBlock of this.activeCodeBlocks.get(file.path)!) {
            void codeBlock.rerenderOnNoteChange();
          }
        }
      }),
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile && this.activeCodeBlocks.has(oldPath)) {
          const blocks = this.activeCodeBlocks.get(oldPath)!;
          this.activeCodeBlocks.delete(oldPath);
          this.activeCodeBlocks.set(file.path, blocks);
          for (const block of blocks) {
            block.currentFilePath = file.path;
          }
        }
      }),
    );
  }

  public add(codeBlock: CodeBlock): void {
    const filePath = codeBlock.currentFilePath;
    let set = this.activeCodeBlocks.get(filePath);
    if (!set) {
      set = new Set();
      this.activeCodeBlocks.set(filePath, set);
    }
    set.add(codeBlock);
  }

  public remove(codeBlock: CodeBlock): void {
    const filePath = codeBlock.currentFilePath;
    const set = this.activeCodeBlocks.get(filePath);

    // 1차: Direct Lookup 시도 (O(1))
    if (set && set.has(codeBlock)) {
      set.delete(codeBlock);
      if (set.size === 0) {
        this.activeCodeBlocks.delete(filePath);
      }
      return;
    }

    // 2차 Fallback: 경로 불일치 엣지 케이스 시 전체 검색으로 인스턴스 정화
    for (const [path, blockSet] of this.activeCodeBlocks.entries()) {
      if (blockSet.delete(codeBlock)) {
        if (blockSet.size === 0) {
          this.activeCodeBlocks.delete(path);
        }
        break;
      }
    }
  }

  public async forceRerenderAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const codeBlocks of this.activeCodeBlocks.values()) {
      for (const codeBlock of codeBlocks) {
        promises.push(codeBlock.forceRerender());
      }
    }
    await Promise.all(promises);
  }
}
