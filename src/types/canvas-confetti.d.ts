declare module 'canvas-confetti' {
  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    [k: string]: unknown;
  };

  type CreateFn = (canvas: HTMLCanvasElement, opts?: unknown) => (opts?: ConfettiOptions) => void;

  const defaultExport: CreateFn & { create?: CreateFn };
  export default defaultExport;
}
