import {
  type MarkdownPostProcessorContext,
  type MarkdownSectionInformation,
} from 'obsidian';

export interface FenceInfo {
  meta: string;
  level: number;
  indent: string;
}

function getLineAt(text: string, lineIndex: number): string | undefined {
  let startIdx = 0;
  for (let i = 0; i < lineIndex; i++) {
    const nextNewline = text.indexOf('\n', startIdx);
    if (nextNewline === -1) {
      return undefined;
    }
    startIdx = nextNewline + 1;
  }
  const endIdx = text.indexOf('\n', startIdx);
  if (endIdx === -1) {
    return text.slice(startIdx);
  }
  return text.slice(startIdx, endIdx);
}

/**
 * 코드 블록의 메타 문자열, 들여쓰기 레벨 및 들여쓰기 문자열을 단일 스캔으로 추출합니다.
 */
export function findFenceInfo(
  ctx: MarkdownPostProcessorContext,
  containerEl: HTMLElement,
  source: string = '',
  existingSectionInfo?: MarkdownSectionInformation | null,
): FenceInfo {
  const sectionInfo =
    existingSectionInfo !== undefined
      ? existingSectionInfo
      : ctx.getSectionInfo(containerEl);

  if (!sectionInfo) {
    return { meta: '', level: 0, indent: '' };
  }

  const firstSourceLine =
    source
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) || '';

  for (let i = sectionInfo.lineStart; i <= sectionInfo.lineEnd; i++) {
    const line = getLineAt(sectionInfo.text, i);
    if (line === undefined) break;

    const trimmed = line.trim();
    let markerIdx = trimmed.indexOf('```');
    let markerLength = 3;
    if (markerIdx === -1) {
      markerIdx = trimmed.indexOf('~~~');
    }

    if (markerIdx !== -1) {
      const markerChar = trimmed[markerIdx]!;
      while (trimmed[markerIdx + markerLength] === markerChar) {
        markerLength++;
      }

      const nextLine = getLineAt(sectionInfo.text, i + 1)?.trim() || '';
      const isNextLineFence =
        nextLine.startsWith('```') || nextLine.startsWith('~~~');

      const isMatch =
        firstSourceLine.length > 0
          ? nextLine === firstSourceLine
          : isNextLineFence || nextLine === '';

      if (isMatch) {
        // 메타 문자열 추출
        let meta = '';
        const afterMarker = trimmed.slice(markerIdx + markerLength).trimStart();
        const spaceIdx = afterMarker.indexOf(' ');
        if (spaceIdx !== -1) {
          meta = afterMarker.slice(spaceIdx + 1).trim();
        }

        // 들여쓰기 정보 계산
        const match = /^[ \t]*/.exec(line);
        const indent = match ? match[0] : '';
        let spaces = 0;
        let tabs = 0;
        for (const char of indent) {
          if (char === ' ') spaces++;
          else if (char === '\t') tabs++;
        }
        const level = tabs + Math.floor(spaces / 4);

        return { meta, level, indent };
      }
    }
  }

  return { meta: '', level: 0, indent: '' };
}

export function extractMetaString(
  ctx: MarkdownPostProcessorContext,
  containerEl: HTMLElement,
  _language: string,
  source: string = '',
  existingSectionInfo?: MarkdownSectionInformation | null,
): string {
  return findFenceInfo(ctx, containerEl, source, existingSectionInfo).meta;
}

export type FenceIndentationInfo = Omit<FenceInfo, 'meta'>;

export function extractFenceIndentationInfo(
  ctx: MarkdownPostProcessorContext,
  containerEl: HTMLElement,
  source: string = '',
  existingSectionInfo?: MarkdownSectionInformation | null,
): FenceIndentationInfo {
  const { level, indent } = findFenceInfo(
    ctx,
    containerEl,
    source,
    existingSectionInfo,
  );
  return { level, indent };
}

export function stripFenceIndentation(
  source: string,
  fenceIndent: string,
): string {
  if (!source || !fenceIndent) return source;

  let fenceSpaces = 0;
  for (const char of fenceIndent) {
    if (char === ' ') fenceSpaces += 1;
    else if (char === '\t') fenceSpaces += 4;
  }

  if (fenceSpaces === 0) return source;

  return source
    .split('\n')
    .map((line) => {
      if (line.trim().length === 0) return '';
      if (line.startsWith(fenceIndent)) {
        return line.slice(fenceIndent.length);
      }
      let stripped = 0;
      let idx = 0;
      while (idx < line.length && stripped < fenceSpaces) {
        if (line[idx] === ' ') {
          stripped += 1;
          idx++;
        } else if (line[idx] === '\t') {
          if (stripped + 4 <= fenceSpaces) {
            stripped += 4;
            idx++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return line.slice(idx);
    })
    .join('\n');
}

export function stripCommonIndentation(
  source: string,
  fenceIndent: string = '',
): string {
  return fenceIndent ? stripFenceIndentation(source, fenceIndent) : source;
}

export function estimateCodeBlockHeight(
  source: string,
  metaString?: string,
  fenceIndent: string = '',
): number {
  const cleaned = stripCommonIndentation(source, fenceIndent);
  const lineCount = cleaned.length === 0 ? 1 : cleaned.split('\n').length;
  const hasMetaOrTitle = Boolean(metaString && metaString.trim().length > 0);
  const headerHeight = hasMetaOrTitle ? 36 : 0;
  const paddingAndBorders = 28;
  const lineHeight = 20;
  return Math.round(lineCount * lineHeight + paddingAndBorders + headerHeight);
}
