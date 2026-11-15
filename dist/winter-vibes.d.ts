export declare const version: '0.1.0';

export type WinterPreset = 'hearth' | 'sugarplum' | 'northern';
export type WinterMode = 'overlay' | 'contained';

export interface WinterPalette {
  readonly label: string;
  readonly snow: string;
  readonly wire: string;
  readonly frost: string;
  readonly star: string;
  readonly lights: readonly string[];
}

export declare const presets: Readonly<Record<WinterPreset, WinterPalette>>;

export interface WinterEffects {
  snow: boolean;
  lights: boolean;
  frost: boolean;
  stars: boolean;
}

export interface WinterVibesOptions {
  /** CSS selector or element. Defaults to document.body. */
  container?: Element | string;
  /** Fixed viewport overlay, or an absolute layer clipped to the container. */
  mode?: WinterMode;
  preset?: WinterPreset;
  effects?: Partial<WinterEffects>;
  /** 0–100, default 35. The particle count is capped at 120. */
  density?: number;
  /** 0.25–2, default 0.65. */
  speed?: number;
  /** -1–1, default 0.12. */
  wind?: number;
  /** OS reduced-motion preference yields static decorations. Default true. */
  respectReducedMotion?: boolean;
  /** 1–60, default 30. */
  maxFps?: number;
  /** Default 20. */
  zIndex?: number;
  /** CSP nonce applied to the stylesheet inside the shadow root. */
  nonce?: string;
}

export type WinterVibesUpdate = Omit<WinterVibesOptions, 'container' | 'mode'>;

export interface WinterVibesState {
  preset: WinterPreset;
  effects: WinterEffects;
  density: number;
  speed: number;
  wind: number;
  paused: boolean;
  reducedMotion: boolean;
  running: boolean;
  destroyed: boolean;
  particleCount: number;
  mode: WinterMode;
}

export interface WinterVibesController {
  /** Effects merge with existing effects. Container and mode cannot change. */
  update(patch?: WinterVibesUpdate): WinterVibesController;
  pause(): WinterVibesController;
  resume(): WinterVibesController;
  /** Idempotent. All other mutating methods become no-ops after destruction. */
  destroy(): void;
  /** A detached, JSON-serializable snapshot. */
  getState(): WinterVibesState;
}

/** SSR-safe to import; mounting requires a browser with Shadow DOM and Canvas 2D. */
export declare function createWinterVibes(options?: WinterVibesOptions): WinterVibesController;

/** Automatically registered as <winter-vibes> in supported browser environments.
 * `contained` decorates the parent element; otherwise the layer covers the viewport.
 */
export interface WinterVibesElement extends HTMLElement {
  controller: WinterVibesController | null;
  pause(): this;
  resume(): this;
  destroy(): this;
  getState(): WinterVibesState | null;
}

declare global {
  interface HTMLElementTagNameMap {
    'winter-vibes': WinterVibesElement;
  }
}

export { registerWinterComponents } from "./extras.js";
