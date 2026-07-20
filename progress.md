Original prompt: Implement the approved 《人生尚未加载 · 2026》v3.0 人生叙事重构 plan in the existing four-file static GitHub Pages game. Preserve the mobile black UI, offline/localStorage/seed flow, add schema migration, gender, life DNA, desires, family archetypes, conflicts, weighted event selection, event chains, cross-run freshness, richer cards/endings, 320+ base events, 48 chains, 536+ total nodes, tests, and publish through a reviewed branch. Run only five automated life simulations, not 200.

## Progress

- 2026-07-21: Confirmed remote `main` remains at `1cf91ce` (`v2.0.1`).
- 2026-07-21: Cloned repository, created local `legacy/v2.0.1`, and switched to `codex/v3-narrative-rebuild`.
- 2026-07-21: GitHub connector branch creation returned 403; implementation continues locally and publishing will be retried after validation.
- 2026-07-21: Rebuilt `data.json` as schema 3.0 with 320 base events, 48 five-node chains, 30 families, 44 secrets, 124 cards, 64 ending titles, and 96 ending fragments.
- 2026-07-21: Replaced the runtime with versioned save migration/recovery, gender and life DNA, dynamic desires, core conflicts, weighted indexed event matching, delayed chain consequences, cross-run freshness, seeded lifespan, and evidence-based endings.
- 2026-07-21: Preserved the existing black mobile UI, removed Emoji from the four top resources, added status/ending/recovery/debug views, input locking, and debounced persistence.
- 2026-07-21: Static data validation passed. Five fixed-seed lives all reached endings without a dead loop, invalid number, age reversal, locked choice set, or ordinary-event duplication. Observed lifespan was 66–95 and cross-life event overlap was 1.8%; this is a five-life smoke observation, not a statistical guarantee.
- 2026-07-21: Browser smoke passed at 390×844 and 375×812, including the main playable path, save schema, readable `data.json` failure page, resource labels, horizontal overflow, and ending evidence.

## Remaining delivery step

- Commit the completed local branch, then publish/open/merge the PR and verify the GitHub Pages root if repository write permission is available.
- Manual narrative and balance playtesting is intentionally left to the user, per the latest instruction.
