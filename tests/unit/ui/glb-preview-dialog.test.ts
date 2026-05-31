import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { GlbPreviewDialog } from '../../../apps/next-app/components/glb-preview-dialog';

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
});
