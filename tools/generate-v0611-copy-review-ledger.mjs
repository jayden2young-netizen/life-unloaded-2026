import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const output = path.join(root, 'roadmap', 'v0.6.11-全库文案审阅账本.tsv');
const rows = [];
const completeReview = process.argv.includes('--complete');
const reviewSourceArg = process.argv.find((argument) => argument.startsWith('--review-source='));
const reviewSource = reviewSourceArg?.slice('--review-source='.length);

if (data.gameVersion !== '0.6.11' || data.contentRevision !== 29) {
  throw new Error(
    `账本只接受 v0.6.11 / Revision 29，当前为 ${data.gameVersion} / ${data.contentRevision}`
  );
}
if (completeReview && !reviewSource) {
  throw new Error('--complete 必须同时提供 --review-source=<已存在的审阅文件>');
}
const resolvedReviewSource = reviewSource ? path.resolve(root, reviewSource) : null;
if (resolvedReviewSource && !fs.existsSync(resolvedReviewSource)) {
  throw new Error(`审阅来源不存在：${resolvedReviewSource}`);
}

const parseTsv = (text) => {
  const parsed = text.split(/\r?\n/).filter(Boolean).map((line) => line.split('\t'));
  const invalid = parsed.findIndex((row) => row.length !== 14);
  if (invalid !== -1) {
    throw new Error(`账本第 ${invalid + 1} 行不是 14 列；请先移除单元格内换行或制表符`);
  }
  return parsed;
};
const rowKey = (row) => [row[0], row[1], row[2], row[3], row[4], row[5], row[6]].join('\u0000');
const previousRows = fs.existsSync(output) ? parseTsv(fs.readFileSync(output, 'utf8')).slice(1) : [];
const previousByKey = new Map(previousRows.map((row) => [rowKey(row), row]));

const clean = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
const add = ({ id, choiceId = '', type, track, episodeId = '', phase = '', field, text, status = '待诊断', issue = '' }) => {
  const row = [
    id, choiceId, type, track, episodeId, phase, field, clean(text), status, issue,
    '', '', '否', '未验证',
  ].map(clean);
  const previous = previousByKey.get(rowKey(row));
  const unchanged = previous?.[7] === row[7];
  if (unchanged) {
    row.splice(8, 6, ...previous.slice(8, 14));
  } else if (completeReview) {
    const sourceLabel = path.relative(root, resolvedReviewSource);
    row[8] = previous ? '已整合' : type === 'ui' ? '已收口' : '已复核';
    row[9] = issue || '独立全库审计与 Codex 最终整合';
    row[10] = sourceLabel;
    row[11] = 'Codex 已核对当前正文、事实边界与实际展示路径';
    row[12] = '否';
    row[13] = '通过';
  } else if (previous) {
    row[8] = '待复核';
    row[9] = '正文已变化';
    row[10] = '';
    row[11] = '';
    row[12] = '否';
    row[13] = '未验证';
  }
  rows.push(row);
};

for (const family of data.familyArchetypes || []) {
  add({ id: family.id, type: 'familyArchetype', track: 'origin', field: 'name', text: family.name });
  for (const [index, text] of (family.advantages || []).entries())
    add({ id: family.id, type: 'familyArchetype', track: 'origin', field: `advantages[${index}]`, text });
  for (const [index, text] of (family.risks || []).entries())
    add({ id: family.id, type: 'familyArchetype', track: 'origin', field: `risks[${index}]`, text });
  add({ id: family.id, type: 'familyArchetype', track: 'origin', field: 'lateEcho', text: family.lateEcho });
}

for (const secret of data.familySecrets || []) {
  add({ id: secret.id, type: 'familySecret', track: 'origin', field: 'text', text: secret.text });
}

for (const card of data.cards || []) {
  add({ id: card.id, type: 'card', track: 'cards', field: 'displayName', text: card.displayName });
  add({ id: card.id, type: 'card', track: 'cards', field: 'text', text: card.text });
}

for (const [id, episode] of Object.entries(data.episodeCatalog || {})) {
  for (const field of ['label', 'organization', 'deadline', 'invalidated', 'notPregnant'])
    if (episode[field])
      add({ id, type: 'episodeCatalog', track: 'episodes', episodeId: id, field, text: episode[field] });
}

for (const profile of data.endingProfiles || []) {
  add({ id: profile.id, type: 'endingProfile', track: 'ending', field: 'summary', text: profile.summary });
}
for (const ending of data.endingTitles || []) {
  add({ id: ending.id, type: 'endingTitle', track: 'ending', field: 'title', text: ending.title });
}
for (const item of data.codex || []) {
  for (const field of ['name', 'category', 'lockedHint', 'unlockedText'])
    if (item[field]) add({ id: item.id, type: 'codex', track: 'codex', field, text: item[field] });
}

for (const event of data.events || []) {
  const base = {
    id: event.id,
    type: event.kind,
    track: event.track,
    episodeId: event.episode?.id || '',
    phase: event.episode?.phase || '',
  };
  if (event.situation) add({ ...base, field: 'situation', text: event.situation });
  if (event.prompt) add({ ...base, field: 'prompt', text: event.prompt });
  if (event.text) add({ ...base, field: event.kind === 'consequence' ? 'echoText' : 'text', text: event.text });
  for (const choice of event.choices || []) {
    const item = { ...base, choiceId: choice.id };
    add({ ...item, field: 'choice.text', text: choice.text });
    if (choice.resultText) add({ ...item, field: 'resultText', text: choice.resultText });
    if (choice.cardInteraction?.explanation) add({
      ...item,
      field: 'cardInteraction.explanation',
      text: choice.cardInteraction.explanation,
      status: '呈现层问题',
      issue: '检查是否应省略；不得复述选项',
    });
    if (choice.cardInteraction?.resultSuffix) add({
      ...item,
      field: 'cardInteraction.resultSuffix',
      text: choice.cardInteraction.resultSuffix,
      status: '呈现层问题',
      issue: '仅在增加可观察事实时保留',
    });
  }
  for (const [memoryKey, outcome] of Object.entries(event.choiceOutcomes || {})) {
    add({ ...base, choiceId: memoryKey, field: 'consequenceText', text: outcome.text });
  }
}

for (const [id, field, text, issue] of [
  ['ui_episode_choice', 'episode.choice', '情况、提问与选项同页显示', '移除重复 situation 页'],
  ['ui_episode_result', 'episode.result', '作者结果与“继续”', '移除状态机标题和“记到账上”'],
  ['ui_card_interaction', 'cardInteraction', '卡名与可选说明／后缀', '说明和后缀不得复述选项'],
  ['ui_status_drawer', 'statusDrawer', '生活化状态摘要', '隐藏内部数字和 episode 阶段'],
]) add({ id, type: 'ui', track: 'ui', field, text, status: '呈现层问题', issue });

const header = [
  '事件 ID', '选项／记忆键', '类型', '轨道', 'Episode ID', '阶段', '字段', '原文／当前呈现',
  '审阅状态', '问题类别', 'DeepSeek 候选', 'Codex 决定', '需用户判断', '验证状态',
];
fs.writeFileSync(output, [header, ...rows].map((row) => row.join('\t')).join('\n') + '\n');
console.log(JSON.stringify({ output, rows: rows.length, completeReview }, null, 2));
