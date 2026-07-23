# 《人生尚未加载 · 2026》开发交接

更新时间：2026-07-24

这份文件用于下一次 Codex 窗口接手项目。开始工作前仍要重新检查本地文件和 GitHub；下面记录的是交接时已经核对过的状态，不代替现场核验。

公开的 `README.md` 只面向玩家和其他访问项目的人。生成器、测试、分支、部署、接手步骤和 AI 工作边界都写在本文件中，不要再放回 README。

## 仓库与版本

- 正确的本地仓库：`C:\Users\Administrator\Documents\Life unloaded`
- GitHub：<https://github.com/jayden2young-netizen/life-unloaded-2026>
- 在线版本：<https://jayden2young-netizen.github.io/life-unloaded-2026/>
- 当前开发版本：v0.5.9
- 上一个已发布版本：v0.5.8
- `schemaVersion`：8
- `contentRevision`：16
- localStorage 键：`life-unloaded-2026-v1`
- `main` 开发基线：`c5d9a8d122eb1b78ebd834ff75d0a29f02bead69`
- 基线提交说明：`Merge pull request #17 from jayden2young-netizen/codex/v0.5.8-family-migration`
- 开发分支：`codex/v0.5.9-full-track-cleanup`
- 基线版本：`v0.5.8`

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
- 124 个选择事件
- 124 个选择特定长期后果
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

## v0.5.7 危机与恢复事件簇

本版新增 `guarantee_recourse` 与 `acute_illness`，并把五类成瘾分别拆成形成、治疗、复发三个短事件簇。担保按签署、违约、追偿推进，三年内以追回、书面重组、关系破裂或债务失败收口；急性疾病按检查、治疗、康复、结果推进，四年内落到治愈、管理、功能受限或退出治疗。

成瘾事件共15簇、30个选择：首次接触不直接诊断，治疗入口要求已有控制受损或功能损害，复发入口要求已有至少一年恢复记录。状态抽屉使用具体中文名称，超期与状态失效都有物件和动作明确的替代结尾。版本仍为 Schema 8，内容修订升至14；v0.5.6 未完成人生会按版本策略清除，跨局记录保留。研究档案位于 `docs/research/v0.5.7-危机与恢复.md`。

验证结果：生成器连续两次 SHA-256 均为 `BF31FE903107BAAD50D37892211C3FA7F228F4FF1599C019958383FCCEB80397`；662节点数据契约、状态门槛、语言检查和一条系统 Chrome 核心路径通过。浏览器路径覆盖三种窄屏、同龄三卡、刷新恢复、lane 互斥、担保与疾病全部结尾、五类成瘾三簇代表结尾及三类强制结尾，控制台错误为0；没有运行批量人生模拟。

## v0.5.8 家庭与迁移事件簇

远程、伴侣和子女轨道的六条旧四节点链已删除，改为14条独立短簇：关系建立、婚姻危机、离婚、复合、晚年相伴；成为父母、收养、入学、青春期边界、成年子女边界；第一份远程合同、平台依赖、海外许可和建立基地。

`relationship` 与 `parenting` 使用不同 lane；当前伴侣由 `relationships.activePartnerId` 绑定，分开后保留 `lastPartnerId`，不会把前任误当作当前伴侣。入学、青春期和成年边界绑定具体孩子并按实际年龄开启。新簇的中文名称、放弃路线、年龄优先级和超期／失效文案保存在 `data.json` 的 `episodeCatalog`；普通远程工作、一次关系摩擦或一次生育延迟不会自动升级为危机。

版本仍为 Schema 8，内容修订升至15；v0.5.7 未完成人生按现行策略清除，跨局记录保留。研究档案位于 `docs/research/v0.5.8-家庭与迁移.md`。当前生成数据为400个年度事件、124个选择、124个选择特定回响和20个黑天鹅，共668个节点。

验证结果：生成器连续两次 SHA-256 均为 `86200307E21CC7E526AC64DE0037E1829FB33A11B1A794DF872B9DEED31B1B0D`；668节点数据契约、状态门槛、语言检查和一条系统 Chrome 核心路径通过。浏览器路径覆盖三种窄屏、刷新恢复、同龄连续卡、当前伴侣绑定、到龄入学、单阶段收口、两簇上限和平台具体失效结尾，控制台错误为0；没有运行批量人生模拟。

## v0.5.9 全轨收口

教育轨道新增 `secondary_diversion`、`university_interruption`、`professional_certification` 和 `adult_reeducation`；经营轨道保留 `shop_opening`，新增 `business_expansion` 与 `wealth_peak`；晚年轨道新增 `retirement_transition`、`parental_inheritance`、`long_term_care` 和 `will_planning`。这些事件簇分别在1—4年内收口，长期教育、经营、退休、继承、照护与遗嘱结果继续保存在运行状态中，不再靠几十年活动链维持。

教育、经营和晚年剩余五条旧四节点链已经删除，运行时的 `run.arcs`、`arcSlots`、`arc` 与 `arcExit` 接口也已清除。15岁重复教育转场删除，18岁首次方向选择保留；一般受雇、公共职业和财务轨道中会绕过新簇直接退休或立遗嘱的旧选择已改写为合同交接、调动档案和债务盘点。父母遗产绑定真实已故父母；企业扩张要求已有可运行业务、经营能力和权益，财富顶点要求企业已达到全国或全球规模。状态抽屉新增退休、继承、照护和遗嘱长期状态。

版本仍为 Schema 8，内容修订升至16；v0.5.8 未完成人生按现行版本策略清除，人生档案、图鉴、设置、统计和跨局记录保留。研究档案位于 `docs/research/v0.5.9-全轨收口.md`。当前生成数据为400个年度事件、124个选择、124个选择特定回响和20个黑天鹅，共668个节点。

验证结果：生成器连续两次 SHA-256 均为 `1E52CFA76540EAB22D2EB77D3C941E7449D07A90B749A6AD60818E26B2A50CA0`；JS语法、数据契约、57项状态门槛和语言检查通过。一条系统 Chrome 核心路径覆盖10条新簇的40个结尾、同龄三卡、选择与结果刷新恢复、两簇与同 lane 限制、v0.5.8 存档迁移，以及360×773、360×640、320×568的连续卡和状态抽屉；六张截图在动画完成后人工目检通过，控制台错误为0，没有运行批量人生模拟。

## 尚未完成

v0.5.x 事件簇迁移范围已经完成。当前分支仍需经过 PR 审阅、用户确认后才能合并和部署；不要自动合并。

数值平衡、危机强度、结局辨识度、时间线连贯感和重开欲望仍需人工试玩判断。当前自动测试只证明数据契约、定向结局和核心路径连通，不代表主观体验已经完成。后续若调整内容，应根据真实试玩反馈建立独立小版本，不要把反馈修正和架构升级混在一起。

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

保留用户已有改动。若 v0.5.9 PR 尚未合并，先确认审阅和验证状态；未经用户确认不要合并。若已合并，需要重新读取 Pages 的 `index.html`、`game.js` 和 `data.json` 后才能声称线上版本有效，不能沿用本文件的旧结论。下一轮内容或机制开发必须从当时最新 `main` 新建 `codex/` 分支。

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
