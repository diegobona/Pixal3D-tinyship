import type React from "react";

type ModelViewerElementProps =
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    src?: string;
    "camera-controls"?: boolean;
    "touch-action"?: string;
    "auto-rotate"?: boolean;
    "shadow-intensity"?: string;
    exposure?: string;
    "environment-image"?: string;
  };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerElementProps;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerElementProps;
    }
  }
}

export {};
