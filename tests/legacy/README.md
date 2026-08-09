# Legacy test evidence

本目录保存只对历史版本成立的冻结测试证据，不属于当前发布回归。

- `runtime-equivalence-v067.cjs` 对应 v0.6.7／Schema 11／Content Revision 25。
- `fixtures/v0.6.0-runtime-equivalence.json` 是该检查使用的固定轨迹。

当前 `smoke.js` 不注册这些文件为可运行 profile，但语法检查仍会扫描其中的脚本。需要复核历史等价性时，应在独立 worktree 检出 `legacy/0.6.7`，运行该版本自带的 `node tests/v6-runtime-equivalence-smoke.cjs`；不能通过放宽版本断言让它在新版本伪通过。这里的归档副本用于审计测试定义，不冒充当前版本回归。
