# 《人生尚未加载 · 2026》开发交接

更新时间：2026-07-24

这份文件用于下一次 Codex 窗口接手项目。开始工作前仍要重新检查本地文件和 GitHub；下面记录的是交接时已经核对过的状态，不代替现场核验。

公开的 `README.md` 只面向玩家和其他访问项目的人。生成器、测试、分支、部署、接手步骤和 AI 工作边界都写在本文件中，不要再放回 README。

## 仓库与版本

- 正确的本地仓库：`C:\Users\Administrator\Documents\Life unloaded`
- GitHub：<https://github.com/jayden2young-netizen/life-unloaded-2026>
- 在线版本：<https://jayden2young-netizen.github.io/life-unloaded-2026/>
- 当前开发版本：v0.5.6
- 上一个已发布版本：v0.5.5
- `schemaVersion`：8
- `contentRevision`：13
- localStorage 键：`life-unloaded-2026-v1`
- `main` 开发基线：`8eb74fbc9d252a333dcff1fa9a2576f039d41610`
- 基线提交说明：`Merge v0.5.5 episode engine`
- 开发分支：`codex/v0.5.6-career-episodes`
- 基线版本：`v0.5.5`

交接前核验时，`main` 与 `origin/main` 一致，工作区原本干净。本交接文件随玩家版 README 一起维护；是否已经提交、当前分支是否变化，以新窗口现场执行的 Git 检查为准。

旧检出目录已经失效，不要再使用：

```text
C:\Users\Administrator\Documents\Codex\2026-07-20\...\life-unloaded-2026
```

## Git 状态

v0.5.2 的开发分支是 `agent/v0.5.2-native-copy`，分支提交为 `1068ebf`。内容已经通过合并提交进入 `main`，但当时没有先创建 PR。

已实际尝试事后补建 PR，GitHub 返回：

```text
No commits between main and agent/v0.5.2-native-copy
```

不要为了补 PR 回滚 `main`、制造空提交或重写历史。下一版本应从最新 `main` 创建独立分支，完成验证后先推送并创建 PR，确认后再合并。

GitHub CLI 不在当前 Codex 子进程的 PATH 中，绝对路径可用：

```text
C:\Users\Administrator\Documents\Codex\tools\gh\bin\gh.exe
```

交接时登录账号为 `jayden2young-netizen`。

## 项目结构

游戏仍是直接部署到 GitHub Pages 的静态项目，没有框架、npm 构建、外部字体、CDN 或运行时接口。

```text
index.html                         页面入口
style.css                         黑色移动端界面
game.js                           状态账本、因果引擎、存档与流程
data.json                         生成后的内容数据
content/zh-CN/ui.mjs              核心界面中文
content/zh-CN/tracks/*.mjs        十二条人生轨道中文
tools/generate-v5-data.mjs        当前数据生成器
tools/generate-v3-data.mjs        兼容入口
tests/                            静态、状态、语言与浏览器检查
```

`data.json` 只能由生成器产生。数据或文案改动必须先改生成器或 `content/zh-CN/` 的源文件，再重新生成；不要只手工编辑 `data.json`。

必须保留的产品边界：

- 黑色极简移动端界面
- 每次轻触只推进一条可见事件
- 卡牌和选择使用不可跳过的底部弹层
- 每年最多两条可见事件
- 种子随机、localStorage、跨局记录与损坏存档恢复
- 不引入框架、npm 构建、CDN、接口、图片或外部字体
- 不用大规模人生模拟代替定向状态检查和人工试玩

当前内容规模：

- 400 个年度事件
- 106 个选择事件
- 106 个选择特定长期后果
- 20 个黑天鹅
- 72 张卡牌
- 30 种家庭画像
- 44 个家庭秘密
- 12 条人生轨道
- 16 条结局画像、64 个结局标题
- 30 个社会图鉴条目

## v0.5.2 已完成

本轮中文标准是约 70% 生活白话、20% 真实行业与家庭用语、7% 互联网幽默、3% 文学判词。

十二条人生轨道的 384 个年度事件、96 个轨道选择、288 个即时结果和 288 个长期回响已经改为显式中文内容。四个全局选择也取消了通用结果句和机制提示。首页、出生、属性、状态抽屉、时间线、图鉴和结局的核心界面用语集中在 `content/zh-CN/ui.mjs`。

这次只重写文案，没有调整事件数量、状态条件、效果、数值平衡或界面布局。

## v0.5.3 卡牌修复

72张卡牌已移动到 `content/zh-CN/cards.mjs`，按0、18、35、55岁分成12／20／20／20四个池。每张卡都有独立名称、生活化说明、`drawAge` 和至少一项实际状态效果。

运行时只从当前年龄对应的池中抽三张牌。旧的“起步／转折／中段／回稳／余生”后缀和不可达的 `adversity` 池已删除。四次抽卡仍发生在0、18、35、55岁，72张总量和底部弹层交互不变。

## v0.5.4 成瘾清晰化

内部存档键继续使用 `habits`，界面名称统一为“成瘾与戒断”。`habits.type` 现在明确区分赌博、酒精、游戏、消费和药物；每类各有接触、功能受损、治疗／恢复三步选择，普通饮酒、游戏、购物和遵医嘱用药都可以不进入持续问题。

五类内容共有32个年度事件、15个选择和15个选择特定回响。依赖或失控只能在反复行为、控制受损和现实功能损害之后出现；药物链要求已有真实健康治疗状态，并区分必要处方、身体依赖、误用与成瘾。状态抽屉显示“赌博·追损失控”“酒精·治疗中”“游戏·恢复2年”等具体状态。

研究档案位于 `docs/research/v0.5.4-addiction-clarity.md`。数据仍由生成器产生，schema 保持7，内容修订升至11。

## v0.5.5 事件簇引擎与开店样板

运行时新增 `run.episodes` 和 `run.sceneQueue`。带 `episode` 接口的选择不再走普通年度选择流程：每阶段依次显示情况卡、选择卡和结果卡，三张卡保持同一年龄；结果确认后只写一条时间线，再完成年度结算。队列和当前选择会写入 localStorage，刷新后恢复到正确卡片且不重复应用效果。

`shop_opening` 使用 `decision_033`—`decision_035` 三个阶段：考察与资金、开业与真实流水、明确收尾。最终路线为 `survived`、`independent`、`stop_loss` 和 `debt_failure`。簇开始时绑定具体经营单位，最多五年；单位提前失效或超过截止年龄时播放包含退租、设备、库存或品牌支持变化的具体结尾。

活动事件簇同时最多两个且不能占用同一领域；旧 `arcs` 仍保留给尚未迁移的轨道，事件簇与旧链不能同时占用同一 lane。融资扩张和财富顶点继续留在旧经营链，未并入本轮开店簇。

Schema 8 会清除 v0.5.4 及更早版本的未完成人生，保留人生档案、图鉴、设置、统计、已见内容和最近种子。研究档案位于 `docs/research/v0.5.5-shop-episodes.md`。

## v0.5.6 事业转换事件簇

`public_exam` 使用 `decision_017`—`decision_018` 表达报名资格、笔试面试及录用／再考／退出，截止期为两年。`layoff_reemployment` 使用 `decision_011`—`decision_012` 表达解除材料与重新落脚，覆盖内部转岗、同领域再就业、过渡工作、培训转岗和长期求职，截止期为两年。`career_break` 使用 `decision_040`—`decision_042` 表达资金来源、一年后生活与继续／低强度收入／返工，截止期为三年。

三个轨道上其余尚未迁移的选择文案仍保留，但不再组成旧四节点长链；长期公共职业、一般受雇工作和不工作状态继续由普通事件表达。公务员招录与裁员再就业共用 `career` lane，不能并行；主动不工作使用 `lifestyle` lane，仍受同时最多两个事件簇的总限制。

运行时增加三类事件簇名称、招聘单位／原用人单位绑定、明确的超期与状态失效结尾，并让强制结尾时间线回到真实内容轨道。版本仍为 Schema 8，内容修订升至 13；根据现行发布策略，v0.5.5 的未完成人生会在版本变化时清除，跨局记录继续保留。研究档案位于 `docs/research/v0.5.6-事业转换.md`。

## 尚未完成

下一批明确留下的中文内容是：

- 44 个家庭秘密
- 结局标题、总结和判词

这些内容目前能运行，但仍有批量模板或较抽象的说明。接手时应先读实际源文件，确认哪些文字仍由生成器拼接，再决定本轮范围。不要把文案任务顺手扩成机制重构或数值调整。

数值平衡、危机强度、结局辨识度和重开欲望仍需人工试玩判断。当前自动测试只证明数据契约和核心路径连通，不代表主观体验已经完成。

## 存档与发布规则

- 存档键继续使用 `life-unloaded-2026-v1`。
- 同版本刷新应恢复当前人生及所在开局阶段。
- 版本或 schema 变化时，不保留旧版本未完成的人生；人生记录、图鉴、设置、统计、跨局新鲜度和种子记录继续保留。
- “清除全部数据”只清理本游戏使用的 `life-unloaded-2026-*` 存储。
- GitHub Pages 直接发布 `main` 中的静态文件，没有构建产物。
- 版本号必须同时核对 `index.html`、`game.js`、生成器、`data.json`、README、测试断言和导出文件名。
- 推送新版本后应直接读取线上 `index.html`、`game.js` 和 `data.json`，确认页面、运行时和数据版本一致。

## 下一窗口先做什么

先执行只读核验：

```powershell
Get-Location
git status --short --branch
git branch --show-current
git remote -v
git log -5 --oneline --decorate
git rev-parse main
git rev-parse origin/main
```

然后完整阅读：

```text
README.md
AGENT_HANDOVER.md
progress.md 的最新章节
index.html
game.js
tools/generate-v5-data.mjs
content/zh-CN/
tests/v5-language-contract.mjs
tests/v5-validate.mjs
```

保留用户已有改动。确认工作区、分支和远端关系后再创建新分支，不要直接在 `main` 开发。若要声称线上版本有效，需要重新读取 Pages 的 `index.html`、`game.js` 和 `data.json`，不能沿用本文件的旧结论。

## 常用验证

本地启动：

```powershell
python -m http.server 8765
```

静态检查：

```powershell
node --check game.js
node --check tools/generate-v5-data.mjs
node tests/v5-validate.mjs
node tests/v5-state-contract.mjs
node tests/v5-language-contract.mjs
node tests/v5-employment-language-smoke.cjs
```

涉及数据时，生成器应连续运行两次并确认第二次输出稳定。涉及运行时或移动端交互时，再执行一次相关浏览器核心路径；不要用大规模人生模拟代替人工试玩。
