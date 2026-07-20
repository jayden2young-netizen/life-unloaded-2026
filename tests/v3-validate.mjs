import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

check(data.schemaVersion===3,'schemaVersion must be 3');
check(data.gameVersion==='3.0.0','gameVersion must be 3.0.0');
check(data.events.length>=320,`base events ${data.events.length} < 320`);
check(data.eventChains.length>=48,`event chains ${data.eventChains.length} < 48`);
const chainNodes=data.eventChains.flatMap(chain=>chain.nodes.map(node=>({...node,chainId:chain.id})));
check(chainNodes.length>=216,`chain nodes ${chainNodes.length} < 216`);
check(data.events.length+chainNodes.length>=536,`total nodes ${data.events.length+chainNodes.length} < 536`);
check(data.familyArchetypes.length>=30,'family archetypes < 30');
check(data.familySecrets.length>=44,'family secrets < 44');
check(data.cards.innate.length>=40,'innate cards < 40');
check(data.cards.stage.length>=64,'stage cards < 64');
check(data.cards.adversity.length>=20,'adversity cards < 20');
check(data.endingTitles.length>=64,'ending titles < 64');
check(Object.values(data.endingFragments).flat().length>=96,'ending fragments < 96');

const allEvents=[...data.events,...chainNodes];
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
  if(event.themes?.includes('adult_gray'))check(event.ageMin>=18,`${event.id}: adult-gray event below 18`);
  if(event.genderAffinity)check(['male','female'].includes(event.genderAffinity),`${event.id}: invalid gender affinity`);
}

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
  endingTitles:data.endingTitles.length,endingFragments:Object.values(data.endingFragments).flat().length,maleHigh,femaleHigh,genderVariants,stageCoverage,failures
};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
