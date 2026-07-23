import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const failures=[];const check=(condition,message)=>{if(!condition)failures.push(message)};
const get=(object,path)=>String(path).split('.').reduce((value,key)=>value?.[key],object);
const compare=(actual,op,expected)=>op==='eq'?actual===expected:op==='neq'?actual!==expected:op==='gte'?Number(actual)>=Number(expected):op==='lte'?Number(actual)<=Number(expected):op==='gt'?Number(actual)>Number(expected):op==='lt'?Number(actual)<Number(expected):op==='in'?expected.includes(actual):op==='notIn'?!expected.includes(actual):op==='includes'?Array.isArray(actual)&&actual.includes(expected):op==='truthy'?Boolean(actual):false;
const requirements=(event,run)=>{const req=event.requirements||{},match=rule=>compare(rule.path==='age'?run.age:get(run,rule.path),rule.op,rule.value);return(req.all||[]).every(match)&&(!(req.any||[]).length||(req.any||[]).some(match))&&!(req.none||[]).some(match)};
const personAge=(person,run)=>run.age-person.bornAt;
const actors=(event,run)=>(event.actors||[]).every(spec=>spec.optional||run.people.some(person=>(!spec.relation||person.relation===spec.relation)&&(!spec.relationAny||spec.relationAny.includes(person.relation))&&(spec.alive===undefined||person.alive===spec.alive)&&(spec.ageMin===undefined||personAge(person,run)>=spec.ageMin)&&(spec.ageMax===undefined||personAge(person,run)<=spec.ageMax)&&(!spec.statusAny||person.relation!=='partner'||spec.statusAny.includes(run.relationships.partnerStatus))));
const eligible=(event,run)=>run.age>=event.ageMin&&run.age<=event.ageMax&&requirements(event,run)&&actors(event,run);
const base={age:30,education:{status:'completed',level:4},employment:{status:'none',employerType:'none',arrangement:'onsite'},activity:{mode:'seeking'},finance:{cash:0,available:0,totalDebt:0,hasArrears:false},relationships:{partnerStatus:'none',childCount:0},people:[],attrs:{physique:5},health:{physical:75,status:'well',conditionSeverity:0,disability:'none'},pressures:{money:0,body:0,career:0,family:0},capabilities:{portableSkill:0,healthLiteracy:0,resilience:0},mobility:{mode:'home'},business:{status:'none'},habits:{risk:0}};
const beats=data.events.filter(event=>event.kind==='beat'),decisions=data.events.filter(event=>event.kind==='decision'),consequences=data.events.filter(event=>event.kind==='consequence');
const decisionBy=pattern=>decisions.find(event=>pattern.test(event.prompt));
const sets=(choice,target,value)=>choice.effects.some(effect=>effect.type==='set'&&effect.target===target&&effect.value===value);

const nonworker=structuredClone(base);check(!beats.filter(event=>event.track==='employment').some(event=>eligible(event,nonworker)),'nonworker receives workplace annual event');
const retired=structuredClone(base);retired.age=66;retired.activity.mode='retired';retired.employment.status='retired';check(!beats.filter(event=>event.track==='employment').some(event=>eligible(event,retired)),'retiree receives workplace annual event');
const employed=structuredClone(base);employed.employment.status='employed';check(beats.filter(event=>event.track==='employment').some(event=>eligible(event,employed)),'employed person has no workplace annual pool');
check(!beats.filter(event=>event.track==='partnership'&&event.actors.length).some(event=>eligible(event,base)),'single person receives partner scene');
check(!beats.filter(event=>event.track==='children'&&event.actors.length).some(event=>eligible(event,base)),'childless person receives child scene');
const parent=structuredClone(base);parent.relationships.childCount=1;parent.people.push({id:'child',relation:'child',bornAt:24,alive:true});check(beats.filter(event=>event.track==='children'&&event.actors.length).some(event=>eligible(event,parent)),'parent has no child-age-compatible scene');
check(!decisions.filter(event=>event.track==='remote'&&event.arc?.node===1).some(event=>eligible(event,base)),'remote route starts without portable skill');
const skilled=structuredClone(base);skilled.capabilities.portableSkill=2;check(decisions.filter(event=>event.track==='remote'&&event.arc?.node===1).some(event=>eligible(event,skilled)),'portable worker cannot enter remote route');
check(!decisions.filter(event=>event.track==='business'&&event.arc?.node===1).some(event=>eligible(event,base)),'business route starts without funding');
const funded=structuredClone(base);funded.age=35;funded.finance.available=25000;check(decisions.filter(event=>event.track==='business'&&event.arc?.node===1).some(event=>eligible(event,funded)),'funded adult cannot enter business route');
const closed=structuredClone(funded);closed.business.status='closed';check(!beats.filter(event=>event.track==='business').some(event=>eligible(event,closed)),'closed business still receives operating beat');
check(!beats.filter(event=>event.track==='habits').some(event=>eligible(event,base)),'habit consequence occurs before exposure');
const exposed=structuredClone(base);exposed.habits.risk=10;check(beats.filter(event=>event.track==='habits').some(event=>eligible(event,exposed)),'exposed habit state has no follow-up pool');
check(!decisions.filter(event=>event.track==='health'&&event.arc?.role==='start').some(event=>eligible(event,base)),'healthy person is forced into an illness decision arc');
const monitored=structuredClone(base);monitored.health.status='monitoring';monitored.health.conditionSeverity=18;check(decisions.filter(event=>event.track==='health'&&event.arc?.node===1).some(event=>eligible(event,monitored)),'monitored health state has no assessment route');
const limited=structuredClone(base);limited.age=45;limited.health.status='limited';limited.health.conditionSeverity=42;limited.health.disability='persistent';check(decisions.filter(event=>event.track==='health'&&event.arc?.node===1).some(event=>eligible(event,limited))&&decisions.filter(event=>event.track==='health'&&event.arc?.node===1).length===2,'serious health state has no distinct recovery route');
check(!beats.filter(event=>event.track==='finance'&&/还款|催收|法院/.test(event.text)).some(event=>eligible(event,base)),'debt-free person receives collection or repayment scene');

const withPartner=structuredClone(base);withPartner.relationships.partnerStatus='dating';withPartner.people.push({id:'partner',relation:'partner',bornAt:2,alive:true});
const publicWorker=structuredClone(employed);publicWorker.employment.employerType='public';
const remoteWorker=structuredClone(employed);remoteWorker.capabilities.portableSkill=2;remoteWorker.employment.arrangement='remote';
const operating=structuredClone(funded);operating.business.status='operating';
const resting=structuredClone(base);resting.activity.mode='leisure';
const elder=structuredClone(retired);elder.age=68;
const trackFixtures={education:{...structuredClone(base),age:16},employment:employed,public:publicWorker,remote:remoteWorker,business:operating,leisure:resting,partnership:withPartner,children:parent,finance:base,health:base,habits:exposed,later:elder};
for(const [track,run]of Object.entries(trackFixtures))check(beats.filter(event=>event.track===track).some(event=>eligible(event,run))||decisions.filter(event=>event.track===track&&event.arc?.role==='start').some(event=>eligible(event,run)),`${track}: directed fixture has no reachable content`);
const adolescentParent=structuredClone(base);adolescentParent.age=45;adolescentParent.relationships.childCount=1;adolescentParent.people.push({id:'teen',relation:'child',bornAt:30,alive:true});check(decisions.filter(event=>event.track==='children'&&/青春期/.test(event.prompt)).some(event=>eligible(event,adolescentParent)),'adolescent child cannot reach adolescent decision');
check(!decisions.filter(event=>/成年孩子|兼职收入/.test(event.prompt)).some(event=>eligible(event,parent)),'young child reaches adult-child decision');
const age40=structuredClone(employed);age40.age=40;check(!decisions.filter(event=>/退休|返聘/.test(event.prompt)).some(event=>eligible(event,age40)),'retirement decision reaches a 40-year-old');
const firstJob=decisionBy(/录用通知/);check(sets(firstJob.choices[2],'employment.status','unemployed'),'rejecting first job does not remain unemployed');
const rehire=decisionBy(/返聘/);check(sets(rehire.choices[0],'employment.status','employed')&&sets(rehire.choices[1],'employment.status','employed')&&sets(rehire.choices[2],'employment.status','retired'),'rehire choices write contradictory work states');
const parenthood=decisionBy(/要不要成为父母/);check(parenthood.choices.every(choice=>!choice.effects.some(effect=>effect.type==='createPerson')),'parenthood discussion creates a child immediately');
const fertility=decisionBy(/生育计划遇到/);check(fertility.choices.slice(0,2).every(choice=>choice.effects.some(effect=>effect.type==='createPerson'))&&fertility.choices[2].arcExit===true,'fertility branch cannot create or explicitly end a child route');
const sampleStore=decisionBy(/样板店/);check(sampleStore.choices[2].arcExit===true&&!sampleStore.choices[2].effects.some(effect=>effect.type==='addLiability'),'ending a sample-store inspection creates debt or leaves arc active');
const partnerSupport=decisionBy(/伴侣能承担房租/);check(partnerSupport.actors.some(actor=>actor.relation==='partner'&&actor.statusAny.includes('partnered')),'partner-funded leisure lacks partner actor');
for(const decision of decisions){const consequence=consequences.find(event=>event.sourceDecisionId===decision.id);check(Boolean(consequence),`${decision.id}: missing consequence`);for(const choice of decision.choices)check(Boolean(consequence?.choiceOutcomes?.[choice.memoryKey]),`${choice.id}: missing option-specific consequence`)}
const divergent=decisions.every(decision=>new Set(decision.choices.map(choice=>JSON.stringify(choice.effects))).size>=2);check(divergent,'one or more decisions have identical state effects');

console.log(JSON.stringify({trackFixtures:Object.keys(trackFixtures).length,semanticGuards:25,decisions:decisions.length,consequences:consequences.length,failures},null,2));if(failures.length)process.exit(1);
