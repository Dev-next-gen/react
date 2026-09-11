/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Ledger, LedgerKind, LedgerTotals} from 'shared/ReactLedgers';

import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  BIT_LEDGER,
  MASK_LEDGER,
  MIN_LEDGER,
  MAX_LEDGER,
  SET_LEDGER,
} from 'shared/ReactLedgers';

function createLedger<E>(kind: LedgerKind): Ledger<E> {
  const type = {
    kind,
  };
  if (__DEV__) {
    if (Object.freeze) {
      Object.freeze(type);
    }
  }
  return type;
}

// A single bit that can only be set; a write carries no entry.
export function createBitLedger(): Ledger<void> {
  return createLedger(BIT_LEDGER);
}

export function createMaskLedger(): Ledger<number> {
  return createLedger(MASK_LEDGER);
}

export function createMinLedger(): Ledger<number> {
  return createLedger(MIN_LEDGER);
}

export function createMaxLedger(): Ledger<number> {
  return createLedger(MAX_LEDGER);
}

export function createSetLedger<K>(): Ledger<K> {
  return createLedger(SET_LEDGER);
}

// Canonicalizes a written entry for the server's join. Only user entries come
// through here; shape is trusted, and the set arm's throws guard equality
// semantics, not shape.
function normalizeLedgerEntry(type: Ledger<empty>, entry: mixed): mixed {
  switch (type.kind) {
    case BIT_LEDGER:
      return true;
    case MASK_LEDGER:
      // Canonicalize to unsigned. Static types are the contract for API
      // input, so the entry is a number by declaration, not by a check.
      return (entry as any) >>> 0;
    case MIN_LEDGER:
    case MAX_LEDGER:
      // Normalize -0 to 0.
      return entry === 0 ? 0 : entry;
    default: {
      if (
        (typeof entry === 'object' || typeof entry === 'function') &&
        entry !== null
      ) {
        throw new Error(
          'Only a primitive can be added to a set ledger. A set ledger ' +
            'nets entries by value, but a Set can only compare this entry ' +
            'by reference, so structurally equal entries would silently ' +
            'count as distinct. Primitives are the only entries whose ' +
            'equality is well defined.',
        );
      }
      if (typeof entry === 'symbol' && Symbol.keyFor(entry) === undefined) {
        throw new Error(
          'Only a global symbol received from Symbol.for(...) can be added ' +
            'to a set ledger. A set ledger nets entries by value, but a ' +
            'symbol that is not registered has no name to net it by, so no ' +
            'other entry could ever equal it and it could not reach the ' +
            'client.',
        );
      }
      // Normalize -0 to 0.
      return entry === 0 ? 0 : entry;
    }
  }
}

export function addToLedger<E>(ledger: Ledger<E>, entry: E): void {
  const normalized = normalizeLedgerEntry(ledger, entry);
  const dispatcher = ReactSharedInternals.A;
  if (dispatcher === null || dispatcher.addToLedger === undefined) {
    // Other renderers don't collect ledger entries.
    return;
  }
  dispatcher.addToLedger(ledger, normalized);
}

export function captureLedgers<T, V: $ReadOnlyArray<Ledger<empty>>>(
  input: T,
  ledgers: V,
): {+data: T, +ledgers: LedgerTotals<V>} {
  const dispatcher = ReactSharedInternals.A;
  if (dispatcher === null || dispatcher.captureLedgers === undefined) {
    throw new Error(
      'captureLedgers() can only be called in a Server Components environment.',
    );
  }
  return dispatcher.captureLedgers(input, ledgers);
}
