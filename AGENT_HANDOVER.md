# 《人生尚未加载 · 2026》开发交接

更新时间：2026-07-28

这份文件用于下一次 Codex 窗口接手项目。开始工作前仍要重新检查本地文件和 GitHub；下面记录的是交接时已经核对过的状态，不代替现场核验。

公开的 `README.md` 只面向玩家和其他访问项目的人。生成器、测试、分支、部署、接手步骤和 AI 工作边界都写在本文件中，不要再放回 README。

## 新窗口必读

任何 agent 开始玩家可见中文的写作、改写或审阅前，必须完整阅读：

1. `CopyWriting_Guideline.md`
2. `docs/project-context.md`

`CopyWriting_Guideline.md` 是本项目中文文案的强制规范，不是可选风格建议。它同时约束字段事实
权限、地区和制度辨识、人物声音、海外华人生活、黑色幽默、工程边界与验证流程。

## 仓库与版本

- 正确的本地仓库：`C:\Users\Administrator\Documents\Life unloaded`
- GitHub：<https://github.com/jayden2young-netizen/life-unloaded-2026>
- 在线版本：<https://jayden2young-netizen.github.io/life-unloaded-2026/>
- 当前开发版本：v0.6.2 本地实现已完成，尚未发布
- 当前本地开发版本：v0.6.2
- 当前 `main` 基线版本：v0.6.1
- 下一规划版本：v0.6.3 教育年龄、复读与海外重申
- 当前规划范围：v0.6.2—v0.6.7 已完成路线审计与文档重构
- `schemaVersion`：11
- `contentRevision`：20
- localStorage 键：`life-unloaded-2026-v1`
- v0.6.0 功能提交：`82beb1432e3bad1df2c222735cce493e3c34495f`
- 功能提交说明：`feat: ship v0.6.0 card participation`
- 当前开发分支：`codex/v0.6.2-correctness-guardrails`
- 当前基线分支：`main`
- 本轮起点版本：`v0.5.12`

线上与远端已于2026-07-28确认发布 v0.6.1。功能提交为 `2a3910c50883b09c8907e98f91aa2116737852fd`；`legacy/0.6.0` 固定在发布前的 `main@4b23df7a738d54862534289e334319767aa8e69b`。最终提交、ahead/behind、当前分支和线上状态仍必须以新窗口现场执行的 Git 与 Pages 检查为准。

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

2026-07-28 额外核对：

- v0.6.0 在 `codex/v0.6.0-card-participation` 完成，功能提交为 `82beb14`；发布时直接将 `main` 快进到包含该提交的最新文档提交。
- `legacy/v0.5.12` 固定指向发布前基线 `9fc7da5`。
- 根目录本地 `roadmap/` 已按 Git ignore 管理，共有一份总体策略和 v0.6.0—v0.6.7 八份逐版本文件；其中 v0.6.0 与 v0.6.1 已发布，v0.6.2 已完成本地实现但尚未发布，v0.6.3—v0.6.7 仍待开发。roadmap 不上传 GitHub，新窗口应在同一 checkout 读取。
- v0.6.x 规划审计只更新文档，没有修改游戏代码、数据、玩家文案或测试。路线采用两个工程版本打底，再按教育、首职、家庭、债务、整体验收完成原五个内容版本。
- 模型委托已经锁定：v0.6.1、v0.6.2、v0.6.7 使用 GPT-5.6 Sol High；v0.6.3—v0.6.6 使用 GPT-5.6 Terra High；Luna High 不作为主执行者。
- 独立 worktree 中仍有实验分支 `investigate_card_game_mechanics@9efa6dc`。它包含不同架构和额外机制，不是 v0.6.0 发布来源，不要整体合并回 `main`。

## 项目结构

游戏仍是直接部署到 GitHub Pages 的静态项目，没有框架、npm 构建、外部字体、CDN 或运行时接口。

```text
index.html                         页面入口
style.css                         黑色移动端界面
game.js                           状态账本、因果引擎、存档与流程
data.json                         生成后的内容数据
content/zh-CN/ui.mjs              核心界面中文
content/zh-CN/card-interactions.mjs 卡牌—选项显式交互
content/zh-CN/tracks/*.mjs        十二条人生轨道中文
tools/generate-v5-data.mjs        当前数据生成器
tests/                            当前核心浏览器检查
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

- 408 个年度事件
- 162 个选择事件
- 162 个选择特定长期后果
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

## v0.5.10 原生家庭与国内外本科入学

家庭原型在原有职业与账面基础上增加资源、教育资本、照顾者可用时间、父母在场、住房稳定、情感安全和教育预算。父母职业不再只是出生页标签：教师、医护、平台劳动、技术岗位、经营等会以有限幅度改变教育信息、可用时间、工作稳定和教育预算，再与家庭关系共同形成成长证据。2、7、11、14岁的固定家庭节点按资源与关系组合选择具体生活事件，新增资源充足但关系不安全的独立路线；贫困不自动等于伤害，富裕也不自动等于陪伴或安全。

成长状态保存学习习惯、出勤、教师与同伴支持、自我求助、照料负担、创伤负荷、语言准备和路线信息。校园内容覆盖支持、霸凌、教师伤害、转班／转学、继续受损和恢复；`school_harm` 是独立两阶段短簇，忍耐不会得到正向奖励。中考 `secondary_diversion` 会读取真实准备度；普高等核心路线保持可见但门槛不足时禁用并解释，额外学校路线只有在此前接触后出现。

旧的统一18岁方向选择和碎片化 `university_interruption` 已删除。`undergraduate_application` 使用 education lane，四阶段分别处理国内／海外／双轨准备、考试与申请结果、录取后的资金、一般性入境与启程及最终报到。提交不再保证录取，海外结果区分直接录取、条件录取和落选；国内首年费用或资助必须落实，海外资金不会提前写成入境资格完成。国内和海外可以并行申请，但最终只写入一个 `enrollmentRegion`。`education.nextStage='undergraduate'`、成长证据和申请记录供下一版继续处理大学课程、社团、研究生和就业，本版不自动模拟本科毕业。

版本升至 Schema 9、内容修订17；Schema 8活动人生会清除，人生档案、图鉴、设置、统计和稳定ID的跨局记录保留；会随生成顺序漂移的旧 `beat_NNN`／`decision_NNN`／`consequence_NNN` 已见计数会清除，避免套到新事件。研究档案位于 `docs/research/v0.5.10-原生家庭与国内外升学.md`。生成数据为408个年度事件、127个选择、127个选择特定回响和20个黑天鹅，共682个节点。

验证结果：生成器连续两次 SHA-256 均为 `D35D8359235C3C4D1265FC35889C7D0B3ECA9EC9F1757D64A75486F93DA13381`；JS语法、682节点数据契约、78项状态语义门槛和语言检查通过。一条系统 Chrome 核心路径覆盖Schema 8活动局清除且稳定跨局记录保留、资源紧张且不安全／资源充足且父母在场／资源充足但关系不安全的童年节点、核心路线锁定与特殊路线隐藏、国内资金不足、国内本科报到、海外本科报到、落选与延期、开始阶段后的自然调度、同龄选择与结果刷新恢复、每阶段一条时间线，以及360×773、360×640、320×568；两张有效截图人工目检通过，控制台错误为0，没有运行批量人生模拟。

## v0.5.11 全量生活化文案

十二条人生轨道、事件簇情况卡、选择、即时结果、长期回响、家庭节点、家庭秘密、黑天鹅、强制结尾、图鉴提示和部分运行时提示已按同一套生活化标准重写。迁移以 v0.5.10 `main` 为工程基线，没有引入来源分支的运行时调试接口或浏览器测试重构。

事件、卡牌、选项和路线的ID、顺序、年龄、条件、效果、数值、概率及数据结构保持不变。五处方向错误的中文引号已修正；`content/zh-CN/cards.mjs` 与来源分支完全相同，因此本轮没有不存在的卡牌差异可迁移。

版本升至 v0.5.11、内容修订18，Schema 保持9。v0.5.10未完成人生按现有版本规则清除，人生档案、图鉴、设置、统计、稳定跨局记录和最近种子继续保留。

文案覆盖递归核对了来源分支的1590个字符串差异，其中1586项逐字一致；其余4项是生成数据中的客观引号纠错，另有1项运行时引号纠错。除字符串、版本和内容修订外，ID、顺序、年龄、阶段、角色、条件、效果、路线、数值、概率和数组长度没有差异。生成器连续两次 SHA-256 均为 `9CB70541B90778BCF59E244C65987FCC3D4F31B2EAB63CD04350019BEFF08677`。

验证结果：JS语法、682节点数据契约、78项状态语义门槛和语言检查通过。系统 Chrome 核心、家庭教育、就业语言和全轨道 smoke 均通过，覆盖 v0.5.10 未完成人生清除、稳定跨局记录保留、漂移 `beat_NNN` 清理、选择与长期回响、事件簇三卡、强制结尾、清除数据、结局和三种窄屏；控制台错误为0。测试首次失败均先核对验收器，确认是旧文案、旧ID或旧fixture后只修正测试，未为通过 smoke 修改游戏机制。出生、时间线、情况／选择／结果卡、强制结尾、状态抽屉和结局截图已人工目检，没有运行批量人生模拟。

合并前 hot fix 修复了三个实际试玩问题：首次入职现在写入“企业项目岗位”及对应雇主、行业，不再以“尚未进入社会”领取工资；产检单只会在有现实伴侣且已进入备孕计划时出现，原来错误绑定学龄子女的异常产检改为孩子体检；关系建立后的伴侣绑定补齐存活字段，不再每次恋爱后误触发分手，真实失效时会把伴侣转为前任并将状态收口为单身。hot fix 后生成器连续两次 SHA-256 均为 `A7E2CEF74EA53D5BFCB4EAD6D3B07B58D6CD6B98641A0281EED18B21210D01ED`；数据、状态、语言及就业和家庭关系浏览器回归通过，截图人工目检通过，控制台错误为0。

## v0.5.12 本科—研究生—首份工作

- 2026-07-26: 从 `main@2076ea3` 新建 `codex/v0.5.12-university-to-first-job`。版本升至 v0.5.12、Schema 10、content revision 19；Schema 9 活动人生清除，跨局档案、设置、统计、稳定已见记录和最近种子保留。
- 2026-07-26: 新增国内本科、美国本科、欧洲本科、休学／转学、研究生申请、国内／美国／欧洲研究生和首份工作共12条短期事件簇。教育主线使用 `education` lane，海外生活使用 `community` lane；没有重写国内外本科申请，也没有改 UI/CSS。
- 2026-07-26: 本科直接就业与研究生就业分别消费课程、校园、实践和研究证据。研究生学历不会自动兑换高薪；方向过窄、经验不足、资金缺口、工作资格受限和持续求职都有独立结果。持续求职完成后仍可遇到普通岗位机会，不会永久卡在求职状态。
- 2026-07-26: 海外生活区分美国与欧洲教育制度、授课语言与社会语言、日常行政和合租习惯。同胞、本地与国际网络可以并存；歧视记录为环境压力，不进入录取或就业失败乘数。研究依据归档在 `docs/research/v0.5.12-本科研究生与首份工作.md`。
- 2026-07-26: 按 `CopyWriting_Guideline.md` 重新审阅并改写12条事件簇及强制收尾，清除流程报告腔、地区串线和提前生成实践、面试或录用的问题。最终生成器连续两次 SHA-256 均为 `702AA4C25DE0B4650C1024D9FAFB81FCC9A27AA129BF2928126880C48142B8A0`。
- 2026-07-26: 数据为408个年度事件、162个选择、162个选择特定长期后果和20个黑天鹅，共752个节点。定向 smoke 覆盖本科直就业、读研、休学复学、转学、申请失败、资助缺口、工作资格受限、持续求职、海外关系网和三种窄屏；现有四项核心 smoke 继续通过，控制台错误为0。没有运行批量概率模拟。
- 2026-07-26: PR #22 已合并，`main` 为 `8ed52605cde28fcf30ce15c91484873b5767381a`；GitHub Pages 已返回 v0.5.12、Schema 10、content revision 19，并命中最终改写文本。

## 尚未完成

数值平衡、危机强度、结局辨识度、时间线连贯感和重开欲望仍需人工试玩判断。当前自动测试只证明数据契约、定向结局和核心路径连通，不代表主观体验已经完成。后续若调整内容，应根据真实试玩反馈建立独立小版本，不要把反馈修正和架构升级混在一起。

## v0.6.0 卡牌参与选择

- 版本升至 v0.6.0、Schema 11、content revision 20。Schema 10 活动人生会清除；人生档案、图鉴、设置、统计、稳定已见记录和最近种子保留。
- 72张既有卡仍在0、18、35、55岁各抽三选一，抽取时的一次性效果继续存在。卡牌进入 `run.cards` 后永久有效；同机制多卡按获得顺序取最早一张作为唯一主卡，不消耗、不叠加。
- 每个选择均有显式 `mechanicTags` 与 `cardInteraction`。卡牌可解锁信息入口、放宽软性资金门槛、补一段成本、压低一次风险或切换作者预写结果；事件年龄、学历、执业和现实资格门槛不得被卡牌绕过。
- 生成器验证12种机制均有至少8个选项、3个阶段和35／55岁后续用途；当前162个决策面板全部存在可能生效的交互。`CARD_INTERACTION_WITNESSES` 保留卡牌专属入口的声明式见证，验证失败会中止生成。
- 新增 `tests/v6-card-interaction-smoke.cjs`，覆盖五种交互模式、无卡兼容、同机制主卡、刷新不重复结算、Schema 10迁移和系统减少动态效果。四次抽卡弹层边框仅呼吸两次；`prefers-reduced-motion` 时保持静态。
- 选择弹层以“待生效”弱提示列出持有卡；实际生效时才在对应选项上显示卡名、具体改变和细边框，不改变无卡选择的层级。
- 游戏内全局“主菜单”只返回首页并保留当前人生；首页“重启人生”经过确认后重新进入出生流程，只清除当前人生，跨局档案、图鉴、统计和设置继续保留。
- 发布前已确认生成器连续两次无 diff、语法检查、v0.6 定向 smoke 与五个既有 smoke 均通过；360×773 和 320×568 移动端核心路径无控制台错误。

## v0.6.1 可审查源码基线

- 从本地 `main@4b23df7` 创建 `codex/v0.6.1-readable-runtime`。使用固定版本 Prettier 3.6.2 原地展开 `game.js`，从347行整理为3643行；仍由 `index.html` 直接加载，没有增加 `src/`、modules、bundler、`package.json` 或第二部署入口。
- 格式化前后 Prettier AST `--debug-check` 均通过；具名函数仍为155个，`rng`／`chance`／`weighted` 调用仍为17处，localStorage 键和全部既有调试接口保持不变。
- 新增 `tests/v6-runtime-equivalence-smoke.cjs` 与 v0.6.0 golden fixture。固定 seed `v061-readable-runtime-equivalence` 覆盖出生、随机属性、0岁抽卡、8次实际推进和 `decision_043_choice_1 + card_01` 卡牌互动；14个检查点完全一致，最终 `rngState` 为 `783991599`。
- 版本升至 v0.6.1，Schema 保持11，content revision 保持20。生成器连续两次 SHA-256 均为 `8CF2E0C8491CF43F20083FBF0CCCCA3C80CF6FC6FB76FE236F6D30683D2B8DF8`；删除 `version` 与 `gameVersion` 后，生成数据与 v0.6.0 的语义哈希完全相同。
- 26个 JS／MJS／CJS 文件语法检查通过；固定轨迹与六项既有 Chrome smoke 全部通过，覆盖360×773、360×640、320×568，控制台错误为0。就业 smoke 中一条首页旧文案断言已按当前正式源文案校正；这是验收器修正，没有修改游戏文案。
- 本轮没有修复主冲突加权、年度健康边界或其他 v0.6.2 问题，没有修改玩家内容、数值、状态契约、UI/CSS 或实验 worktree。功能提交 `2a3910c` 已推送到 `codex/v0.6.1-readable-runtime`；`main` 以 fast-forward 发布，未创建 PR 或合并提交。GitHub Pages 最新构建指向该提交，线上 `index.html`、`game.js` 和 `data.json` 均已核对为 v0.6.1／Schema 11／Content Revision 20。

## v0.6.2 正确性与内容完整性护栏

- 从 `main@32fb143` 创建 `codex/v0.6.2-correctness-guardrails`。新增共享内容合同，统一运行时与生成器的 operator、command、读写路径和比较语义；`game.js` 在请求 `data.json` 和恢复状态前加载合同，合同缺失时进入明确启动失败页。页面仍直接加载同一经典 `game.js`，没有 bundler 或第二入口。
- 主冲突权重只登记有正式内容证据的开放关系：`leisure→freedom`、`later→peace`、`health→body`；未登记关系保持中性。配置不要求覆盖所有冲突或轨道，也不是封闭合同，后续主干事件按证据增量补充。
- 年度结算在全部健康增减完成后、`syncDerived` 前将 physical 和 mental 限制到0—100；其他路径、扣减值和结算顺序未调整。
- 生成器写出前严格验证 command、读写 path、operator、有限数值、ID、引用、作者键泄漏和映射证据。validator 暴露了3条缺少数值、运行时原本按加0处理的无操作 `add`；经用户确认，只从生成器源定义删除这3条，没有补值或改动同一 choice 的其他效果。
- beat、decision、card、echo、卡牌互动和 witness 改用生成期作者定位与固定槽位。移动既有定义或插入已登记定义不会改变无关槽位，未登记定义会中止生成。作者键没有进入 `data.json`、存档、运行状态或公共接口。家庭债务范围由模糊正则改为显式三项名单，生成结果不变。
- v0.6.2 仍为 Schema 11、content revision 20。相对 v0.6.1，`data.json` 只有两个版本字段和上述3条无操作 command 删除；事件、卡牌、家庭、文案、ID、顺序和其他效果不变。最终 SHA-256 为 `1A2182D4B3CFC257EB6AEC3270468F9F00874DEF3BF363B78812D4B82A20F09F`。
- 本地验证通过：31个脚本语法检查；生成器连续两次稳定；护栏负例、operator子集、12检查点中性选择/RNG等价、合同加载前置与失败页、映射命中／中性、健康上下界；v0.6.1固定轨迹14检查点继续匹配。六项既有Chrome smoke全部通过且控制台错误为0。家庭教育smoke的无卡资金门槛原来受随机持有 `cashBuffer` 卡影响，已仅在该fixture显式清空卡牌，未改游戏。
- 当前改动尚未推送、合并或部署；线上仍是 v0.6.1。

## v0.6.x 后续规划

后续版本顺序已经完成审计并固定为：

1. v0.6.1：可审查源码基线。本地实现和验证已完成，等待用户审阅与后续 Git／发布决定。
2. v0.6.2：正确性与内容完整性护栏。修复已确认的主冲突加权和年度健康边界，解除生成器 index 语义，严格验证 command、path、operator、ID 和引用。
3. v0.6.3：教育年龄、复读与海外重申。
4. v0.6.4：首份工作与职业状态桥接。
5. v0.6.5：生育计划、怀孕决定与单身收养。
6. v0.6.6：债务执行与生活后果。
7. v0.6.7：跨系统验收、有限内容收口和一次 Sol High 级别的 v0.6.x 整体文案核对。

v0.6.2 允许的作者键只用于生成器内部稳定定位和作者配置。它不得输出到 `data.json`，不得进入运行时状态、localStorage、存档、历史、图鉴、统计、延迟后果、玩家可见数据或跨版本接口，也不得形成第二套通用身份系统。需要跨版本稳定身份时必须停止并另行研究。

v0.6.x 不实现完整稳定语义 ID 迁移、统一 provenance bus、Reactive Rules、复杂因果图、参数化后果引擎、Headless 大样本模拟或完整模块化构建链。这些方向只能在内容成熟并出现跨至少三个领域的重复因果证据后，作为 v0.7.x 研究问题重新评估。

v0.6.3—v0.6.6 的 Terra High 必须在每版交付可发布玩家文案，不能把模板化初稿全部留给最终版本。v0.6.7 的 Sol High 核对负责跨版本一致性、人物声音、敏感表达和残余模板债，保留已有好文案，不做无差别全量重写。

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
CopyWriting_Guideline.md
docs/project-context.md
progress.md 的最新章节
index.html
game.js
tools/generate-v5-data.mjs
content/zh-CN/
tests/v5-browser-smoke.cjs
tests/v5-employment-language-smoke.cjs
tests/v5-family-education-smoke.cjs
tests/v5-full-track-smoke.cjs
tests/v6-card-interaction-smoke.cjs
tests/v6-runtime-equivalence-smoke.cjs
```

保留用户已有改动。v0.6.1 已完成提交、推送、main fast-forward 与 Pages 部署；仍要现场核对 Git 和 Pages，不沿用本文件的旧结论。后续文案任务必须先完整阅读 `CopyWriting_Guideline.md`，并按当次授权分别判断提交、推送、PR、合并和部署。

下一窗口审阅 v0.6.2 或准备 v0.6.3 时，先读：

```text
roadmap/00-总体策略.md
roadmap/v0.6.2-正确性与内容护栏.md
roadmap/v0.6.3-教育年龄与重试.md
```

实验分支 `investigate_card_game_mechanics` 不是下一版本基线，不整体合并。先完成 v0.6.2 审阅与用户指定的 Git／发布动作，再从最新 `main` 单独开始 v0.6.3；不得把 v0.6.3 内容回填到 v0.6.2 护栏 diff。

## 常用验证

本地启动：

```powershell
python -m http.server 8765
```

静态检查：

```powershell
node --check game.js
node --check tools/generate-v5-data.mjs
node --check tests/v6-runtime-equivalence-smoke.cjs
node --check tests/v6-card-interaction-smoke.cjs
node --check tests/v5-browser-smoke.cjs
node --check tests/v5-employment-language-smoke.cjs
node --check tests/v5-family-education-smoke.cjs
node --check tests/v5-full-track-smoke.cjs
node --check tests/v5-university-career-smoke.cjs
```

浏览器检查（先保持本地服务器运行）：

```powershell
node tests/v6-runtime-equivalence-smoke.cjs
node tests/v6-card-interaction-smoke.cjs
node tests/v5-browser-smoke.cjs
node tests/v5-employment-language-smoke.cjs
node tests/v5-family-education-smoke.cjs
node tests/v5-full-track-smoke.cjs
node tests/v5-university-career-smoke.cjs
```

涉及数据时，生成器应连续运行两次并确认第二次输出稳定。涉及运行时或移动端交互时，再执行一次相关浏览器核心路径；不要用大规模人生模拟代替人工试玩。
