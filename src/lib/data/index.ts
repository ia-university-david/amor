import type { DataAdapter } from './DataAdapter';
import { LocalDataAdapter } from './LocalDataAdapter';
import { syncEngine } from '../sync';

export * from './DataAdapter';

let adapter: DataAdapter = syncEngine.wrap(new LocalDataAdapter());

export function data(): DataAdapter {
  return adapter;
}

/** Swaps the storage implementation (tests, or a future fully remote adapter). */
export function setDataAdapter(next: DataAdapter): void {
  adapter = next;
}
