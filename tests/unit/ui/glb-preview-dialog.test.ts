import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import {
  GlbPreviewDialog,
  isModelViewerReady,
} from '../../../apps/next-app/components/glb-preview-dialog';

describe('GlbPreviewDialog', () => {
  test('renders an interactive model viewer with download action when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(GlbPreviewDialog, {
        open: true,
        modelUrl: 'https://example.com/model.glb',
        title: 'Preview model',
        closeLabel: 'Close',
        downloadLabel: 'Download GLB',
        loadingLabel: 'Loading model...',
        errorTitle: 'Model preview failed',
        errorDescription: 'Download the GLB instead.',
        onClose: () => undefined,
      })
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-testid="pixal3d-glb-loading-state"');
    expect(html).toContain('Loading model...');
    expect(html).toContain('data-testid="pixal3d-glb-error-state"');
    expect(html).toContain('Model preview failed');
    expect(html).toContain('Download the GLB instead.');
    expect(html).toContain('data-testid="pixal3d-glb-model-viewer"');
    expect(html).toContain('src="https://example.com/model.glb"');
    expect(html).toContain('camera-controls');
    expect(html).toContain('href="https://example.com/model.glb"');
    expect(html).toContain('download=""');
  });

  test('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      React.createElement(GlbPreviewDialog, {
        open: false,
        modelUrl: 'https://example.com/model.glb',
        title: 'Preview model',
        closeLabel: 'Close',
        downloadLabel: 'Download GLB',
        loadingLabel: 'Loading model...',
        errorTitle: 'Model preview failed',
        errorDescription: 'Download the GLB instead.',
        onClose: () => undefined,
      })
    );

    expect(html).toBe('');
  });

  test('treats a loaded or visible model viewer as ready', () => {
    expect(isModelViewerReady({ loaded: true })).toBe(true);
    expect(isModelViewerReady({ modelIsVisible: true })).toBe(true);
    expect(isModelViewerReady({ loaded: false, modelIsVisible: false })).toBe(false);
    expect(isModelViewerReady(null)).toBe(false);
  });

  test('uses native model-viewer events instead of React custom-element load handlers', () => {
    const source = readFileSync(
      join(process.cwd(), 'apps', 'next-app', 'components', 'glb-preview-dialog.tsx'),
      'utf8'
    );

    expect(source).toContain('addEventListener("load"');
    expect(source).toContain('addEventListener("error"');
    expect(source).toContain('addEventListener("progress"');
    expect(source).toContain('addEventListener("model-visibility"');
    expect(source).toContain('React.createElement("model-viewer"');
    expect(source).toContain('src: modelUrl');
    expect(source).toContain('className: "block h-full w-full"');
    expect(source).not.toContain('onLoad={() => setLoadState("ready")}');
    expect(source).not.toContain('onError={() => setLoadState("error")}');
  });
});
