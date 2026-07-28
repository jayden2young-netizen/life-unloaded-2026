import { createHash } from 'node:crypto';
import {
  BEAT_AUTHOR_SLOT_GROUPS,
  CARD_AUTHOR_SLOT_HASHES,
  DECISION_AUTHOR_SLOT_GROUPS,
} from './author-slot-manifest.mjs';

const hashPayload = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);

const authorKey = (domain, payload) => `@author/${domain}/${hashPayload(payload)}`;

export const beatAuthorKey = (track, text) => authorKey('beat', [track, text]);

export const decisionAuthorKey = (track, prompt, choices) =>
  authorKey('decision', [
    track,
    prompt,
    (choices || []).map((choice) => (typeof choice === 'string' ? choice : choice.text)),
  ]);

export const cardAuthorKey = (drawAge, displayName) =>
  authorKey('card', [drawAge, displayName]);

export const isAuthorKey = (value) =>
  typeof value === 'string' &&
  ['@author/beat/', '@author/decision/', '@author/card/'].some((prefix) =>
    value.startsWith(prefix)
  );

const sameSlot = (left, right) =>
  left?.id === right?.id &&
  left?.track === right?.track &&
  left?.localIndex === right?.localIndex &&
  left?.globalIndex === right?.globalIndex;

const setManifestSlot = (table, key, slot, location) => {
  if (table.has(key)) throw new Error(`作者定位失败 @ ${location}: manifest 作者键冲突`);
  if ([...table.values()].some((existing) => existing.id === slot.id))
    throw new Error(`作者定位失败 @ ${location}: manifest ID 冲突`);
  table.set(key, Object.freeze(slot));
};

export function createAuthorSlotRegistry() {
  const beats = new Map();
  const decisions = new Map();
  const cards = new Map();

  for (const group of BEAT_AUTHOR_SLOT_GROUPS)
    group.hashes.forEach((hash, localIndex) =>
      setManifestSlot(
        beats,
        `@author/beat/${hash}`,
        {
          id: `beat_${String(group.start + localIndex).padStart(3, '0')}`,
          track: group.track,
          localIndex,
        },
        `BEAT_AUTHOR_SLOT_GROUPS.${group.track}[${localIndex}]`
      )
    );

  for (const group of DECISION_AUTHOR_SLOT_GROUPS)
    group.hashes.forEach((hash, localIndex) =>
      setManifestSlot(
        decisions,
        `@author/decision/${hash}`,
        {
          id: `decision_${String(group.start + localIndex).padStart(3, '0')}`,
          track: group.track,
          localIndex,
        },
        `DECISION_AUTHOR_SLOT_GROUPS.${group.track}[${localIndex}]`
      )
    );

  CARD_AUTHOR_SLOT_HASHES.forEach((hash, globalIndex) =>
    setManifestSlot(
      cards,
      `@author/card/${hash}`,
      { id: `card_${String(globalIndex + 1).padStart(2, '0')}`, globalIndex },
      `CARD_AUTHOR_SLOT_HASHES[${globalIndex}]`
    )
  );

  return Object.freeze({ beats, decisions, cards });
}

export function resolveAuthorSlot(registry, domain, key, location) {
  const slot = registry[domain]?.get(key);
  if (!slot)
    throw new Error(
      `作者定位失败 @ ${location}: 未登记定义；请显式分配固定槽位后再生成`
    );
  return slot;
}

export function registerAuthorSlot(
  registry,
  domain,
  key,
  slot,
  location = key,
  replacesKey = null
) {
  const table = registry[domain];
  if (!(table instanceof Map)) throw new Error(`未知作者定位域：${domain}`);
  const existingKey = table.get(key);
  if (existingKey) {
    if (sameSlot(existingKey, slot)) return existingKey;
    throw new Error(`作者定位失败 @ ${location}: 重复作者键指向不同槽位`);
  }
  if (replacesKey) {
    const previous = table.get(replacesKey);
    if (!previous || !sameSlot(previous, slot))
      throw new Error(`作者定位失败 @ ${location}: 被替换作者键与固定槽位不一致`);
    table.delete(replacesKey);
  }
  if (
    [...table.values()].some(
      (existing) =>
        existing.id === slot.id ||
        (slot.globalIndex !== undefined && existing.globalIndex === slot.globalIndex) ||
        (slot.localIndex !== undefined &&
          existing.track === slot.track &&
          existing.localIndex === slot.localIndex)
    )
  )
    throw new Error(`作者定位失败 @ ${location}: 固定槽位已占用`);
  table.set(key, Object.freeze({ ...slot }));
  return table.get(key);
}
