# 《人生尚未加载 · 2026》版本进度

本文件只保存已经发生的版本历史，不构成当前授权。当前状态和下一步见 `AGENT_HANDOVER.md`。

## 2026-08-15 · v0.6.11 Revision 31 已发布

- 按 DeepSeek V4 Pro 第四轮全库报告、两份综合审计和三层独立验收重新核对当前源码；最终整合 31 个生成数据文案与 5 个运行时中文字段，没有按模型整批接受。
- 定点清理医疗、债务与担保的记录腔，拆开赌博、酒精、游戏、购物和药物五类习惯的共用收束骨架；保留已经成立的黑色幽默、结局和家庭秘密。
- 修正担保事件作者槽位登记，保持 `decision_107` / `echo_107` 固定身份；新增专项回归断言。保持 requirements、effects、route、phase、年龄、数值、选项顺序、Schema 和存档结构不变。
- Content Revision 从 30 升至 31；数量仍为 910 个事件、205 个选择面板、62 个 episode、214 条卡牌互动和 72 张卡牌。
- 正式生成器连续两次产物一致，`data.json` SHA-256 为 `f5243edb1c8b2d28b28c695e0ff8f652b2a2356f35da322da0194f3452aaedd3`。`node smoke.js --full` 全部通过，320×568、360×640、360×773 代表路径控制台错误为 0。
- `legacy/0.6.11` 前移到 Revision 30 公开提交 `95ac6d6`；Revision 31 随 `main` 由 GitHub Pages 发布。

## 2026-08-13 · v0.6.11 Revision 30 已发布

- 合并 GPT 5.6 Sol 与 DeepSeek V4 Flash 的第四轮独立全库复盘：两边候选都逐项核对当前状态、route、阶段和字段权限，最终形成 181 个生成后可见字段变化，没有按模型整批接受。
- 保持玩法、ID、选项顺序、effects、路线、Schema 与存档结构不变；Content Revision 从 29 升至 30。
- 首页定位恢复为“出身决定起点，选择决定命运”；出身卡把四段起点说明收紧为一条优势和一条压力；属性页删除多余说明并调整留白。
- `CopyWriting_Guideline.md` 明确区分界面文案与正文：界面先服务扫读和操作，正文才承担人物、处境与变化。
- 生成器连续两次运行无差异，`data.json` SHA-256 均为 `bfa03c4ad2d38129f1dec9747b1b6fc7c48d63fdaa643caa10d1e9161b375e7c`；数量仍为 910 个事件、205 个选择面板、62 个 episode、214 条卡牌互动和 72 张卡牌。
- `node smoke.js --full` 全部通过；额外检查 320×568 的首页、出身和属性分配路径，横向无溢出、控制台错误为 0。
- `legacy/0.6.11` 固定在旧公开提交 `a7ecd8c`；Revision 30 功能发布提交为 `3db37f9`，随 `main` 由 GitHub Pages 发布。

## 2026-08-12 · v0.6.11 已发布

- 收口 episode 选择／结果页面、旧存档重复处境、卡牌可选说明和状态抽屉内部数字展示。
- 用户人工转交 DeepSeek V4 Pro／V4 Flash 完成三轮全库审阅；Codex 5.6 Sol 随后完成独立全库复核，Codex 对事实和运行路径作最终判断。
- 保持 910 个事件、205 个选择面板、62 个 episode、214 条卡牌互动和 72 张卡牌；Schema 13，Content Revision 29。
- 最终全库账本共 3879 个玩家可见字段：196 项已整合、3152 项保留、527 项新增覆盖并复核、4 项公共呈现层收口。
- 正式生成器最终双跑 SHA-256 均为 `b44740be04f545eba79eb16eb826bad3652191e72fda1add95dbee6686536209`。
- 最终 `node smoke.js --full` 的 syntax、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement 全部通过；360×773、360×640、320×568 控制台错误为 0。
- `legacy/0.6.10` 固定并推送到 v0.6.10 发布提交 `b84b480`；v0.6.11 随 `main` 推送并由 GitHub Pages 发布。
- 功能发布提交为 `40605a3`；Pages 构建成功，线上 `index.html`、`game.js`、运行时合同与 `data.json` 均已和本地核对一致。

## 2026-08-10 · v0.6.10 已发布

- 新增独立 social 轨道 40 条内容：24 beat、8 decision、8 consequence；正式数据达到 910 个事件，并新增两项 social 图鉴。
- 复用 `people` 保存两个终身持续关系槽位，区分真朋友、人脉广、主动独处和被动孤独；没有维护条、自动衰减、行动点或完整 NPC 模拟。
- 落地稳定结果、同人进入约会、就业 referral、朋友合住／短住与有限危机支持；所有桥接继续服从伴侣、就业、住房、债务、健康和照护硬条件。
- 生成器正式双跑一致，`data.json` SHA-256 为 `0bdb62d2a09e75b9183fa9d3d95dd4190b1cb1309cd63c231b40e2401df390b3`。
- 发布档 `full` 覆盖 syntax、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement；三种窄屏控制台错误为 0，独立审核无 P0/P1。
- `legacy/0.6.9` 固定并推送到 v0.6.9 发布提交 `6f9a764`；v0.6.10 随 `main` 推送并由 GitHub Pages 发布。

## 2026-08-09 · v0.6.9 已发布

- 完成事务式选项结算、同龄 episode 合并关闭、住房临时居住、担保债务绑定、人物年龄、生育载体、海外求职、半退休和遗产修复。
- 完成 44 条家庭秘密、20 条黑天鹅、五类成瘾文案及 206 个卡牌互动的逐事件收口，并补齐主要无障碍语义。
- 保持 870 个事件与既有事件／图鉴 ID；逐事件验收表共 1384 行，三代理混排复核发现项已回到作者源码修正。
- 生成器双跑一致；`data.json` SHA-256 为 `4dd9521f59e7d8e08aa48fb0447e525a5ecacc4a885a8f6cc5aa2c1d93d41d7d`。
- 当前版本全量回归覆盖 syntax、correctness、core-browser、family-education、episode、university-career、card-interaction 与 debt-enforcement，浏览器控制台错误为 0。
- 新增根目录 `smoke.js` 作为统一人工入口：默认核心检查，`--fast` 秒级语法检查，`--full` 发布前全量。

## 已发布版本账本

| 版本 | 发布状态 | 主要范围 |
|---|---|---|
| v0.6.11 | 已发布 | 全库文案、Episode 呈现、状态面板与创建流程 UI 收口；Schema 13／Revision 30 |
| v0.6.10 | 已发布 | 社会交往与人生联系；Schema 13／Revision 28；持续朋友、稳定结果与显式跨系统桥接 |
| v0.6.9 | 已发布 | 全量文案与机制修复；Schema 13／Revision 27；事务结算与精简回归入口 |
| v0.6.8 | 已发布 | 住房与居住选择；Schema 12／Revision 26；住房统一写入与负担判断 |
| v0.6.7 | 已发布 | 晚年生活；Revision 25；可复发日常与退休转段 |
| v0.6.6 | 已发布 | 债务执行与生活后果；Revision 24 |
| v0.6.5 | 已发布 | 生育计划、怀孕决定与单身收养；Revision 23 |
| v0.6.4 | 已发布 | 首份工作与职业状态桥接；Revision 22 |
| v0.6.3 | 已发布 | 教育年龄、复读与海外重申；Revision 21 |
| v0.6.2 | 已发布 | 正确性与内容合同护栏；Revision 20 |
| v0.6.1 | 已发布 | 可读、可审查的运行时源码基线 |
| v0.6.0 | 已发布 | 卡牌真正参与选择；Schema 11 |
| v0.5.12 | 已发布 | 本科—研究生—首份工作；Schema 10 |
| v0.5.11 | 已发布 | 全量生活化文案 |
| v0.5.10 | 已发布 | 原生家庭与国内外升学；Schema 9 |

## 长期未完成项

数值平衡、危机强度、结局辨识度、时间线连贯感和重开欲望仍需人工试玩判断。自动检查证明合同与代表路径，不代替玩家体验。
