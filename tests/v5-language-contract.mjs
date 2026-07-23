import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {UI_COPY} from '../content/zh-CN/ui.mjs';
import {EMPLOYMENT_COPY} from '../content/zh-CN/tracks/employment.mjs';
import {TRACK_COPY} from '../content/zh-CN/tracks/index.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];
const warnings=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const length=text=>[...String(text||'')].length;
const inRange=(text,min,max,label)=>check(length(text)>=min&&length(text)<=max,`${label}: length ${length(text)} not in ${min}-${max}`);
const employmentEvents=data.events.filter(event=>event.track==='employment');
const beats=employmentEvents.filter(event=>event.kind==='beat');
const decisions=employmentEvents.filter(event=>event.kind==='decision');
const consequences=employmentEvents.filter(event=>event.kind==='consequence');
const sourceDecisions=EMPLOYMENT_COPY.decisions;

check(beats.length===32,'employment must keep 32 annual beats');
check(decisions.length===8,'employment must keep 8 decisions');
check(consequences.length===8,'employment must keep 8 consequences');
check(JSON.stringify(EMPLOYMENT_COPY.beatMix)===JSON.stringify({ordinary:10,awkward:8,friction:8,pressure:4,major:2}),'employment beat mix changed');

for(const [index,beat] of beats.entries()){
  check(beat.text===EMPLOYMENT_COPY.beats[index]?.text,`${beat.id}: generated text differs from authored copy`);
  check(beat.tone===EMPLOYMENT_COPY.beats[index]?.tone,`${beat.id}: authored tone missing`);
  inRange(beat.text,12,36,beat.id);
}

const resultTexts=[];
const consequenceTexts=[];
for(const [index,decision] of decisions.entries()){
  const source=sourceDecisions[index];
  check(decision.prompt===source?.prompt,`${decision.id}: generated prompt differs from authored copy`);
  inRange(decision.prompt,15,55,`${decision.id} prompt`);
  check(decision.choices.length===(decision.episode?.role==='resolve'?4:3),`${decision.id}: choice count does not match decision role`);
  for(const [choiceIndex,choice] of decision.choices.entries()){
    const authored=source?.choices[choiceIndex];
    check(choice.text===authored?.text,`${choice.id}: option text differs from authored copy`);
    check(choice.resultText===authored?.resultText,`${choice.id}: result text differs from authored copy`);
    check(!choice.hints?.length,`${choice.id}: employment choice still exposes mechanism hint`);
    inRange(choice.text,4,18,`${choice.id} option`);
    inRange(choice.resultText,10,decision.episode?55:42,`${choice.id} result`);
    resultTexts.push(choice.resultText);
  }
  const consequence=consequences[index];
  check(consequence.text===source?.echoText,`${consequence?.id}: consequence heading differs from authored copy`);
  for(const [choiceIndex,choice] of decision.choices.entries()){
    const text=consequence?.choiceOutcomes?.[choice.memoryKey]?.text;
    check(text===source?.choices[choiceIndex]?.consequenceText,`${consequence?.id}/${choice.memoryKey}: consequence differs from authored copy`);
    inRange(text,12,55,`${consequence?.id}/${choice.memoryKey} consequence`);
    consequenceTexts.push(text);
  }
}

const forbidden=[
  '这项安排开始改变之后的机会',
  '你把“',
  '早先投入的东西开始显出回报',
  '当初保留的余地如今派上用场',
  '当时推迟的代价没有消失',
  '这会改变事件权重与结局解释',
  '这项现实已经由本局状态或选择真实解锁'
];
const verticalText=JSON.stringify({ui:UI_COPY,employment:EMPLOYMENT_COPY,habits:TRACK_COPY.habits});
for(const phrase of forbidden)check(!verticalText.includes(phrase),`vertical copy contains forbidden template: ${phrase}`);

const exactDuplicates=list=>list.filter((text,index)=>list.indexOf(text)!==index);
check(exactDuplicates(resultTexts).length===0,'employment contains duplicate result text');
check(exactDuplicates(consequenceTexts).length===0,'employment contains duplicate consequence text');

const fragmentCounts=new Map();
const narrativeTexts=[
  ...beats.map(item=>item.text),
  ...decisions.flatMap(item=>[item.prompt,...item.choices.flatMap(choice=>[choice.text,choice.resultText])]),
  ...consequenceTexts
];
for(const text of narrativeTexts){
  const chars=[...text],seen=new Set();
  for(let index=0;index<=chars.length-12;index++)seen.add(chars.slice(index,index+12).join(''));
  for(const fragment of seen)fragmentCounts.set(fragment,(fragmentCounts.get(fragment)||0)+1);
}
for(const [fragment,count] of fragmentCounts)check(count<=3,`12-character fragment repeated ${count} times: ${fragment}`);

const openingCounts=new Map();
for(const beat of beats){
  const opening=[...beat.text].slice(0,4).join('');
  openingCounts.set(opening,(openingCounts.get(opening)||0)+1);
}
const openingLimit=Math.floor(beats.length*.2);
for(const [opening,count] of openingCounts)check(count<=openingLimit,`employment opening exceeds 20%: ${opening} (${count}/${beats.length})`);

const abstractWords=['选择','机会','安排','路线','状态','影响','现实','兑现','承担','关系','边界','人生'];
for(const text of narrativeTexts){
  const hits=abstractWords.reduce((sum,word)=>sum+(text.split(word).length-1),0);
  if(hits>2)warnings.push(`abstract-word warning (${hits}): ${text}`);
}

const allDataText=JSON.stringify(data);
for(const phrase of forbidden){
  const count=allDataText.split(phrase).length-1;
  check(count===0,`generated data contains forbidden template "${phrase}" ${count} times`);
}
for(const [trackId,copy] of Object.entries(TRACK_COPY)){
  check(copy.beats.length===32,`${trackId}: authored beat count is not 32`);
  const expectedDecisions={habits:30,business:7,remote:7,partnership:10,children:10}[trackId]||8;
  check(copy.decisions.length===expectedDecisions,`${trackId}: authored decision count is not ${expectedDecisions}`);
  const episodeCounts=Object.groupBy(copy.decisions.filter(item=>item.episode),item=>item.episode.id);
  check(copy.decisions.every(item=>item.choices.length===(item.episode&&(item.episode.role==='resolve'||episodeCounts[item.episode.id]?.length===1)?4:3)),`${trackId}: decision choice count does not match its role`);
}
const habitVisible=JSON.stringify(TRACK_COPY.habits);
for(const vague of['一种习惯','旧入口','多年后如何讲述'])check(!habitVisible.includes(vague),`habits copy contains vague or displaced phrase: ${vague}`);
for(const type of['gambling','alcohol','gaming','shopping','medication'])check(TRACK_COPY.habits.decisions.filter(item=>item.type===type).length===6,`${type}: must have six authored decisions across formation, treatment, and relapse`);

const report={
  employment:{beats:beats.length,decisions:decisions.length,choiceResults:resultTexts.length,consequences:consequences.length,choiceSpecificConsequences:consequenceTexts.length},
  failures,
  warnings
};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
