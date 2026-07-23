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
