import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const output = path.join(root, 'docs', 'research', 'v0.6.9-玩家文案验收表.tsv');
const echoById = new Map(data.events.filter((event) => event.kind === 'consequence').map((event) => [event.id, event]));
const sensitivePatterns = [
  ['人物', /伴侣|丈夫|妻子|孩子|父母|父亲|母亲/],
  ['住房债务', /房子|住房|房贷|按揭|担保|欠款|债务/],
  ['健康照护', /怀孕|妊娠|收养|药|酒|治疗|照护|死亡/],
  ['职业资产', /医生|教师|律师|工人|企业|股份|股权|店铺/],
];

const clean = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
const compact = (value) => clean(JSON.stringify(value ?? null));
const sensitive = (text) => sensitivePatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name).join('、') || '无';
const requirements = (event) => compact(event.requirements || { all: [], any: [], none: [] });
const actors = (event) => compact(event.actors || []);
const ageAndPeople = (event) => `年龄 ${event.ageMin ?? '-'}—${event.ageMax ?? '-'}；人物 ${actors(event)}；门槛 ${requirements(event)}`;
const delayed = (choice) => (choice.consequences || []).map((item) => {
  const echo = echoById.get(item.eventId);
  const branch = echo?.choiceOutcomes?.[choice.memoryKey];
  return `${item.eventId}@${item.delayMin}—${item.delayMax}年：${echo?.text || ''}${branch ? `；${branch.text || ''}；效果 ${compact(branch.effects || [])}` : ''}`;
}).join('；') || '无';
const card = (choice) => choice.cardInteraction
  ? [
      `${choice.cardInteraction.primaryMechanic}/${choice.cardInteraction.mode}`,
      choice.cardInteraction.explanation,
      choice.cardInteraction.resultSuffix,
    ].filter(Boolean).join('；')
  : '无';
const rows = [];
const add = (values) => rows.push(values.map(clean));

for (const secret of data.familySecrets) {
  const fact = secret.text || '';
  add([
    secret.id, '', 'familySecret', 'origin',
    `年龄 ${secret.age ?? '-'} 起；人物 []；门槛 ${compact(secret.requirements || { all: [], any: [], none: [] })}`,
    fact, fact,
    compact(secret.effects || []), '无', '无', sensitive(fact), '待人工复核',
  ]);
}

for (const event of data.events) {
  if (event.kind === 'decision') {
    for (const choice of event.choices || []) {
      const visible = [event.prompt, choice.text, choice.resultText, choice.consequenceText, choice.cardInteraction?.explanation, choice.cardInteraction?.resultSuffix].filter(Boolean).join(' ');
      add([
        event.id, choice.id, event.kind, event.track, ageAndPeople(event), event.prompt,
        `${choice.text} → ${choice.resultText || ''}`, compact(choice.effects || []), delayed(choice), card(choice),
        sensitive(visible), '待人工复核',
      ]);
    }
    continue;
  }
  const visible = event.text || '';
  add([
    event.id, '', event.kind, event.track, ageAndPeople(event), visible, visible,
    compact(event.effects || []), '无', '无', sensitive(visible),
    '待人工复核',
  ]);
}

const header = ['事件 ID', '选项 ID', '类型', '轨道', '年龄／人物／状态前置', '选择前共同事实', '分支后新增事实', '实际效果', '延迟后果', '卡牌互动', '敏感表达标签', '人工结论'];
fs.writeFileSync(output, [header, ...rows].map((row) => row.join('\t')).join('\n') + '\n');
console.log(JSON.stringify({ output, rows: rows.length }, null, 2));
