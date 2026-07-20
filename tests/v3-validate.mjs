import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];const check=(value,message)=>{if(!value)failures.push(message)};
const kinds=Object.groupBy(data.events,event=>event.kind);
const cards=Object.values(data.cards).flat();

check(data.version==='3.2.0','data version must be 3.2.0');
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
for(const event of data.events){
  check(Number.isFinite(event.ageMin)&&Number.isFinite(event.ageMax)&&event.ageMin<=event.ageMax,`${event.id}: invalid age range`);
  check(Array.isArray(event.stage)&&event.stage.length>0,`${event.id}: missing stage`);
  check(typeof event.icon==='string'&&event.icon.length>0,`${event.id}: missing icon`);
  check(event.contentRevision===3,`${event.id}: stale content revision`);
}
for(const beat of kinds.beat||[])check([...beat.text].length<=32,`${beat.id}: beat longer than 32 chars (${[...beat.text].length})`);
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
}
const childAdultTerms=/(房贷|升职|离职|婚恋|裁员|首付|工资|合同)/;
check(!(kinds.decision||[]).filter(x=>x.ageMax<=12).some(x=>childAdultTerms.test(x.prompt+x.choices.map(c=>c.text).join(''))),'child decision contains adult terms');
const stageCoverage={};for(const stage of Object.keys(data.stages)){stageCoverage[stage]=(kinds.beat||[]).filter(x=>x.stage.includes(stage)).length;check(stageCoverage[stage]>=50,`${stage}: fewer than 50 annual beats`)}
const lightCount=(kinds.beat||[]).filter(x=>x.tone==='light'||['ordinary','peer','relationship'].includes(x.theme)).length;
check(lightCount/400>=.25,`low-intensity share ${(lightCount/400).toFixed(3)} < .25`);
check(!JSON.stringify(data).includes('__fn__'),'data contains executable function marker');

const report={version:data.version,schemaVersion:data.schemaVersion,contentRevision:data.contentRevision,events:{beat:kinds.beat.length,decision:kinds.decision.length,echo:kinds.echo.length,blackSwan:kinds.blackSwan.length,total:data.events.length},cards:{innate:data.cards.innate.length,stage:data.cards.stage.length,adversity:data.cards.adversity.length,total:cards.length},families:data.familyArchetypes.length,secrets:data.familySecrets.length,stageCoverage,lowIntensityShare:Number((lightCount/400).toFixed(3)),uniqueChoiceSets:signatureCounts.size,failures};
console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
