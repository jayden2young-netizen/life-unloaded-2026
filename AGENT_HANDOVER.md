# 《人生尚未加载 · 2026》当前交接

更新时间：2026-08-10。本文只记录当前可执行事实；历史过程见 `progress.md` 与 Git。

## 当前快照

| 项目 | 当前事实 |
|---|---|
| 分支／基线 | `main` 发布 v0.6.10；`legacy/0.6.9@6f9a764` 固定发布前基线 |
| 线上版本 | v0.6.10／Schema 13／Content Revision 28 |
| 本地版本 | v0.6.10／Schema 13／Content Revision 28 |
| 发布状态 | 实现、正式双次生成、独立审核、发布档 `full`、提交、推送与 Pages 部署均已完成 |
| 生成数据 | 910 个事件：480 beat、205 decision、205 consequence、20 black swan |
| 其他内容 | 72 张卡牌、44 个家庭秘密、34 项图鉴、64 个结局标题 |
| `data.json` SHA-256 | `0bdb62d2a09e75b9183fa9d3d95dd4190b1cb1309cd63c231b40e2401df390b3` |

后续版本的提交、legacy 分支、push、PR、合并和部署仍是独立操作，需按当轮授权执行。

## v0.6.10 本地已完成

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

- v0.6.10 生成器连续两次结果一致，正式 `data.json` 两次 SHA-256 均为 `0bdb62d2a09e75b9183fa9d3d95dd4190b1cb1309cd63c231b40e2401df390b3`。
- 已通过发布档 `node smoke.js --full`：syntax 38 文件、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement 全部通过。
- social 运行时回归覆盖两人上限与事务回滚、稳定结果和恢复、同人 dating、referral、朋友合住、主动独处结局信号，以及已有／当场新建人物失效后的延迟回响。
- 360×773、360×640、320×568 浏览器路径和控制台零错误已通过；没有运行批量人生模拟。
- 独立测试审核使用 `gpt-5.6-sol/medium`，最终结论无剩余 P0/P1 阻断项。
- `full` 不代表主观体验已完成；重要文案和人生连贯性仍需真实试玩判断。

## 发布边界

- GitHub Pages 直接发布 `main` 的静态文件，没有构建产物。
- 发布前必须重新核对版本常量、生成数据、工作树和 `node smoke.js --full`。
- 推送后必须核对远端分支、Pages 构建提交／状态，以及线上 `index.html`、`game.js`、合同与 `data.json` 的版本和哈希。
- `roadmap/` 是本地规划资料；保持现有忽略策略，不因发布自动纳入 Git。
- 实验分支 `investigate_card_game_mechanics` 不是发布基线，不整体合并。

## Planned／Added／Changed／Deferred

### Planned

- 40 条 social 内容、两个终身人物槽位、四类差异体验、稳定结果，以及恋爱／工作／住房／支持／时间五类显式桥接均按批准计划落地。

### Added

- 独立审核发现后补入延迟回响的原人物绑定与失效校验、social 状态抽屉标签、无旧友时中晚年选项可达性，以及非 episode situation 的正式显示。这些都是完成既定验收所需的边界修复，没有扩展产品范围。

### Changed

- v0.6.10 roadmap 原先只规定未来规划边界；最终采用已批准规划包中的 `people[].social`、两个不释放槽位、Schema 13、40 条内容和有界稳定随机。
- `coResidentRefs` 从“只承认伴侣和家庭人物”扩展为也承认一位合法、在世、当地且关系未结束的 social 人物；匿名 shared 仍为空，所有写入继续走住房事务。

### Deferred

- 不做社交维护、自动衰减、NPC 日程、社交行动点、通用因果引擎、人物迁移史或版本专属 smoke。
- 人脉广／真朋友／主动独处／被动孤独的长期体感、跨系统混排密度与结局辨识度仍需玩家真实试玩；统一跨系统收口交给 v0.6.11。
- 既有 `dueConsequence` 在同年最高优先级回响失效时不会继续取下一条，另一条合法回响可能顺延；本版未改通用调度语义，如需调整交给 v0.6.11 单独评估。
- 批量人生模拟仍不作为发布证明；人物关系体感与跨系统混排继续留给 v0.6.11 的人工验收。

## 下一步

- v0.6.11：跨系统验收与有限收口；依赖已发布的 v0.6.10，但不会自动开始。

除非用户明确授权，下一窗口只核对或实施当前请求，不自动提交、推送、合并、部署、删历史文件或运行批量人生模拟。
