# 《人生尚未加载 · 2026》当前交接

更新时间：2026-08-12。本文只记录当前可执行事实；历史过程见 `progress.md` 与 Git。

## 当前快照

| 项目 | 当前事实 |
|---|---|
| 分支／基线 | `main` 为 v0.6.11 发布线；`legacy/0.6.10@b84b480` 固定上一公开版本 |
| 线上版本 | v0.6.11／Schema 13／Content Revision 29 |
| 本地版本 | v0.6.11／Schema 13／Content Revision 29 |
| 发布状态 | v0.6.11 已完成独立复核、最终重验并由 GitHub Pages 发布 |
| 生成数据 | 910 个事件：480 beat、205 decision、205 consequence、20 black swan |
| 其他内容 | 72 张卡牌、44 个家庭秘密、34 项图鉴、64 个结局标题 |
| `data.json` SHA-256 | `b44740be04f545eba79eb16eb826bad3652191e72fda1add95dbee6686536209` |

后续版本的提交、legacy 分支、push、PR、合并和部署仍是独立操作，需按当轮授权执行。

## v0.6.11 已发布

- Episode 新阶段直接显示问题、处境和选项；问题在上，处境在下并保留清晰间距。结果页只显示作者结果与“继续”。旧存档的重复处境队列会折叠，选择效果与延迟结果仍保持单次结算。
- 卡牌 `explanation` 与 `resultSuffix` 均可省略。214 条互动的机制与 patch 未变，最终只保留 8 条有用说明和 2 条增加可观察事实的后缀。
- 状态抽屉不再显示准备度、关系数值、联系数、归属分数、愿望完成度或 episode 阶段；朋友、海外生活和正在经历的事改成生活化摘要。
- DeepSeek V4 Pro／V4 Flash 通过用户人工转交完成三轮全库审阅；随后 Codex 5.6 Sol 独立复核报告保存在 `_bmad-output/implementation-artifacts/codex-gpt-5.6-sol-v0.6.11-copy-audit.md`。Codex 按 requirements、effects、route 和阶段完成最终整合，拒绝只对部分分支成立的具体化。
- 全库账本已刷新为 3879 个玩家可见字段：196 项已整合、3152 项保留、527 项新增覆盖并复核、4 项公共呈现层收口。脚本不会把旧结论继承给变化后的正文，批量完成必须显式指定现存审计报告。
- 正式生成器连续两次结果一致；最终 `node smoke.js --full` 全部通过，三种目标窄屏控制台错误为 0。

## v0.6.10 已发布

- 新增独立 `social` 轨道：24 beat、8 decision、8 consequence；无 episode、recurrence、维护条、行动点或完整 NPC 模拟。
- 复用 `people` 保存两个终身槽位的具体非家庭人物；关系结束、搬远或转为伴侣不释放槽位。`relationships.network`、本地联系、归属、主动独处和孤独继续分开表达。
- 四类关键选择使用最多三个显式变体的稳定结果；变体、人物与延迟回响写入存档，刷新和恢复不重抽。原人物死亡、关系 ended 或槽位失配后不再代其发言。
- 新增同人进入 `dating`、就业 referral、`socialCoResidence` 和有限危机支持桥接。工作线索不授职，朋友收入不并入住户收入，临时落脚不清产权与按揭，任何失败仍整组回滚。
- 新增两项 social 图鉴；8 个新 decision 各有一个显式卡牌互动。正式内容合计 910 个事件、214 个卡牌互动。
- 40 条社交文案已按共同事实、拒绝合理性、中国生活纹理和禁用笑点全量复核；8 个 situation 为 54—67 字，选择为 4—10 字。

v0.6.9 逐事件证据仍在：

- `docs/research/v0.6.9-全量文案与机制验收.md`
- `docs/research/v0.6.9-玩家文案验收表.tsv`

## 文档职责

- `README.md`：玩家说明、本地试玩和最短验证入口。
- `AGENT_HANDOVER.md`：当前接手事实、命令与边界。
- `docs/project-context.md`：跨版本工程约束。
- `progress.md`：精简版本账本，不授权新工作。
- `roadmap/00-总体策略.md` 与当前版本 roadmap：已批准的版本边界。
- `CopyWriting_Guideline.md`：玩家文案的正式验收标准。

现场 Git、版本常量、生成数据和测试结果优先于任何文档摘要。

任何玩家可见中文的写作、改写或审阅开始前，必须完整阅读 `CopyWriting_Guideline.md` 和 `docs/project-context.md`。

## 最短工作流

先只读确认现场：

```bash
git status --short --branch
git branch --show-current
git log -5 --oneline --decorate
```

内容发生变化时，只编辑 `content/zh-CN/` 与生成器源，然后连续生成两次：

```bash
node tools/generate-v5-data.mjs
node tools/generate-v5-data.mjs
```

两次生成后的 `data.json` 必须逐字节一致；需要记录哈希时，macOS／Linux 使用 `shasum -a 256 data.json`，Windows 使用 `certutil -hashfile data.json SHA256`。

统一验证入口：

```bash
node smoke.js          # 日常核心：合同 + 核心浏览器回归
node smoke.js --fast   # 秒级：全部脚本语法检查
node smoke.js --full   # 发布前全部当前版本回归
node smoke.js --list
node smoke.js --changed main --dry-run
node smoke.js --changed main --scope <profile>
```

`tests/run-checks.cjs` 是内部 profile runner；正常操作不需要直接调用。冻结的 v0.6.7 runtime-equivalence 保存在 `tests/legacy/` 作为审计副本；实际复核须在独立 worktree 检出 `legacy/0.6.7`，运行该版本自带的 `node tests/v6-runtime-equivalence-smoke.cjs`，不进入当前版本 profile。

本地试玩：macOS 双击 `start-local-play.command`，或运行 `python3 -m http.server 8765` 后打开 `http://127.0.0.1:8765/`。

## 验证基线

- v0.6.11 生成器连续两次结果一致，正式 `data.json` 两次 SHA-256 均为 `b44740be04f545eba79eb16eb826bad3652191e72fda1add95dbee6686536209`。
- 已通过发布档 `node smoke.js --full`：syntax 39 文件、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement 全部通过。
- social 运行时回归覆盖两人上限与事务回滚、稳定结果和恢复、同人 dating、referral、朋友合住、主动独处结局信号，以及已有／当场新建人物失效后的延迟回响。
- 360×773、360×640、320×568 浏览器路径和控制台零错误已通过；没有运行批量人生模拟。
- 最终 diff 经盲审、边界审查和规格验收三路复核；确认成立的账本、图鉴条件、事实边界与无障碍问题均已修复，无剩余 P0/P1 阻断项。
- `full` 不代表主观体验已完成；重要文案和人生连贯性仍需真实试玩判断。

## 发布边界

- GitHub Pages 直接发布 `main` 的静态文件，没有构建产物。
- 发布前必须重新核对版本常量、生成数据、工作树和 `node smoke.js --full`。
- 推送后必须核对远端分支、Pages 构建提交／状态，以及线上 `index.html`、`game.js`、合同与 `data.json` 的版本和哈希。
- `roadmap/` 是本地规划资料；保持现有忽略策略，不因发布自动纳入 Git。
- 实验分支 `investigate_card_game_mechanics` 不是发布基线，不整体合并。

## Planned／Added／Changed／Deferred

### Planned

- 公共呈现层、三个风格纵切片、三轮 DeepSeek 全库审阅、Codex 独立复核、状态面板收口与最终完整验收均按 v0.6.11 批准计划落地。

### Added

- 增加旧存档重复处境折叠、卡牌可选说明、状态抽屉生活化格式，以及本地全库审阅账本；没有新增 Schema、事件、路线或玩法系统。

### Changed

- Episode 选择页、结果页、卡牌介入文案和状态抽屉统一改为直接呈现玩家能理解的事实。
- 最终账本记录 196 个已整合字段、3152 个保留字段、527 个新增覆盖字段和 4 个呈现层收口项；生成数据规模、Schema、路线与数值保持不变。

### Deferred

- 年度关键选择密度、18% 第二 beat、同龄高等教育推进、轨道饱和与重复年龄标题继续移交 v0.6.12。
- 多实例 episode、通用因果图和参数化后果仍是 v0.7.x 候选；本版没有扩建事件引擎。
- 主观文案体感与整局节奏仍需用户真实试玩；自动化通过不替代体验判断。

## 下一步

- v0.6.11 发布完成后停止；等待用户继续试玩，并由用户单独决定是否启动 v0.6.12。

除非用户明确授权，下一窗口只核对或实施当前请求，不自动提交、推送、合并、部署、删历史文件或运行批量人生模拟。
