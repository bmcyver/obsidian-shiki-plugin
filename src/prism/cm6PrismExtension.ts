import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { getPrism, resolvePrismGrammar } from './prismUtils';
import {
  flattenTokens,
  splitTokensIntoLines,
  type FlatToken,
} from './tokenizer';
import { LANGUAGE_ALIASES } from '../config';
import type * as Prism from 'prismjs';

const MAX_TOKEN_CACHE_SIZE = 200;
const tokenCache = new Map<string, FlatToken[][]>();

function getOrComputeTokens(
  prism: typeof Prism,
  lang: string,
  fullCode: string,
  grammar: Prism.Grammar,
): FlatToken[][] {
  const cacheKey = `${lang}:::${fullCode}`;
  let tokens = tokenCache.get(cacheKey);
  if (tokens) {
    // Refresh LRU position
    tokenCache.delete(cacheKey);
    tokenCache.set(cacheKey, tokens);
    return tokens;
  }

  const prismTokens = prism.tokenize(fullCode, grammar);
  const flatTokens = flattenTokens(prismTokens);
  tokens = splitTokensIntoLines(flatTokens);

  if (tokenCache.size >= MAX_TOKEN_CACHE_SIZE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey !== undefined) {
      tokenCache.delete(firstKey);
    }
  }
  tokenCache.set(cacheKey, tokens);
  return tokens;
}

/**
 * Live Preview / Editing view 상에서 PrismJS 전체 블록 단위 토큰화 기반으로
 * Reading 모드(Expressive Code)와 100% 동일하게 하이라이팅을 제공하는 CodeMirror 6 Extension
 */
function createPrismDecorations(view: EditorView): DecorationSet {
  const prism = getPrism();
  if (!prism || !prism.languages) return Decoration.none;

  const visibleRanges = view.visibleRanges;
  if (visibleRanges.length === 0) return Decoration.none;

  const minVisibleFrom = Math.max(0, visibleRanges[0]!.from - 500);
  const maxVisibleTo = Math.min(
    view.state.doc.length,
    visibleRanges[visibleRanges.length - 1]!.to + 500,
  );

  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  interface BlockLine {
    text: string;
    from: number;
  }

  interface CodeBlockInfo {
    lang: string;
    lines: BlockLine[];
  }

  const codeBlocks: CodeBlockInfo[] = [];
  let inCodeBlock = false;
  let currentLang = '';
  let currentLines: BlockLine[] = [];

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const trimmed = line.text.trim();

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        const afterFence = trimmed.slice(3).trim();
        const langMatch = afterFence.split(/\s+/)[0] || '';
        const lang = langMatch.toLowerCase();
        currentLang = LANGUAGE_ALIASES[lang] ?? lang;
        currentLines = [];
      } else {
        inCodeBlock = false;
        if (currentLang && currentLines.length > 0) {
          codeBlocks.push({
            lang: currentLang,
            lines: currentLines,
          });
        }
        currentLines = [];
      }
    } else if (inCodeBlock) {
      currentLines.push({ text: line.text, from: line.from });
    } else if (line.from > maxVisibleTo) {
      // 바깥 영역이고 코드블록 안이 아닌 경우에만 빠른 종료
      break;
    }
  }

  // 파일 끝까지 닫는 펜스가 없는 코드블록 처리
  if (inCodeBlock && currentLang && currentLines.length > 0) {
    codeBlocks.push({
      lang: currentLang,
      lines: currentLines,
    });
  }

  for (const block of codeBlocks) {
    if (block.lines.length === 0) continue;
    const blockStart = block.lines[0]!.from;
    const lastLine = block.lines[block.lines.length - 1]!;
    const blockEnd = lastLine.from + lastLine.text.length;

    if (blockEnd < minVisibleFrom || blockStart > maxVisibleTo) {
      continue;
    }

    const grammar = resolvePrismGrammar(prism, block.lang);
    if (!grammar) continue;

    // 전체 블록 코드를 추출하여 토큰 캐시(LRU)를 통해 $O(1)$ 즉시 조회
    const fullCode = block.lines.map((l) => l.text).join('\n');
    const lineTokensArray = getOrComputeTokens(
      prism,
      block.lang,
      fullCode,
      grammar,
    );

    for (
      let lineIdx = 0;
      lineIdx < block.lines.length && lineIdx < lineTokensArray.length;
      lineIdx++
    ) {
      const bLine = block.lines[lineIdx]!;
      const lineTokens = lineTokensArray[lineIdx];
      if (!lineTokens) continue;

      const lineTo = bLine.from + bLine.text.length;
      if (lineTo < minVisibleFrom || bLine.from > maxVisibleTo) {
        continue;
      }

      // 라인 요소(div.cm-line)에 language-xxx 클래스를 부여하여 기존 Prism 언어별 CSS 규칙을 100% 자동 상속
      builder.add(
        bLine.from,
        bLine.from,
        Decoration.line({ class: `language-${block.lang}` }),
      );

      let charOffset = 0;
      for (const token of lineTokens) {
        const tokenLen = token.content.length;
        if (tokenLen > 0) {
          const tokenFrom = bLine.from + charOffset;
          const tokenTo = tokenFrom + tokenLen;

          if (
            tokenFrom >= minVisibleFrom &&
            tokenTo <= maxVisibleTo &&
            tokenFrom < tokenTo &&
            tokenTo <= doc.length &&
            token.types.length > 0
          ) {
            const tokenClasses = ['token', ...token.types].join(' ');

            builder.add(
              tokenFrom,
              tokenTo,
              Decoration.mark({
                class: `cm-prism-token ${tokenClasses}`,
              }),
            );
          }
        }
        charOffset += tokenLen;
      }
    }
  }

  return builder.finish();
}

export const prismCm6Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = createPrismDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = createPrismDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
