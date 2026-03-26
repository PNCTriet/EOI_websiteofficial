/* Allow using the web component <model-viewer> in TSX. */
export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

