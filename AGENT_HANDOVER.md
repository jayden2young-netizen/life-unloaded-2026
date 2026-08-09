# 《人生尚未加载 · 2026》当前交接

更新时间：2026-08-09。本文只记录当前可执行事实；历史过程见 `progress.md` 与 Git。

## 当前快照

| 项目 | 当前事实 |
|---|---|
| 分支／基线 | `main` 发布 v0.6.9；`legacy/0.6.8@b925657` 固定发布前基线 |
| 线上版本 | v0.6.9／Schema 13／Content Revision 27 |
| 本地版本 | v0.6.9／Schema 13／Content Revision 27 |
| 发布状态 | 开发、逐事件验收、全量回归、提交、推送与 Pages 部署均已完成 |
| 生成数据 | 870 个事件：456 beat、197 decision、197 consequence、20 black swan |
| 其他内容 | 72 张卡牌、44 个家庭秘密、32 项图鉴、64 个结局标题 |
| `data.json` SHA-256 | `4dd9521f59e7d8e08aa48fb0447e525a5ecacc4a885a8f6cc5aa2c1d93d41d7d` |

后续版本的提交、legacy 分支、push、PR、合并和部署仍是独立操作，需按当轮授权执行。

## v0.6.9 已完成

- 选项命令改为事务式执行；任何住房、人物、债务或合同硬条件失败时整组不落账。
- 修正子女年龄、伴侣与生育载体、单身收养、父母遗产、海外求职、求职退出和半退休职业身份。
- 临时住校、单位宿舍及短期照护不再清除房产与按揭；永久处置仍走统一住房入口。
- 同龄多个 episode 只结算一年；担保追偿只处理绑定债务；失效面板有明确收束。
- 44 条家庭秘密、20 条黑天鹅、五类成瘾文案和 206 个卡牌互动改为逐事件事实门槛与玩家口吻。
- 页面允许缩放；主要按钮、dialog、焦点管理和触觉开关补齐无障碍语义。
- 事件 ID、图鉴 ID 和 870 个事件总数保持不变；没有提前实现 v0.6.10 社交人物系统。

逐事件证据在：

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

- v0.6.9 生成器连续两次结果一致。
- 全量档覆盖 syntax、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement。v0.6.7 等价性脚本及 fixture 只作为 `tests/legacy/` 历史证据保留，不属于当前可运行 profile。
- 三种窄屏路径纳入浏览器回归，控制台错误为 0。
- `full` 不代表主观体验已完成；重要文案和人生连贯性仍需真实试玩判断。

## 发布边界

- GitHub Pages 直接发布 `main` 的静态文件，没有构建产物。
- 发布前必须重新核对版本常量、生成数据、工作树和 `node smoke.js --full`。
- 推送后必须核对远端分支、Pages 构建提交／状态，以及线上 `index.html`、`game.js`、合同与 `data.json` 的版本和哈希。
- `roadmap/` 是本地规划资料；保持现有忽略策略，不因发布自动纳入 Git。
- 实验分支 `investigate_card_game_mechanics` 不是发布基线，不整体合并。

## 下一版本

- v0.6.10：社会交往。开发前须基于 v0.6.9 现场事实重新规划；可读取住房接口，但不要反向重建住房系统。
- v0.6.11：跨系统验收与有限收口；依赖 v0.6.10 完成。

除非用户明确授权，下一窗口只核对或实施当前请求，不自动提交、推送、合并、部署、删历史文件或运行批量人生模拟。
