import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

check(data.schemaVersion===3,'schemaVersion must be 3');
check(data.gameVersion==='3.1.0','gameVersion must be 3.1.0');
check(data.contentRevision===2,'contentRevision must be 2');
check(data.events.length===320,`base events ${data.events.length} !== 320`);
check(data.eventChains.length===48,`event chains ${data.eventChains.length} !== 48`);
const chainNodes=data.eventChains.flatMap(chain=>chain.nodes.map(node=>({...node,chainId:chain.id})));
check(chainNodes.length===240,`chain nodes ${chainNodes.length} !== 240`);
check(data.events.length+chainNodes.length>=536,`total nodes ${data.events.length+chainNodes.length} < 536`);
check(data.familyArchetypes.length>=30,'family archetypes < 30');
check(data.familySecrets.length>=44,'family secrets < 44');
check(data.cards.innate.length>=40,'innate cards < 40');
check(data.cards.stage.length>=64,'stage cards < 64');
check(data.cards.adversity.length>=20,'adversity cards < 20');
check(data.endingTitles.length>=64,'ending titles < 64');
check(Object.values(data.endingFragments).flat().length>=96,'ending fragments < 96');

const allEvents=[...data.events,...chainNodes];
const voiceRanges={infant:[0,3],preschool:[4,6],lowerPrimary:[7,9],upperPrimary:[10,12],earlyTeen:[13,15],lateTeen:[16,18],youngAdult:[19,22],earlyCareer:[23,25],adult:[26,35],midlife:[36,50],preRetire:[51,65],youngOld:[66,75],lateOld:[76,105]};
const ids=allEvents.map(x=>x.id);check(new Set(ids).size===ids.length,'duplicate event ids');
const cardIds=Object.values(data.cards).flat().map(x=>x.id);check(new Set(cardIds).size===cardIds.length,'duplicate card ids');
const familyIds=data.familyArchetypes.map(x=>x.id);check(new Set(familyIds).size===familyIds.length,'duplicate family ids');
const chainIds=data.eventChains.map(x=>x.id);check(new Set(chainIds).size===chainIds.length,'duplicate chain ids');

for(const event of allEvents){
  check(Number.isFinite(event.ageMin)&&Number.isFinite(event.ageMax)&&event.ageMin<=event.ageMax,`${event.id}: invalid ages`);
  check(Array.isArray(event.stage)&&event.stage.length>0,`${event.id}: missing stage`);
  check(Array.isArray(event.choices)&&event.choices.length>=2,`${event.id}: needs at least two choices`);
  check(event.choices.some(choice=>!choice.requirements||Object.keys(choice.requirements).length===0),`${event.id}: no unconditional choice`);
  check(typeof event.text==='string'&&event.text.length>=16,`${event.id}: text too short`);
  check(typeof event.icon==='string'&&event.icon.length>0,`${event.id}: missing emoji`);
  check(voiceRanges[event.voiceBand],`${event.id}: invalid voiceBand`);
  if(voiceRanges[event.voiceBand])check(event.ageMin===voiceRanges[event.voiceBand][0]&&event.ageMax===voiceRanges[event.voiceBand][1],`${event.id}: age range does not match ${event.voiceBand}`);
  check(['none','instinct','limited','full'].includes(event.agency),`${event.id}: invalid agency`);
  check(['small','medium','major'].includes(event.stakes),`${event.id}: invalid stakes`);
  check(['reality','blackHumor','delayedTurn','absurd'].includes(event.tone),`${event.id}: invalid tone`);
  if(event.themes?.includes('adult_gray'))check(event.ageMin>=18,`${event.id}: adult-gray event below 18`);
  if(event.genderAffinity)check(['male','female'].includes(event.genderAffinity),`${event.id}: invalid gender affinity`);
}

const forbiddenSuffix=/(家庭版|自我版|城市版|时代版| · 起点| · 第一次代价| · 路线分岔| · 长期结算| · 多年回响)$/;
check(!allEvents.some(event=>forbiddenSuffix.test(event.title)), 'player titles still contain template suffixes');
const genericChoices=['接受安排','承认真实感受','寻找第三条路','重新谈条件','继续投入','把生活转向别处'];
check(!allEvents.some(event=>event.choices.some(choice=>genericChoices.includes(choice.text))), 'generic psychology-test choice remains');
const signatures=new Map();
for(const event of allEvents){const signature=event.choices.map(choice=>choice.text).join('|');signatures.set(signature,(signatures.get(signature)||0)+1)}
const choiceUniqueRate=signatures.size/allEvents.length;const maxChoiceRepeat=Math.max(...signatures.values());
check(choiceUniqueRate>=.8,`choice signature uniqueness ${choiceUniqueRate.toFixed(3)} < .8`);
check(maxChoiceRepeat<=4,`a choice signature repeats ${maxChoiceRepeat} times`);
const childTerms=/(原生家庭|情绪操控|职业规划|现金流|婚恋|房贷|升职|离职|组织身份)/;
check(!allEvents.filter(event=>event.ageMax<=12).some(event=>event.choices.some(choice=>childTerms.test(choice.text))), 'child choice contains adult terminology');
const cards=Object.values(data.cards).flat();
check(cards.every(card=>card.omenIcon&&card.omenText&&card.contentRevision===2),'card omen fields incomplete');
const elderNodes=allEvents.filter(event=>event.ageMax>=66);const elderThemes=new Set(elderNodes.flatMap(event=>event.themes||[]));
check(elderThemes.size>=8,`elder pool only covers ${elderThemes.size} themes`);
const stakesCount=Object.fromEntries(['small','medium','major'].map(key=>[key,data.events.filter(event=>event.stakes===key).length]));
const toneCount=Object.fromEntries(['reality','blackHumor','delayedTurn','absurd'].map(key=>[key,data.events.filter(event=>event.tone===key).length]));
check(stakesCount.small===96&&stakesCount.medium===176&&stakesCount.major===48,`base stakes mix is ${JSON.stringify(stakesCount)}`);
check(toneCount.reality===192&&toneCount.blackHumor===80&&toneCount.delayedTurn===32&&toneCount.absurd===16,`base tone mix is ${JSON.stringify(toneCount)}`);
const institutionNodes=allEvents.filter(event=>event.cultureTags?.includes('institutionSatire'));const trendNodes=allEvents.filter(event=>event.cultureTags?.includes('trendRemix'));
check(institutionNodes.length/allEvents.length>=.03&&institutionNodes.length/allEvents.length<=.05,`institution satire ratio ${(institutionNodes.length/allEvents.length).toFixed(3)}`);
check(trendNodes.length/allEvents.length>=.05&&trendNodes.length/allEvents.length<=.08,`trend remix ratio ${(trendNodes.length/allEvents.length).toFixed(3)}`);

for(const chain of data.eventChains){
  check(chain.nodes.length>=3&&chain.nodes.length<=6,`${chain.id}: chain length must be 3-6`);
  chain.nodes.forEach((node,index)=>check(node.chainStep===index,`${chain.id}: non-contiguous step ${index}`));
}

const stageCoverage={};
for(const [stage,range] of Object.entries(data.stages))stageCoverage[stage]=allEvents.filter(event=>event.stage.includes(stage)&&event.ageMin<=range[1]&&event.ageMax>=range[0]).length;
for(const [stage,count] of Object.entries(stageCoverage))check(count>=40,`${stage}: only ${count} candidate nodes`);
const maleHigh=data.events.filter(x=>x.genderAffinity==='male'||(x.gender?.length===1&&x.gender[0]==='male')).length;
const femaleHigh=data.events.filter(x=>x.genderAffinity==='female'||(x.gender?.length===1&&x.gender[0]==='female')).length;
const genderVariants=data.events.filter(x=>x.variants?.male&&x.variants?.female).length;
check(maleHigh>=44,`male high-weight events ${maleHigh} < 44`);
check(femaleHigh>=56,`female high-weight events ${femaleHigh} < 56`);
check(genderVariants>=72,`gender variants ${genderVariants} < 72`);
check(!JSON.stringify(data).includes('__fn__'),'data contains executable __fn__ markers');

const report={
  schemaVersion:data.schemaVersion,gameVersion:data.gameVersion,baseEvents:data.events.length,eventChains:data.eventChains.length,
  chainNodes:chainNodes.length,totalNodes:allEvents.length,families:data.familyArchetypes.length,secrets:data.familySecrets.length,
  cards:{innate:data.cards.innate.length,stage:data.cards.stage.length,adversity:data.cards.adversity.length},
  endingTitles:data.endingTitles.length,endingFragments:Object.values(data.endingFragments).flat().length,maleHigh,femaleHigh,genderVariants,stageCoverage,choiceUniqueRate:Number(choiceUniqueRate.toFixed(3)),maxChoiceRepeat,stakesCount,toneCount,institutionSatire:institutionNodes.length,trendRemix:trendNodes.length,failures
};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
