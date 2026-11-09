import type { DataAdapter } from './DataAdapter';
import { LocalDataAdapter } from './LocalDataAdapter';

export * from './DataAdapter';

let adapter: DataAdapter = new LocalDataAdapter();

export function data(): DataAdapter {
  return adapter;
}

/** Allows swapping in a remote implementation once the backend exists. */
export function setDataAdapter(next: DataAdapter): void {
  adapter = next;
}
