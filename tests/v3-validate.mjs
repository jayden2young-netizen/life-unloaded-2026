import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];const check=(value,message)=>{if(!value)failures.push(message)};
const kinds=Object.groupBy(data.events,event=>event.kind);
const cards=Object.values(data.cards).flat();

check(data.version==='3.2.4','data version must be 3.2.4');
check(data.gameVersion==='3.2.4','data gameVersion must be 3.2.4');
check(data.schemaVersion===4,'schemaVersion must be 4');
check(data.contentRevision===3,'contentRevision must be 3');
check((kinds.beat||[]).length===400,`annual beats ${(kinds.beat||[]).length} !== 400`);
check((kinds.decision||[]).length===100,`decisions ${(kinds.decision||[]).length} !== 100`);
check((kinds.echo||[]).length===80,`echoes ${(kinds.echo||[]).length} !== 80`);
check((kinds.blackSwan||[]).length===20,`black swans ${(kinds.blackSwan||[]).length} !== 20`);
check(data.events.length===600,`total events ${data.events.length} !== 600`);
check(data.cards.innate.length===24,'innate cards must be 24');
check(data.cards.stage.length===36,'stage cards must be 36');
check(data.cards.adversity.length===12,'adversity cards must be 12');
check(cards.length===72,`cards ${cards.length} !== 72`);

const ids=data.events.map(x=>x.id);check(new Set(ids).size===ids.length,'duplicate event ids');
const cardIds=cards.map(x=>x.id);check(new Set(cardIds).size===cardIds.length,'duplicate card ids');
const mechanicHints={
  network:'关系 +3；关系事件更常出现，一次再加 +2。',evidence:'精神 +1；一次职场、金钱或数字事件再加 +2。',
  healthUp:'健康 +3；身体压力 -2，一次健康损失减半。',skill:'技能经验 +1，精神 +1。',
  digital:'数字经验 +2，精神 +1；数字事件更常出现。',save:'现金 +1800；一次金钱或住房损失减半。',
  relationUp:'关系 +4，孤独压力 -2。',spiritUp:'精神 +4，孤独压力 -1。',truth:'关系 +2，精神 -1；留下诚实记录。',
  legal:'现金 -800；留下法律意识记录。',gig:'进入灵活就业；现金 +2500，职业压力 +2。',
  partner:'进入稳定关系，关系 +5。',boundary:'边界经验 +1；精神 +3，关系 -1。',
  care:'照护责任 +1；关系 +3，精神 -2，家庭压力 +3。',cashUp:'现金 +3200，金钱压力 -1。'
};
function parseChineseAge(value){
  if(/^\d+$/.test(value))return Number(value);
  const digits={零:0,'〇':0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  if(value==='十')return 10;
  if(value.includes('十')){
    const [tens,ones]=value.split('十');
    return (tens?digits[tens]:1)*10+(ones?digits[ones]:0);
  }
  return digits[value];
}
for(const event of data.events){
  check(Number.isFinite(event.ageMin)&&Number.isFinite(event.ageMax)&&event.ageMin<=event.ageMax,`${event.id}: invalid age range`);
  check(Array.isArray(event.stage)&&event.stage.length>0,`${event.id}: missing stage`);
  check(typeof event.icon==='string'&&event.icon.length>0,`${event.id}: missing icon`);
  check(event.contentRevision===3,`${event.id}: stale content revision`);
}
for(const beat of kinds.beat||[]){
  check([...beat.text].length<=32,`${beat.id}: beat longer than 32 chars (${[...beat.text].length})`);
  for(const match of beat.text.matchAll(/([零〇一二两三四五六七八九十\d]+)岁(?:生日|那年|重启人生)/g)){
    const literalAge=parseChineseAge(match[1]);
    check(beat.ageMin===literalAge&&beat.ageMax===literalAge,`${beat.id}: text says age ${literalAge}, range is ${beat.ageMin}-${beat.ageMax}`);
  }
}
for(const swan of kinds.blackSwan||[])check([...swan.text].length<=32,`${swan.id}: black swan longer than 32 chars`);
const signatureCounts=new Map();const memoryKeys=new Set();
const forbidden=['找老师或大人商量','先不告诉家里','问一个有经验的人','重新谈条件','承认真实感受','寻找第三条路','先保住现金流'];
for(const decision of kinds.decision||[]){
  const promptLength=[...decision.prompt].length;check(promptLength<=(decision.stakes==='major'?65:45),`${decision.id}: prompt too long (${promptLength})`);
  check(decision.choices.length>=2&&decision.choices.length<=4,`${decision.id}: invalid choice count`);
  const signature=decision.choices.map(x=>x.text).join('|');signatureCounts.set(signature,(signatureCounts.get(signature)||0)+1);
  for(const choice of decision.choices){
    check([...choice.text].length<=14,`${choice.id}: choice longer than 14 chars (${choice.text})`);
    check([...choice.resultText].length<=32,`${choice.id}: result longer than 32 chars`);
    check(!forbidden.includes(choice.text),`${choice.id}: forbidden generic choice`);
    check(choice.memoryKey,`${choice.id}: missing memory key`);memoryKeys.add(choice.memoryKey);
    const effects=choice.effects||{};check(Object.keys(effects).some(key=>Object.keys(effects[key]||{}).length),`${choice.id}: choice changes no state`);
    check(Array.isArray(choice.consequenceHints)&&choice.consequenceHints.length>0,`${choice.id}: missing consequence hint`);
  }
}
check(Math.max(...signatureCounts.values())===1,'a complete choice set is reused');
for(const echo of kinds.echo||[]){
  check(echo.requirements?.memoriesAny?.length>0,`${echo.id}: missing memory reference`);
  for(const key of echo.requirements?.memoriesAny||[])check(memoryKeys.has(key),`${echo.id}: unknown memory ${key}`);
  check([...echo.text].length<=32,`${echo.id}: echo longer than 32 chars`);
}
for(const card of cards){
  check(card.displayName&&card.effectHint,`${card.id}: card lacks clear player text`);
  check([...card.displayName].length<=10,`${card.id}: card name too long`);
  check([...card.effectHint].length<=34,`${card.id}: card effect hint too long`);
  check(card.mechanic&&card.effects,`${card.id}: card lacks mechanics`);
  check(card.effectHint===mechanicHints[card.mechanic],`${card.id}: hint does not match ${card.mechanic} mechanics`);
}
const childAdultTerms=/(房贷|升职|离职|婚恋|裁员|首付|工资|合同)/;
check(!(kinds.decision||[]).filter(x=>x.ageMax<=12).some(x=>childAdultTerms.test(x.prompt+x.choices.map(c=>c.text).join(''))),'child decision contains adult terms');
const stageCoverage={};for(const stage of Object.keys(data.stages)){stageCoverage[stage]=(kinds.beat||[]).filter(x=>x.stage.includes(stage)).length;check(stageCoverage[stage]>=50,`${stage}: fewer than 50 annual beats`)}
const lightCount=(kinds.beat||[]).filter(x=>x.tone==='light'||['ordinary','peer','relationship'].includes(x.theme)).length;
check(lightCount/400>=.25,`low-intensity share ${(lightCount/400).toFixed(3)} < .25`);
check(!JSON.stringify(data).includes('__fn__'),'data contains executable function marker');
check(data.codex.length===30,`codex ${data.codex.length} !== 30`);
const unlockSources=JSON.stringify({events:data.events,cards:data.cards});
for(const entry of data.codex){
  check(Array.isArray(entry.triggers)&&entry.triggers.length>0,`${entry.id}: missing unlock triggers`);
  check(entry.triggers?.some(trigger=>unlockSources.includes(trigger)),`${entry.id}: no trigger appears in playable content`);
}

const report={version:data.version,gameVersion:data.gameVersion,schemaVersion:data.schemaVersion,contentRevision:data.contentRevision,events:{beat:kinds.beat.length,decision:kinds.decision.length,echo:kinds.echo.length,blackSwan:kinds.blackSwan.length,total:data.events.length},cards:{innate:data.cards.innate.length,stage:data.cards.stage.length,adversity:data.cards.adversity.length,total:cards.length},families:data.familyArchetypes.length,secrets:data.familySecrets.length,codex:data.codex.length,stageCoverage,lowIntensityShare:Number((lightCount/400).toFixed(3)),uniqueChoiceSets:signatureCounts.size,failures};
console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
