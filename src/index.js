export { createWinterVibes, presets, version } from './winter-vibes.js';
export { registerWinterComponents } from './extras.js';
import { registerWinterComponents } from './extras.js';
if (typeof window !== 'undefined') registerWinterComponents();
