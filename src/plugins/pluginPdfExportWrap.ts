import { definePlugin, type ExpressiveCodePlugin } from '@expressive-code/core';

export interface PluginPdfExportWrapOptions {
  pdfExportWrap: boolean;
}

export function pluginPdfExportWrap(
  options: PluginPdfExportWrapOptions,
): ExpressiveCodePlugin {
  return definePlugin({
    name: 'PdfExportWrap',
    hooks: {
      preprocessMetadata: ({ addStyles }) => {
        if (!options.pdfExportWrap) return;
        addStyles(`
          @media print {
            div.expressive-code pre,
            div.expressive-code code {
              white-space: pre-wrap !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }
          }
        `);
      },
    },
  });
}
