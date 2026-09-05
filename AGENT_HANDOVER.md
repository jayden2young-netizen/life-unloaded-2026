# 《人生尚未加载 · 2026》当前交接

更新时间：2026-09-03。这里只记录换窗口或换电脑后立即需要的当前事实，不保存版本历史和通用开发规则。

## 当前快照

| 项目 | 当前事实 |
|---|---|
| Git | `main` 为 v0.7.0 发布线；功能整合来自临时分支 `codex/fable-v070-integration`，分支暂保留，不自动删除 |
| 版本 | 本地 v0.7.0／Schema 14／Content Revision 37；公开版本仍为 Revision 36 |
| 内容 | 965 个事件：517 beat、214 decision、214 consequence、20 blackSwan；83 张卡牌、30 种家庭、44 个秘密、90 个结局标题、42 个图鉴条目 |
| 数据 | 本地 `data.json` SHA-256：`3d50310fca4552cebfa0a17cb0da5e1dbda4dde8f67d32fb74d6925f99b9a37a`；公开 Revision 36 为 `b4dbfff5dbaf81fe4e2316b1deffffc0fe6e4445edcaee04fa007155e31eb5da` |
| 旧版 | `legacy/0.6.13` 在本地与 origin 均固定到 `9bc9dc7` |
| 发布 | v0.7.0 已合并到 `main`、推送并由 GitHub Pages 发布；本轮已核对远端 ref、Pages 目标提交和四个线上产物 |
| 验证 | 本地 Revision 37 正式生成器双跑 byte-stable，`node smoke.js --profile episodes,debt` 全部通过；Review Center 的 0、3、4、23、33、38、52 岁保存现场完成回放，360×773 未见横向溢出。公开 Revision 36 发布前的 `node smoke.js --full` 八组仍为全部通过 |

## 本地 Revision 37（已提交、未推送、未发布）

- 急性疾病四阶段增加受合同约束的儿童展示覆盖；成人前两阶段改为批准稿，Revision 36 若停在该 episode 的选择页，只刷新当前年龄文案，不重放事件或结算。
- `decision_108` 只在上一轮确有年度缺口且现金不足以再覆盖同等缺口时进入；住房吃紧提示改为按收入波动、高固定负担或薄余量显示事实化短句。
- 65 岁前仅 `source='age'` 的通用死亡风险按 seed 与年龄稳定选择具体死因；健康、习惯来源及 65 岁后逻辑不变。
- 出生压力、准备费用和年假态度按本轮批注修正；事件 ID、episode 阶段、route、effects、选项数量和 Schema 均未改变。
- README 继续表示公开 Revision 36。Revision 37 已提交到本地 `main`，尚未推送或发布。

## v0.7.0 已完成

- 普通选择目标为种子稳定的 22—28，按人生阶段分配；童年与 75 岁后均保留合法选择机会。pity 年龄与候选寿命同种子确定，黑天鹅没有保底配额，recurrence 同组间隔仍为三年。
- Schema 14 增加态度、属性提交、亲人离世时间、平台／经营年数和跨局开关；升级时清除旧活动人生并保留档案、图鉴、设置、seen 与 stats。
- 跨局接入事实化上一局、动态收集进度、种子重开和默认关闭的隔世回声；不显示原始六轴，也不给数值收益。
- 十二类主题结局优先于无主题早亡；near-miss 只在确有一个事实缺口时出现，`wealthApex` 仍不提示“差一点”。
- `parent_loss` 按 214→154→215→216 推进并绑定具体父母与真实间隔；第二位父母离世不会重置已开始的 episode。
- 60 条态度微选择支持选择、跳过、刷新恢复和时间线附注；不足五次不生成性格侧写。
- 六项 raw attrs 可确定性漂移，presence／drive／composure 同步派生；十张代价卡的持续效果从持卡动态派生并限制在明确事实路径。
- C1—C9 与 N1—N7 候选经过当前 requirements、effects、actors、状态所有权与中文规范复核后整合；旧 ID 和作者槽位通过 `replaces` 保持稳定。
- 三轮真实 UI 试玩的六个 P1 已修复：首位父母离世当年同步、职业场景有限集合、职业空档保留继续工作权与原领域回归、本科旧程序清理、childfree 统一承认、年度队列出队复验。
- 国内本科单一路线不再重复询问申请组合；录取结果、家庭支付与资助按实际状态反馈。无 offer 的求职阶段自动进入继续寻找，不再展示全禁用弹窗；朋友求助提示明确求助对象。
- 活动人生时间线保留全部新记录并可向上回看，滑动不触发年龄推进；结局页在手机和桌面视口均可滚到底部操作。
- 发布回归修复了隐藏自动 episode 已结算后继续消费同年队列的问题；现有 `university-career` fixture 直接保护刷新恢复和单次推进边界。

## 本地边界

- `.claude/`、`docs/0728+Claude+Fable+5_Third_party_analysis/`、`docs/0816+Claude+Fable+5_Third_party_edit/` 继续作为用户本地未跟踪资料，不移动、不删除、不纳入 Git。
- `_bmad-output/`、`roadmap/`、`start-internal-review.command` 与 `_bmad-output/internal-review/` 继续保持本地忽略；试玩标注系统和 Review Center 不进入公开游戏、提交或 GitHub Pages。
- 正式 `start-local-play.command` 保持原入口。需要本地评审时使用忽略的 `start-internal-review.command` 重新启动。

## 仍需验证

- Revision 37 的 9 条批注已统一标为 `proposed_fixed`；最终 `resolved` 仍由用户在 Review Center 确认。
- 原定五轮真人完整阅读验收实际完成 3/5；用户已另行授权本次发布，但剩余两轮没有被自动检查替代。
- 后续两轮优先观察 75+ 合法选择与晚年有效内容，以及 childfree、parent_loss、职业切换和持续代价卡在自然人生中的承认度。
- 若普通局明显超过 20 分钟或复杂局普遍超过 25 分钟，再根据实测分别判断 M2 总目标或 M7 寿命映射；不要把两者捆绑回退。
