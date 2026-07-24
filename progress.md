Original prompt: Implement the approved 《人生尚未加载 · 2026》v0.3.0 人生叙事重构 plan in the existing four-file static GitHub Pages game. Preserve the mobile black UI, offline/localStorage/seed flow, add schema migration, gender, life DNA, desires, family archetypes, conflicts, weighted event selection, event chains, cross-run freshness, richer cards/endings, 320+ base events, 48 chains, 536+ total nodes, tests, and publish through a reviewed branch. Run only five automated life simulations, not 200.
Current prompt (2026-07-23): 修复卡牌中的“起步／转折／中段”等内部阶段词、重复卡和不可达卡牌，让72张卡按真实年龄池出现，并使用玩家能理解的名称与说明。其他人生事件、数值和界面保持不变。

## Progress

- 2026-07-21: Confirmed remote `main` remains at `1cf91ce` (`v0.2.0.1`).
- 2026-07-21: Cloned repository, created local `legacy/v0.2.0.1`, and switched to `codex/v3-narrative-rebuild`.
- 2026-07-21: GitHub connector branch creation returned 403; implementation continues locally and publishing will be retried after validation.
- 2026-07-21: Rebuilt `data.json` as schema 3.0 with 320 base events, 48 five-node chains, 30 families, 44 secrets, 124 cards, 64 ending titles, and 96 ending fragments.
- 2026-07-21: Replaced the runtime with versioned save migration/recovery, gender and life DNA, dynamic desires, core conflicts, weighted indexed event matching, delayed chain consequences, cross-run freshness, seeded lifespan, and evidence-based endings.
- 2026-07-21: Preserved the existing black mobile UI, removed Emoji from the four top resources, added status/ending/recovery/debug views, input locking, and debounced persistence.
- 2026-07-21: Static data validation passed. Five fixed-seed lives all reached endings without a dead loop, invalid number, age reversal, locked choice set, or ordinary-event duplication. Observed lifespan was 66–95 and cross-life event overlap was 1.8%; this is a five-life smoke observation, not a statistical guarantee.
- 2026-07-21: Browser smoke passed at 390×844 and 375×812, including the main playable path, save schema, readable `data.json` failure page, resource labels, horizontal overflow, and ending evidence.

## Historical v0.3.0 delivery note（已完成）

- 原先记录的提交、发布和 GitHub Pages 交付步骤已经完成；当前状态以最新版本章节、当前文件和 GitHub `main` 为准。
- 主观叙事与数值体验继续由用户人工验收。

## v0.3.1 少解释，多生活

- 2026-07-21: Synced the merged v0.3.0 release, pushed `legacy/v3.0.0`（历史兼容分支）, and opened `codex/v3.1-narrative-polish` from current `origin/main`.
- 2026-07-21: v0.3.1 scope is deliberately content-and-disclosure focused: rewrite the existing 320 events, 240 chain nodes, and 124 card omens; do not add bulk content or redesign the black mobile UI.
- 2026-07-21: Validation is limited to static content checks, one playable core flow, and the two requested iPhone portrait sizes. Narrative feel remains a manual playtest decision.
- 2026-07-21: Rewrote all 320 base-event presentations and 240 chain nodes with independent scene titles, age-banded voice, concrete props/actions, one event Emoji, stakes, tone, and hidden culture-review tags. Removed the four `XX版` angles and all generic chain beat labels.
- 2026-07-21: Added 124 opaque card omens and removed card names/types/mechanics, mainline labels, conflict/desire/card state, chain markers, and numeric result deltas from the normal pre-ending UI.
- 2026-07-21: Added content revision 2 novelty keys, v0.3.0-to-v0.3.1 display cleanup, and fixed migration to retain the saved family archetype ID.
- 2026-07-21: Static v0.3.1 validation passed: 560 nodes, 97.3% unique choice signatures (maximum repeat 3), exact 30/55/15 stakes mix, exact 60/25/10/5 tone mix, 28 institutional-satire nodes, and 42 transformed trend nodes.
- 2026-07-21: Ran one core life only. It reached a 77-year ending after 44 events with three real ending facts and three completed hidden chains. Checked 390×844 and 375×812 layouts with no element or document horizontal overflow and no browser console errors. No batch simulation was run.

## v0.3.2 涌现人生

- 2026-07-21: Saved and pushed `legacy/v3.1.0`（历史兼容分支）, then created `codex/v3.2-emergent-life` from the merged v0.3.1 release.
- 2026-07-21: Replaced the event-by-event questionnaire loop with an annual timeline: one guaranteed short event per year, a 35% secondary-event chance, and stage-allocated decision pauses.
- 2026-07-21: Added schema 4 run state for `lifeFacts`, `memories`, `relationships`, `pressures`, `scheduledEchoes`, and `opportunities`, plus v0.3.1 migration into the current annual flow.
- 2026-07-21: Re-authored the content as 400 annual beats, 100 independent decisions, 80 fact-gated echoes, and 20 black swans. Curated cards were reduced to 24 innate, 36 stage, and 12 adversity cards with clear player-facing uses.
- 2026-07-21: Static validation passed: 600 total nodes, 72 cards, 50 annual beats in each age stage, 100 unique choice sets, and 40.7% low-intensity annual content.
- 2026-07-21: One browser life reached a 102-year ending with 146 timeline events, 13 decisions, and five old-choice echoes. The 390×844 and 375×812 checks had no horizontal overflow, and the browser console had no errors. No batch simulation was run.

## v0.3.2.1 手动推进 UX

- 2026-07-21: Removed the home eyebrow and explanatory subtitle; shortened the footer to `离线运行 · 自动存档`.
- 2026-07-21: Replaced timer-driven play, pause, and speed controls with one-tap timeline advancement. One touch now reaches exactly one visible event, mandatory bottom sheet, or ending.
- 2026-07-21: Moved innate, stage, and adversity cards plus all decisions into non-dismissible bottom sheets. Chosen cards and decisions immediately collapse into one timeline row; the separate result panel was removed.
- 2026-07-21: Kept schema 4 and content revision 3, added v0.3.2 result-state migration, reload-safe pending sheets, and saved manual year-boundary state.
- 2026-07-21: One browser life reached a 95-year ending with 145 timeline rows, 12 decisions, and three echoes. Verified idle play does not advance, card reload recovery works, same-year events need separate taps, and 390×844 / 375×812 have no horizontal overflow or console errors. No batch simulation was run.

## v0.3.2.2 年龄文案对齐

- 2026-07-21: Five annual events with an explicit age now trigger only at their matching ages: 25, 30, 35, 50, and 65.
- 2026-07-21: Static validation now rejects annual event text whose explicit age differs from its trigger age.

## v0.3.2.3 自适应交互可达性

- 2026-07-21: Reproduced the reported class of failure when a mobile browser reduced the usable viewport to 320×568: the timeline retained a 330px minimum and its tap target extended below the visible screen.
- 2026-07-21: The gameplay screen now fits the dynamic viewport, with the timeline itself handling vertical overflow. Short-screen card, decision, and status sheets can use the full safe height and explicitly support touch scrolling.
- 2026-07-21: Existing colors, typography, component dimensions, copy, and game behavior were intentionally preserved.
- 2026-07-21: Responsive Playwright checks passed at 360×773, 360×640, and 320×568. Birth, attributes, timeline, all three card choices, and the last decision choice were visible and unobstructed, with no horizontal overflow or console errors.

## v0.3.2.4 边界收敛

- 2026-07-22: Aligned the page, runtime, generated data, save export, README, and automated checks on v0.3.2.4 while preserving `life-unloaded-2026-v1` and schema 4.
- 2026-07-22: Added data-driven unlock triggers for the existing 30 social-codex entries. Timeline events, decisions, and selected cards can now persist matching unlocks.
- 2026-07-22: Replaced aspirational card promises with generated descriptions of the mechanics the runtime already applies. Card names, counts, effects, and draw flow remain unchanged.
- 2026-07-22: Family secrets, desires, relationships, scheduled echoes, and ending-fragment integration are explicitly deferred to a later runtime milestone and were not changed here.
- 2026-07-22: Static validation passed with 600 events, 72 cards, 30 codex entries, and no failures. One browser life ended at age 69 with 110 timeline rows, 13 decisions, 14 persisted codex unlocks, and no console errors; the gameplay and ending screenshots were visually checked.

## v0.4.0 因果人生

- 2026-07-22: Upgraded the runtime to schema 5 while retaining the `life-unloaded-2026-v1` save key. The first v4 load backs up a complete v0.3.2.4 save, preserves meta history, codex, settings, and statistics, clears an unfinished old run, and shows a one-time migration notice.
- 2026-07-22: Replaced loose job and relationship facts with an employment state machine and relationship ledger. Employment, partner, child count and child age now gate their corresponding event pools; all effects enter through one state-writing path.
- 2026-07-22: Connected 13 desires, 44 family secrets, 80 scheduled choice echoes, family late echoes, location and family modifiers, all six attributes, annual cash flow, debt interest, pressure, unemployment, health cascades, and paid recovery choices.
- 2026-07-22: Reworked the existing 600-node data set without increasing its size. The 20 black swans now have explicit age/state bands, major effects, and an exact 8 positive / 8 negative / 4 mixed split; 16 ending profiles select 64 titles from concrete outcome combinations, and 96 conditional fragments ground the final review in this run.
- 2026-07-22: Social codex unlocking now uses event IDs, outcome tags, and state milestones. Removed the inactive root data fields and added root-field, state-gate, nonempty-effect, reachability, economic-scale, ending-source, and codex-trigger validation.
- 2026-07-22: Static validation passed with 400 effective annual beats, 100 decisions, 80 reachable echoes, 20 effective black swans, 72 cards, 30 families, 44 effective secrets, 64 titles, 96 string fragments, 30 codex entries, seven independent employment pools, seven reachable partner states, a generated-field whitelist, and no failures.
- 2026-07-22: One directed browser path verified v0.3.2.4 backup/reset, visible employment/relationship/children/desire/pressure state, a major choice scheduling and redeeming an echo, incompatible job/partner/child exclusions, child-age alignment, a secret at its configured age, debt interest and health cascades, paid recovery candidates for debt/unemployment/health crises, outcome-combination ending divergence, codex persistence, and no console errors. The ending screenshot was visually checked after correcting object-fragment rendering.
- 2026-07-22: Responsive checks passed at 360×773, 360×640, and 320×568 with no horizontal overflow, unreachable action, or console error. No batch life simulation was run; crisis feel, opening differentiation, ending recognition, and replay desire remain manual playtest decisions.

## v0.4.0.1 状态与事件链修复

- 2026-07-22: University education now changes from `大学在读` to `大学毕业` at age 22. Existing schema-5 runs also repair stale education and employment labels on load, so an employed adult can no longer keep `在读` as the career detail.
- 2026-07-22: Added employed-only gates to the annual and decision-based job-change raise scenes. Job seekers retain interview, retraining, public-exam, and recovery pools without receiving “stay at the old company” choices.
- 2026-07-22: Child-related annual and decision scenes now inspect both prompts and choice results, including the previously missed `子女` wording. Childless elders receive separate single and partnered planning events; generic care and will choices no longer assume children.
- 2026-07-22: Replaced one youth decision with a guaranteed civil-service follow-up linked to the original exam choice, with public-sector, income-first, and retake outcomes plus choice-specific echoes.
- 2026-07-22: Connected existing child decisions into age-gated priority steps at child ages 6–12, 12–18, 18–30, and 25+, with guaranteed choice-specific echoes where an existing echo node is available. The total remains 400 beats, 100 decisions, 80 echoes, and 20 black swans.
- 2026-07-22: Static validation passed with no failures and the generator was hash-idempotent. One directed browser path verified the repaired status drawer, employed/job-seeker separation, childless single and partnered elder pools, the civil-service follow-up, and the first child-chain step; it ended at age 87 with 11 decisions, four echoes, and no browser errors. No batch simulation or responsive rerun was performed because UI/CSS was unchanged.

## v0.4.1 被占用的自由

- 2026-07-22: Upgraded the save contract to schema 6 and content revision 5 while retaining `life-unloaded-2026-v1`. A schema-5 save is backed up before migration; the active life and all meta history, codex, settings, statistics, and cross-run freshness records are retained while work arrangement, family finance, mobility, business, and storyline defaults are added.
- 2026-07-22: Added one data-driven storyline controller shared by four featured storylines and the existing child-life sequence. Started chains reserve their remaining choices, run before conflict/random choices, and cannot be displaced past the 12–15 decision cap; featured chains are limited to six choices and at most one main plus one secondary slot.
- 2026-07-22: Replaced exactly 48 annual beats, 16 decisions, 16 echoes, 12 ending fragments, and four codex entries without changing the 400/100/80/20 event split or any card, family, secret, ending, or codex count. All generated content remains sourced from `tools/generate-v3-data.mjs`.
- 2026-07-22: Extended the existing annual settlement for split shifts, remote and hybrid work, domestic/overseas mobility, platform dependence, shared family finance, and independent/franchise operations. No second economy engine or UI redesign was added.
- 2026-07-22: Static validation currently passes with exact counts, 4/5/3 beat intensity per storyline, sequential steps, guaranteed choice-specific echoes, semantic work/family/mobility/business gates, conditional ending sources, and no unconsumed generated fields.
- 2026-07-22: One directed browser path passed schema 5→6 migration, active-run preservation, all four forced storyline starts, five branch-specific echoes, split-shift and franchise annual settlement, refresh recovery, a 12-choice ending with a concrete remote-storyline judgment, codex persistence, and zero console errors.
- 2026-07-22: Responsive checks passed at 360×773, 360×640, and 320×568. Timeline, four-option choice sheet, status drawer, and full ending screenshots were produced at every viewport; controls remained reachable, there was no horizontal overflow, and console errors stayed at zero. No batch simulation or subjective tuning was run; narrative balance and replay desire remain manual playtest decisions.

## v0.5.0 全生命周期因果重构

- 2026-07-23: Upgraded the runtime to schema 7 and content revision 6 while retaining `life-unloaded-2026-v1`. Schema-6 saves are backed up to `life-unloaded-2026-v0.4.1-backup`; repairable active lives are migrated and meta history, codex, settings, statistics, seeds, and finished lives are preserved.
- 2026-07-23: Replaced loose facts with one structured ledger for world, origin household, education, concurrent roles, employment, activity, personal finance and liabilities, people, relationships, health, habits, desires, obligations, generic arcs, and decision history. Family assets remain separate from the player's net worth.
- 2026-07-23: Added one declarative eligibility, actor binding, effect application, consequence scheduling, event selection, and ending path. Current people and state determine availability; stale history tags no longer stand in for employment, partnership, children, debt, or health.
- 2026-07-23: Rebuilt content around twelve cross-compatible life tracks. Each track contains entry, development, daily life, conflict, crisis, recovery, exit, and legacy coverage. The final data has 400 annual beats, 100 decisions, 100 choice-specific consequences, and 20 black swans; the consequence count increased from 80 so every major decision has a distinct delayed result.
- 2026-07-23: Connected education, employment, public work, remote and platform labor, business and equity, active non-work, partnership, parenthood, housing and debt, health, staged habits, retirement, wills, death, and intergenerational effects to the same annual settlement and generic arc controller.
- 2026-07-23: Replaced the aggregate life score with six ending dimensions: autonomy, relationships, health, safety, desire fulfillment, and social impact. The share card uses a state-and-decision-gated title, a sharp summary, three real turns, a rarity grade, route tags, seed, and immediate restart.
- 2026-07-23: Static validation passed with 620 nodes, 72 cards, 30 families, 44 effective secrets, 16 ending profiles, 64 titles, 30 codex entries, all twelve track contracts, and no failures. Twelve directed track fixtures plus semantic guards verify employment, retirement, education, child-age, partnership, remote, business, leisure, and habit-state alignment without a batch life simulation.
- 2026-07-23: One browser core path passed schema 6→7 active-run migration, household/personal asset separation, desire claiming, work, partnership, child, habit, active non-work, remote, business, a choice-specific delayed consequence, refresh persistence, six-axis ending, and immediate restart with zero console errors.
- 2026-07-23: Visual and geometry checks passed at 360×773, 360×640, and 320×568. Birth, status drawer, ending facts, meters, tags, seed, and actions remained readable with no horizontal overflow. No subjective balance tuning or large-scale simulation was run; realism, emotional rhythm, extreme-route reachability, and replay desire remain manual playtest judgments.

## v0.5.0.1 记录保留与数据清理

- 2026-07-23: Restored the missing “清除全部数据” action in Settings with an explicit irreversible confirmation. It removes only `life-unloaded-2026-*` storage owned by this game, including the active life, cross-run records, and legacy snapshots.
- 2026-07-23: Changed release migration policy: a game-version or schema change now clears the old active life and removes raw legacy snapshots while retaining normalized life records, codex unlocks, settings, statistics, seen-content freshness, and recent seeds. Same-release refreshes still resume the current life normally.
- 2026-07-23: Generator output remained stable across two runs and all static/state-contract checks passed. One browser core path verified record-only migration, legacy snapshot cleanup, the visible Settings action, irreversible clear behavior, normal gameplay/ending continuity, 360×773 layout, and zero console errors.

## v0.5.0.2 初始属性随机分配修复

- 2026-07-23: Restored the missing “随机分配” action on the initial attribute screen. It resets all six attributes to their minimum, spends all 20 points through the seeded RNG without exceeding the current cap of 10, and recalculates the derived portable-skill and employability values before confirmation.
- 2026-07-23: Generator output was stable across two runs; static validation and state contracts passed. One browser core path confirmed a 26-point final attribute total, 1–10 bounds, enabled confirmation, visible controls at 360×773, normal downstream play, and zero console errors. The randomized attribute screenshot was visually inspected after the page animation completed.

## v0.5.0.3 健康与经济因果修复

- 2026-07-23: Separated the health track into ordinary prevention, accidental onset, treatment/recovery, and serious consequences. A healthy character can no longer enter either illness decision arc; health incidents now create explicit monitoring/treatment state and recovery can return the character to `well`.
- 2026-07-23: Physique, health literacy, resilience, age, and current body pressure now affect incident severity, passive damage, and treatment effectiveness. Directed checks confirmed that the same incident was milder and the same treatment more effective with high physique; the strong-physique fixture reached a real cured state.
- 2026-07-23: Moved all money flows to real 2026 yuan, stopped charging personal living costs during family-funded childhood/study, routed minor expenses to the origin household, consolidated recurring living deficits, and changed debt settlement to explicit interest plus principal. Finance recovery decisions can now repay or restructure actual liabilities.
- 2026-07-23: Added age-based decision reserves and per-track crisis limits so finance/health crises cannot consume all 16–20 choices in youth. Mandatory education/desire transitions now precede active and crisis arcs, while started arcs still finish explicitly.
- 2026-07-23: Corrected signed net-worth handling in ending safety, made health/debt route tags depend on final state, added recovered/managed alternatives, and tightened family-cycle endings with current debt, arrears, and child-relationship facts.
- 2026-07-23: Generator output remained hash-stable at 400 beats, 100 decisions, 100 consequences, 20 black swans, 72 cards, 30 families, 44 secrets, 16 ending profiles, 64 titles, and 30 codex entries. Static validation, 25 state guards, the focused browser regression, and the existing v5 browser core path passed with zero console errors.
- 2026-07-23: One genuine random browser life used no fixed seed, debug forcing, or scripted branch choice. It ended naturally at age 87 with 19 decisions spread through age 75, no health arc, final physical/mental 84/73, no health-crisis tag, zero personal debt before 18, and final debt of 61,603 instead of runaway compounding. The 360×773 ending screenshot and updated state drawer were visually inspected. No batch simulation or probability tuning was run.

## v0.5.0.4 开局刷新恢复修复

- 2026-07-23: Fixed same-release save restoration so `birth` and `attributes` phases reopen their actual setup screens instead of being forced into an unplayable age-zero timeline. The home “continue” action now uses the same phase-to-view mapping, and returning from attributes persists the restored birth phase.
- 2026-07-23: A focused 360×773 browser regression verified birth refresh, home→continue, attribute refresh, return navigation, Settings access, and the clear-data action with zero console errors. Both restored setup screenshots were visually inspected; no gameplay, data balance, or UI styling was changed.

## v0.5.1 受雇工作中文样板

- 2026-07-23: Added `content/zh-CN/ui.mjs` and `content/zh-CN/tracks/employment.mjs`. The employment generator now reads authored copy for 32 annual beats, eight decision prompts, 24 options, 24 immediate results, eight consequence headings, and 24 choice-specific delayed consequences.
- 2026-07-23: Employment annual copy now uses an explicit 10 ordinary / 8 awkward or lightly funny / 8 workplace-friction / 4 pressure / 2 major-event mix. Its options no longer show generic mechanism hints.
- 2026-07-23: Centralized and rewrote the core home, birth, attribute, status, timeline, codex, and ending labels without changing layout, state fields, effects, gates, event counts, or numeric balance.
- 2026-07-23: Added `tests/v5-language-contract.mjs`. It enforces the employment slice's copy counts, length bands, exact-result uniqueness, twelve-character repetition cap, opening repetition cap, abstract-word warnings, authored-source integrity, and forbidden-template absence inside the vertical slice.
- 2026-07-23: Generator and v5 static validation pass at 620 nodes, 72 cards, 30 families, 44 secrets, 16 ending profiles, 64 titles, and 30 codex entries. The language contract passes the employment slice and reports the untouched legacy-template counts in the other eleven tracks.
- 2026-07-23: A focused system-Chrome path at 360×773 displayed `decision_009`, chose the written-email branch, surfaced its authored immediate result, forced the matching `echo_009`, and verified the new status labels with no game-resource, console, or layout errors. Both employment screenshots were visually inspected after correcting the test's animation wait. The existing v5 browser core path also passed migration, state, consequence, ending, clear-data, and responsive checks with zero errors.
- TODO: Do not treat v0.5.1 as a full-game language rewrite. The other eleven tracks, global decisions, family secrets, cards, endings, and remaining interface copy still need separate authored passes; the language-contract warnings intentionally keep that debt visible.

## v0.5.2 十二轨道人话重写

- 2026-07-23: 将十二条轨道的 384 个年度事件、96 个轨道选择、288 个即时结果和 288 个长期回响全部改为显式中文内容；四个全局选择也取消通用结果与机制提示。
- 2026-07-23: 生成器只负责条件、效果、事件编号和调度，不再用物件与动作拼出轨道文案。当前版本重编号为 v0.5.2、内容修订 9，schema 仍为 7。
- 2026-07-23: 保持 400 个年度事件、100 个选择、100 个选择特定后果和 20 个黑天鹅，共 620 个事件节点；机制、数值、条件与事件数量未改。
- 2026-07-23: 静态数据校验、12 条轨道状态契约和语言禁用模板检查通过。家庭秘密、卡牌说明和结局判词仍属于后续非事件内容批次。
- 2026-07-23: 项目仍处于早期开发阶段，历史展示版本统一重编号：v3 系列对应 v0.3，v4 系列对应 v0.4，v5 系列对应 v0.5。Git SHA、旧兼容分支名和脚本文件名不做历史重写。

## v0.5.3 人生卡牌重写

- 2026-07-23: 删除卡牌标题中的“起步／转折／中段／回稳／余生”等内部轮次词。72张卡现在都有独立名称和具体生活说明，不再用“保留一个可用选项”解释机制。
- 2026-07-23: 卡牌按0、18、35、55岁分成12／20／20／20四个抽取池。运行时按 `drawAge` 取牌，原先永远抽不到的24张 `adversity` 卡已接入正常流程。
- 2026-07-23: 每张卡除保留能力记录外，至少写入一项实际运行状态。现金、人际支持、家庭压力、学习、健康、经营经验和欲望满足等效果不再只停留在未消费的能力字段。
- 2026-07-23: 四个年龄使用不同的卡牌提问；卡牌标题与说明改为分行显示。没有改变弹层尺寸、颜色、抽卡次数或72张总量。
- 2026-07-23: 新增卡牌池、重复文案、内部阶段词、可达性和实际效果校验。生成器连续运行两次结果一致，静态数据、状态契约和语言检查通过。
- 2026-07-23: 一次360×773浏览器路径检查了四个年龄池、选择持久化、时间线记录、横向溢出和控制台错误。最终截图已人工确认标题与说明分行清楚。

## v0.5.4 成瘾清晰化

- 2026-07-23: 在编码前完成 v0.5.3／schema 7／content revision 10 的本地、远端和线上只读核对，并按 A／B／C 三级来源研究赌博、酒精、游戏、消费失控和药物依赖。研究档案写入 `docs/research/v0.5.4-addiction-clarity.md`。
- 2026-07-23: 保留内部 `habits` 存档键，把玩家界面统一改为“成瘾与戒断”。新增五种明确 `type` 和八阶段状态，删除成瘾轨道里的模糊代称与活动链中的晚年叙述。
- 2026-07-23: 五类问题各有接触、功能受损、治疗／恢复三个选择节点；普通饮酒、游戏、购物和遵医嘱用药可明确退出，不会直接进入依赖。药物链要求已有真实治疗状态，并区分身体依赖、误用和成瘾。
- 2026-07-23: 数据扩展为400个年度事件、107个选择、107个选择特定回响和20个黑天鹅，共634个节点；schema 保持7，content revision 升至11。v0.5.5 的事件簇引擎没有提前引入。
- 2026-07-23: 生成器连续运行两次 SHA-256 一致。JS语法、数据契约、43项定向状态门槛和语言检查通过，五类成功、失败、退出、共存／治疗与复发结尾均有明确状态断言。
- 2026-07-23: 一条系统 Chrome 核心路径验证赌博接触、追损失控、恢复、三节点五年内收口及当前选择刷新恢复；360×773、360×640、320×568 的状态抽屉可滚动到具体成瘾字段，无横向溢出，控制台错误为0。没有运行批量人生模拟。

## v0.5.5 事件簇引擎与开店样板

- 2026-07-23: 编码前完成 v0.5.4／schema 7／content revision 11 的本地、远端和线上核对，并按 A／B／C 三级来源研究加盟核验、独立小店、开业现金流、关店手续和沉没成本。研究档案写入 `docs/research/v0.5.5-shop-episodes.md`。
- 2026-07-23: Schema 升至8，content revision 升至12。新增 `run.episodes` 与 `run.sceneQueue`；Schema 7 活动局会被清除，人生档案、图鉴、设置、统计、已见内容和最近种子继续保留。
- 2026-07-23: 新事件接口包含 `id`、`lane`、`phase`、`role`、`delayYears` 和 `deadlineYears`。每阶段按情况卡、选择卡、结果卡显示，三张卡保持同龄，结果确认后只写一条时间线；刷新可恢复到选择或结果卡且不会重复应用效果。
- 2026-07-23: `shop_opening` 使用 `decision_033`—`decision_035` 三阶段表达考察与资金、开业与真实流水、最终收尾。玩家可到达稳定经营、独立经营、清货止损和担保债务失败；五年截止与门店提前失效均有具体替代结尾。
- 2026-07-23: 事件簇同时最多两个且不得占用同一领域；新簇与旧 `arcs` 也不能占用同一 lane。融资扩张、财富顶点及其他轨道没有迁入本轮。
- 2026-07-23: 生成器连续运行两次 SHA-256 均为 `BF31D8897325852529EDB2F496518B1204064C06D65078570B0967662CBFCF3B`。JS语法、632节点数据契约、状态门槛和语言检查通过。
- 2026-07-23: 一条系统 Chrome 核心路径验证同龄三卡、选择与结果刷新恢复、六类结尾、Schema迁移以及360×773、360×640、320×568的弹层和状态抽屉；控制台错误为0。没有运行批量人生模拟。

## v0.5.6 事业转换事件簇

- 2026-07-24: 编码前完成 v0.5.5／schema 8／content revision 12 的本地、远端和线上只读核对，并按 A／B／C 三级来源研究公务员招录、裁员再就业和主动不工作。研究档案写入 `docs/research/v0.5.6-事业转换.md`。
- 2026-07-24: 版本升至 v0.5.6，schema 保持8，content revision 升至13。`public_exam` 为报名资格与笔试面试两个阶段，结尾覆盖录用、再考、市场退出和资格／主动退出；最迟两年结束。
- 2026-07-24: `layoff_reemployment` 为解除材料与重新落脚两个阶段，覆盖内部转岗、同领域岗位、过渡工作、培训转岗和长期求职；文案只要求核对解除依据、明细与证明，不把所有裁员写成固定补偿；最迟两年结束。
- 2026-07-24: `career_break` 为资金来源、一年后生活和明确收尾三个阶段，区分非求职生活、低强度有偿项目、按计划全职返工和资金耗尽后的被动返工；最迟三年结束。
- 2026-07-24: 公务员招录与裁员再就业共用 `career` lane，主动不工作使用 `lifestyle` lane。状态抽屉显示三个中文事件簇名；三类超期或状态失效均使用具体物件与动作收尾，不再显示原始 ID 或通用事件簇句。
- 2026-07-24: 三个轨道的旧四节点链断言已按新数据结构更新；未迁移的原有选择文案保留为普通长期事件，没有迁入 v0.5.7 及后续轨道。
- 2026-07-24: 生成器连续运行两次 SHA-256 均为 `6C10847235AEB851FCEE381DB83BD29987FC6C0F9AEF35285ED3C62653C42A25`。JS语法、632节点数据契约、57项状态语义门槛和语言检查通过。
- 2026-07-24: 一条系统 Chrome 核心路径验证 v0.5.5 活动局清除且跨局记录保留、三条事件簇全部结尾、同龄三卡、选择与结果刷新恢复、同领域互斥、具体强制结尾，以及360×773、360×640、320×568弹层和状态抽屉；控制台错误为0。截图在淡入动画完成后人工目检，没有运行批量人生模拟。

## v0.5.7 危机与恢复事件簇

- 2026-07-24: 编码前完成 v0.5.6／schema 8／content revision 13 的本地、远端和线上只读核对，并按 A／B／C 三级来源研究担保追偿、债务重组、治疗康复和成瘾干预。研究档案写入 `docs/research/v0.5.7-危机与恢复.md`。
- 2026-07-24: 版本升至 v0.5.7，schema 保持8，content revision 升至14。`guarantee_recourse` 使用 finance lane，按签署、违约、追偿三个阶段推进，覆盖拒绝担保、限额担保、连带责任、核验债权、书面重组、追偿、关系破裂和债务失败；最迟三年结束。
- 2026-07-24: `acute_illness` 使用 personal lane，按检查、治疗、康复和结果四个阶段推进，结尾区分治愈、长期管理、功能受限和退出治疗；最迟四年结束。慢性管理和功能变化继续保留为健康状态，不延长为几十年的活动链。
- 2026-07-24: 赌博、酒精、游戏、消费失控和药物依赖各自拆成问题形成、治疗和复发三个独立事件簇，每簇两阶段、最迟两年收口。首次接触可以明确退出，治疗要求已有控制受损或功能损害，复发要求已有至少一年恢复状态；遵医嘱用药不会被当成成瘾。
- 2026-07-24: 状态抽屉显示“担保追偿”“急性疾病”及“赌博·治疗”“酒精·复发”等具体名称。新增担保结清失效、疾病四年截止和各类成瘾两年复核的具体替代结尾；finance 与 personal 可并行，同一 personal lane 仍互斥。
- 2026-07-24: 数据扩展为400个年度事件、121个选择、121个选择特定回响和20个黑天鹅，共662个节点。生成器连续运行两次 SHA-256 均为 `BF31FE903107BAAD50D37892211C3FA7F228F4FF1599C019958383FCCEB80397`；JS语法、数据契约、状态门槛和语言检查通过。
- 2026-07-24: 一条系统 Chrome 核心路径验证 v0.5.6 活动局清除且跨局记录保留、担保与疾病全部结尾、五类成瘾三簇的代表性结尾、同龄三卡和刷新恢复、lane 互斥、三类强制结尾，以及360×773、360×640、320×568弹层和状态抽屉；控制台错误为0。所有成瘾结尾另由静态状态契约逐项检查，没有运行批量人生模拟。

## v0.5.8 家庭与迁移事件簇

- 2026-07-24: 编码前完成 v0.5.7／schema 8／content revision 14 的工作区、`main`、`origin/main` 与线上只读核对，并按 A／B／C 三级来源研究婚恋、生育与收养、子女成长边界、远程工作、平台依赖和跨境旅居。研究档案写入 `docs/research/v0.5.8-家庭与迁移.md`。
- 2026-07-24: 版本升至 v0.5.8，schema 保持8，content revision 升至15。远程、伴侣和子女轨道的六条旧四节点链已删除，改为14条独立短簇；教育、开店与晚年剩余五条旧链留到 v0.5.9。
- 2026-07-24: 关系建立、婚姻危机、离婚、复合与晚年相伴分别使用 `relationship` lane；成为父母、收养、入学、青春期与成年子女边界使用 `parenting` lane。当前伴侣以 `activePartnerId` 绑定，前任保留为 `lastPartnerId`；子女节点绑定具体人物并按实际年龄开启。
- 2026-07-24: 第一份远程合同与平台依赖使用 `career` lane，海外许可与建立基地使用 `mobility` lane。合同先核对工作地、时段、设备和保障；平台依赖由收入集中与申诉风险触发；跨境规则只保留许可、税务、保险和雇主同意机制，不写死国家门槛。
- 2026-07-24: 新增数据驱动 `episodeCatalog`，提供玩家可见中文名称、放弃路线、年龄优先级、组织绑定以及具体超期／失效结尾。单阶段的入学与第一份远程合同也走情况卡、选择卡、结果卡，并在结果确认后立即收口。
- 2026-07-24: 数据扩展为400个年度事件、124个选择、124个选择特定回响和20个黑天鹅，共668个节点。生成器连续运行两次 SHA-256 均为 `86200307E21CC7E526AC64DE0037E1829FB33A11B1A794DF872B9DEED31B1B0D`；JS语法、数据契约、状态门槛和语言检查通过。
- 2026-07-24: 一条系统 Chrome 核心路径验证 v0.5.7 活动局清除且跨局记录保留、14条新簇目录、六条旧链删除、同龄三卡、选择与结果刷新恢复、当前伴侣绑定、到龄入学、单阶段收口、两簇上限、平台具体失效结尾，以及360×773、360×640、320×568；截图人工目检通过，控制台错误为0，没有运行批量人生模拟。

## v0.5.9 全轨收口

- 2026-07-24: 编码前完成 v0.5.8／schema 8／content revision 15 的工作区、`main`、`origin/main` 与线上只读核对，并按 A／B／C 三级来源研究教育分流与中断、考证和成年再教育、企业扩张与财富顶点，以及退休、父母遗产、长期照护和遗嘱。研究档案写入 `docs/research/v0.5.9-全轨收口.md`。
- 2026-07-24: 版本升至 v0.5.9，schema 保持8，content revision 升至16。教育新增中考分流、大学中断、考证、成年再教育四簇；经营保留开店簇并新增企业扩张和财富顶点；晚年新增退休转换、父母遗产、长期照护和遗嘱规划，共10条新簇、23个阶段。
- 2026-07-24: 删除教育、经营和晚年剩余五条旧四节点链，并从生成数据、运行时和玩家选择中清除 `arc`、`arcExit`、`run.arcs` 与 `arcSlots`。删除重复的15岁教育转场，保留18岁首次方向选择；一般受雇、公共职业和财务轨道中会绕过新簇的退休／遗嘱选择改写为合同交接、调动档案与债务盘点。
- 2026-07-24: 新簇按1—4年明确收口。中考分流要求义务教育已完成；大学中断要求在读；扩张要求已有可运行业务、经营能力与权益；财富顶点要求企业达到全国或全球规模；父母遗产绑定真实已故父母；长期照护要求已有功能或照护需要。状态抽屉显示退休、继承、照护和遗嘱长期状态。
- 2026-07-24: 数据保持400个年度事件、124个选择、124个选择特定回响和20个黑天鹅，共668个节点。生成器连续两次 SHA-256 均为 `1E52CFA76540EAB22D2EB77D3C941E7449D07A90B749A6AD60818E26B2A50CA0`；JS语法、数据契约、57项状态语义门槛和语言检查通过。
- 2026-07-24: 一条系统 Chrome 核心路径验证 v0.5.8 活动局清除且跨局记录保留、10条新簇的40个成功／失败／退出／失效结尾、同龄三卡、选择与结果刷新恢复、两簇及同 lane 限制，以及360×773、360×640、320×568连续卡和状态抽屉；六张截图在动画完成后人工目检通过，控制台错误为0，没有运行批量人生模拟。

## v0.5.10 原生家庭与国内外本科入学

- 2026-07-24: 编码前完成 v0.5.9／schema 8／content revision 16 的工作区、`main`、远端 main 与线上版本只读核对。按用户锁定范围只采用中文媒体调查和中文网络讨论研究家庭资源与创伤、校园支持与伤害、中高考信息差和国内外本科申请；网络自述仅用于物件、口语和场景，不用于概率、金额或规则。研究档案写入 `docs/research/v0.5.10-原生家庭与国内外升学.md`。
- 2026-07-24: 版本升至 v0.5.10，schema 升至9，content revision 升至17。家庭增加资源、教育资本、照顾者时间、父母在场、住房稳定、情感安全和教育预算；2、7、11、14岁按真实组合播放差异化固定节点。
- 2026-07-24: 成长状态增加学习习惯、出勤、教师／同伴支持、自我求助、照料负担、创伤负荷、路线信息和语言准备。校园伤害使用独立两阶段 `school_harm`，覆盖记录与求助、转环境、继续受损、暂停及恢复，忍耐不提供奖励。
- 2026-07-24: 中考 `secondary_diversion` 接入准备度和此前路线信息。核心选择门槛不足时保持可见、禁用并说明原因；额外路线只有在此前接触后显示。旧的统一18岁方向选择和 `university_interruption` 已删除。
- 2026-07-24: 新增四阶段 `undergraduate_application`，分别处理国内／海外／双轨准备、考试与申请、录取与资金、入境启程和正式报到。录取不等于入学；最终只保留一个国内或海外入学地。大学课程、社团、读研、海外生活和就业未纳入本轮，状态通过 `education.nextStage` 和成长证据留给下一版。
- 2026-07-24: 数据扩展为408个年度事件、127个选择、127个选择特定回响和20个黑天鹅，共682个节点。家庭节点增加资源充足但关系不安全的独立路线；父母具体职业以有限幅度进入教育信息、可用时间、工作稳定和教育预算，不再只是展示字段。
- 2026-07-24: 本科提交按准备证据形成录取、条件录取或落选；国内费用／资助、海外资金、一般性入境资格与正式报到分别记录。旧的固定四选项验收器已调整为真实3—4项，并新增家庭情境、校园伤害、选择显示／锁定和国内外本科完整结尾的定向契约。
- 2026-07-24: 生成器连续两次 SHA-256 均为 `D35D8359235C3C4D1265FC35889C7D0B3ECA9EC9F1757D64A75486F93DA13381`。JS语法、682节点数据契约、78项状态语义门槛、语言与版本一致性检查通过。
- 2026-07-24: 一条系统 Chrome 核心路径验证Schema 8活动局清除且人生档案／设置／统计／种子保留，三类家庭童年节点，核心路线可见但锁定、额外路线暴露后出现，国内资金不足、国内与海外本科报到、落选和延期、开始阶段后的自然调度、同龄选择与结果刷新恢复、每阶段一条时间线，以及360×773、360×640、320×568；两张截图在动画完成后人工目检通过，控制台错误为0，没有运行批量人生模拟。
