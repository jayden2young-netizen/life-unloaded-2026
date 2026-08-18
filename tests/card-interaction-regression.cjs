const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {launchChromium}=require('./playwright-runtime.cjs');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.CARD_INTERACTION_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-card-interaction');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
fs.mkdirSync(OUT,{recursive:true});

const interaction=(mode,episode=false)=>{let fallback=null;for(const event of decisions)if(Boolean(event.episode)===episode){const index=event.choices.findIndex(choice=>choice.cardInteraction?.mode===mode&&!choice.debtGate&&!choice.housingChoiceKind);if(index>=0)return{event,index,choice:event.choices[index]};const anyIndex=event.choices.findIndex(choice=>choice.cardInteraction?.mode===mode);if(anyIndex>=0&&!fallback)fallback={event,index:anyIndex,choice:event.choices[anyIndex]}}if(fallback)return fallback;throw new Error(`missing ${mode}/${episode?'episode':'ordinary'} interaction`)};
const cardFor=mechanic=>data.cards.find(card=>card.mechanic===mechanic);
const snapshot=page=>page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());

async function forceOrdinary(page,target,cards){
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:value.cards,cardAges:[0],phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{cards});
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),target.event.id),target.event.id);
  return snapshot(page);
}

(async()=>{
  const choices=decisions.flatMap(event=>event.choices);
  const activeInteractions=choices.filter(choice=>choice.cardInteraction);
  assert.ok(choices.every(choice=>Array.isArray(choice.mechanicTags)&&Object.hasOwn(choice,'cardInteraction')),'every choice has explicit card fields');
  assert.ok(activeInteractions.every(choice=>choice.cardInteraction.source==='eventAuthored'),'every active interaction comes from event-authored configuration');
  assert.equal(activeInteractions.filter(choice=>choice.cardInteraction.explanation).length,8);
  assert.equal(activeInteractions.filter(choice=>choice.cardInteraction.resultSuffix).length,2);
  assert.ok(activeInteractions.every(choice=>!choice.cardInteraction.explanation?.includes('准备')&&!choice.cardInteraction.resultSuffix?.includes('你这次走的是')),'no template recap survives');
  assert.deepEqual(data.cardInteractionCoverage,{decisionPanels:214,activePanels:203,interactions:212,witnesses:2});
  assert.deepEqual(new Set(choices.filter(choice=>choice.cardInteraction).map(choice=>choice.cardInteraction.mode)),new Set(['unlock','requirementShift','costShift','riskShift','resultVariant']));
  assert.equal(activeInteractions.filter(choice=>choice.cardInteraction.scope==='family').length,2);
  assert.ok(activeInteractions.every(choice=>['family','general'].includes(choice.cardInteraction.scope)));
  assert.deepEqual(data.cards.filter(card=>['card_71','card_73'].includes(card.id)).map(card=>[card.id,card.interactionScope]),[['card_71','family'],['card_73','general']]);

  const browser=await launchChromium();
  try{
    const errors=[];
    const context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:10,gameVersion:'0.5.12',meta:{histories:[{title:'旧人生'}],codex:['codex_01'],settings:{haptic:false},stats:{runs:1},seen:{events:{beat_001:1},cards:{},families:{},endings:{}},recentSeeds:['old']},run:{schemaVersion:10,gameVersion:'0.5.12',phase:'playing',age:20}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[14,'0.7.0',null]);
    assert.equal(migrated.meta.histories[0].title,'旧人生');
    await page.evaluate(key=>localStorage.removeItem(key),SAVE_KEY);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    await page.locator('[data-act="new"]').click();await page.locator('[data-act="birth-next"]').click();await page.locator('[data-act="random-attributes"]').click();await page.locator('[data-act="attributes-done"]').click();await page.locator('[data-card]').first().click();

    const heldAge55=data.cards.filter(card=>card.drawAge===55&&!['card_71','card_73'].includes(card.id)).map(card=>card.id);
    let drawOptions=await page.evaluate(held=>{window.__LIFE_DEBUG__.patchRun({people:[],relationships:{childCount:0},cards:held,cardAges:[0,18,35],phase:'playing',sceneQueue:[],currentDecision:null});return window.__LIFE_DEBUG__.forceCardDraw(55)},heldAge55);
    assert.deepEqual(drawOptions.map(card=>card.id),['card_73'],'child-free draw exposed the child-only boundary card');
    const drawChild={id:'card_scope_child',relation:'child',bornAt:40,alive:true,status:'living',bond:60,legalStatus:'biological'};
    drawOptions=await page.evaluate(({held,child})=>{window.__LIFE_DEBUG__.patchRun({people:[child],relationships:{childCount:1},cards:held,cardAges:[0,18,35],phase:'playing',sceneQueue:[],currentDecision:null});return window.__LIFE_DEBUG__.forceCardDraw(55)},{held:heldAge55,child:drawChild});
    assert.deepEqual(drawOptions.map(card=>card.id),['card_71'],'parent draw exposed the child-free boundary card');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({cards:[],cardAges:[0],phase:'playing',sceneQueue:[],currentDecision:null}));

    const resultVariant=interaction('resultVariant',false),resultCard=cardFor(resultVariant.choice.cardInteraction.primaryMechanic);
    await forceOrdinary(page,resultVariant,[]);assert.equal(await page.locator('.card-active').count(),0);await page.locator(`[data-choice="${resultVariant.index}"]`).click();await page.waitForTimeout(240);
    let run=await snapshot(page);assert.equal(run.decisionHistory.at(-1).result,resultVariant.choice.resultText,'no-card result stays compatible');

    await forceOrdinary(page,resultVariant,[resultCard.id]);assert.equal(await page.locator('.card-active').count(),1);const markerText=await page.locator('.card-effect').innerText();assert.match(markerText,new RegExp(resultCard.displayName));assert.doesNotMatch(markerText,/undefined| · $/);assert.equal(await page.locator('.card-hand i').count(),1);const cardHandStyle=await page.locator('.card-hand').evaluate(node=>({border:getComputedStyle(node).borderTopWidth,background:getComputedStyle(node).backgroundColor}));assert.equal(cardHandStyle.border,'0px');assert.equal(cardHandStyle.background,'rgba(0, 0, 0, 0)');await page.waitForTimeout(320);await page.screenshot({path:path.join(OUT,'active-card-choice.png'),fullPage:true});await page.setViewportSize({width:320,height:568});await page.screenshot({path:path.join(OUT,'active-card-choice-320x568.png'),fullPage:false});await page.setViewportSize({width:360,height:773});await page.locator(`[data-choice="${resultVariant.index}"]`).click();await page.waitForTimeout(240);
    run=await snapshot(page);assert.equal(run.decisionHistory.at(-1).result,resultVariant.choice.resultText,'interaction without resultSuffix keeps the authored result');

    for(const mode of['costShift','riskShift']){
      const target=interaction(mode,false),card=cardFor(target.choice.cardInteraction.primaryMechanic);await forceOrdinary(page,target,[card.id]);await page.locator(`[data-choice="${target.index}"]`).click();await page.waitForTimeout(240);run=await snapshot(page);assert.equal(run.decisionHistory.at(-1).result,target.choice.resultText);
    }

    const specificEvent=decisions.find(event=>event.id==='decision_199'),specificTarget={event:specificEvent,index:0,choice:specificEvent.choices[0]},specificCard=cardFor(specificTarget.choice.cardInteraction.primaryMechanic);await forceOrdinary(page,specificTarget,[specificCard.id]);assert.match(await page.locator('.card-effect').innerText(),/发消息前/);await page.locator('[data-choice="0"]').click();await page.waitForTimeout(240);run=await snapshot(page);assert.ok(run.decisionHistory.at(-1).result.endsWith(specificTarget.choice.cardInteraction.resultSuffix),'meaningful resultSuffix stays visible');

    const sameMechanic=data.cards.filter(card=>card.mechanic===resultCard.mechanic);assert.ok(sameMechanic.length>=2);await forceOrdinary(page,resultVariant,[sameMechanic[1].id,sameMechanic[0].id]);assert.match(await page.locator('.card-effect').innerText(),new RegExp(sameMechanic[1].displayName),'earliest held matching card is primary');

    const eventMechanics=new Set(resultVariant.event.choices.map(choice=>choice.cardInteraction?.primaryMechanic).filter(Boolean)),passiveCards=[0,18,35,55].map(age=>data.cards.find(card=>card.drawAge===age&&!eventMechanics.has(card.mechanic)));assert.ok(passiveCards.every(Boolean));await forceOrdinary(page,resultVariant,passiveCards.map(card=>card.id));assert.equal(await page.locator('.card-active').count(),0);assert.equal(await page.locator('.card-hand i').count(),4);await page.setViewportSize({width:320,height:568});await page.waitForTimeout(320);await page.screenshot({path:path.join(OUT,'passive-four-card-hand-320x568.png'),fullPage:false});await page.setViewportSize({width:360,height:773});

    const unlock=interaction('unlock',true),unlockCard=cardFor(unlock.choice.cardInteraction.primaryMechanic);await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:[value.card],cardAges:[0],development:{languagePreparation:20,routeKnowledge:28,routeExposure:[]},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{card:unlockCard.id});assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),unlock.event.id),unlock.event.id);assert.equal(await page.locator(`[data-choice="${unlock.index}"]`).count(),1);assert.equal(await page.locator(`[data-choice="${unlock.index}"]`).isEnabled(),true);

    const shift=interaction('requirementShift',true),shiftCard=cardFor(shift.choice.cardInteraction.primaryMechanic);await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:[value.card],cardAges:[0],capabilities:{cashBuffer:1},education:{domesticOffer:true,domesticFundingReady:false},originHousehold:{assets:0,debt:999999,context:{educationBudget:0}},finance:{cash:7900},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{card:shiftCard.id});assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),shift.event.id),shift.event.id);assert.equal(await page.locator(`[data-choice="${shift.index}"]`).isEnabled(),true);await page.locator(`[data-choice="${shift.index}"]`).click();run=await snapshot(page);const cashAfterChoice=run.finance.cash;assert.equal(run.sceneQueue[0].kind,'result');const refreshPage=await context.newPage();refreshPage.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));refreshPage.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});await refreshPage.goto(URL,{waitUntil:'domcontentloaded'});await refreshPage.waitForFunction(()=>window.__LIFE_BOOTED__===true);run=await snapshot(refreshPage);assert.equal(run.finance.cash,cashAfterChoice,'refresh does not repeat the card patch');await refreshPage.evaluate(()=>window.__LIFE_DEBUG__.patchRun({activity:{mode:'childhood',funding:'family'},employment:{status:'none'},finance:{liabilities:[]}}));await refreshPage.locator('[data-act="episode-next"]').click();run=await snapshot(refreshPage);assert.equal(run.finance.cash,cashAfterChoice,'result confirmation does not repeat the card patch');await refreshPage.close();

    const reliableCard='card_79',guardedCard='card_81',delayCard='card_83';
    assert.deepEqual(await page.evaluate(cards=>{window.__LIFE_DEBUG__.patchRun({cards});return window.__LIFE_DEBUG__.ongoingModifiers()},[reliableCard,guardedCard,delayCard]),['reliableCarePressure','guardedPartnerBond','delayHelpSeeking']);
    const dependentChild={id:'modifier-child',relation:'child',bornAt:28,alive:true,status:'living'};
    const yearlyFixture={age:36,phase:'playing',timeline:[{id:'modifier-year',age:36}],activity:{mode:'work',years:1},employment:{status:'none',tenure:0},finance:{cash:500000,liabilities:[]},pressures:{money:10,family:10,career:10,body:10,loneliness:10},development:{careLoad:50},people:[dependentChild],relationships:{childCount:1},outcomeTags:{}};
    const baselineFamily=await page.evaluate(fixture=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[]});return window.__LIFE_DEBUG__.settleYear().pressures.family},yearlyFixture);
    const reliableFamily=await page.evaluate(({fixture,card})=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[card]});return window.__LIFE_DEBUG__.settleYear().pressures.family},{fixture:yearlyFixture,card:reliableCard});
    assert.equal(reliableFamily,baselineFamily+2,'靠得住 did not add pressure for a current dependent child');
    const historicalCareFixture={...yearlyFixture,people:[],relationships:{childCount:0},development:{careLoad:50}};
    const historicalCareBaseline=await page.evaluate(fixture=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[]});return window.__LIFE_DEBUG__.settleYear().pressures.family},historicalCareFixture);
    const historicalCareHeld=await page.evaluate(({fixture,card})=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[card]});return window.__LIFE_DEBUG__.settleYear().pressures.family},{fixture:historicalCareFixture,card:reliableCard});
    assert.equal(historicalCareHeld,historicalCareBaseline,'靠得住 treated a historical care load as a current responsibility');
    const ownCareFixture={...yearlyFixture,people:[],development:{careLoad:0},relationships:{childCount:0},later:{care:'needsSupport'}};
    const ownCareBaseline=await page.evaluate(fixture=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[]});return window.__LIFE_DEBUG__.settleYear().pressures.family},ownCareFixture);
    const ownCareHeld=await page.evaluate(({fixture,card})=>{window.__LIFE_DEBUG__.patchRun({...fixture,cards:[card]});return window.__LIFE_DEBUG__.settleYear().pressures.family},{fixture:ownCareFixture,card:reliableCard});
    assert.equal(ownCareHeld,ownCareBaseline,'靠得住 treated receiving care as caring for somebody else');

    const guardedPartner={id:'guarded-partner',relation:'partner',bornAt:0,alive:true,status:'living',bond:50};
    await page.evaluate(({card,partner})=>window.__LIFE_DEBUG__.patchRun({cards:[card],people:[partner],relationships:{partnerBond:50,partnerStatus:'partnered',activePartnerId:partner.id}}),{card:guardedCard,partner:guardedPartner});
    await page.evaluate(()=>window.__LIFE_DEBUG__.applyCommands([{type:'add',target:'relationships.partnerBond',value:10}]));
    assert.equal((await snapshot(page)).relationships.partnerBond,57,'嘴硬 did not weaken positive partner bond growth by 30%');
    await page.evaluate(partner=>window.__LIFE_DEBUG__.patchRun({people:[partner],relationships:{partnerBond:50}}),guardedPartner);
    await page.evaluate(()=>window.__LIFE_DEBUG__.applyCommands([{type:'add',target:'relationships.partnerBond',value:-10}]));
    assert.equal((await snapshot(page)).relationships.partnerBond,40,'嘴硬 incorrectly amplified negative partner bond damage');
    await page.evaluate(partner=>window.__LIFE_DEBUG__.patchRun({people:[partner],relationships:{partnerBond:50}}),guardedPartner);
    await page.evaluate(()=>window.__LIFE_DEBUG__.applyCommands([{type:'add',target:'relationships.partnerBond',value:1}]));
    assert.equal((await snapshot(page)).relationships.partnerBond,50.7,'嘴硬 did not weaken a small positive partner-bond gain');

    const delayedEvent=data.events.find(event=>event.id==='beat_299'),neutralHealth=data.events.find(event=>event.kind==='beat'&&event.track==='health'&&!event.helpDelay);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({cards:[]}));
    const baseWeights=await page.evaluate(({delayed,neutral})=>[window.__LIFE_DEBUG__.continuityWeight(delayed,true),window.__LIFE_DEBUG__.continuityWeight(neutral,true)],{delayed:delayedEvent.id,neutral:neutralHealth.id});
    await page.evaluate(card=>window.__LIFE_DEBUG__.patchRun({cards:[card]}),delayCard);
    const heldWeights=await page.evaluate(({delayed,neutral})=>[window.__LIFE_DEBUG__.continuityWeight(delayed,true),window.__LIFE_DEBUG__.continuityWeight(neutral,true)],{delayed:delayedEvent.id,neutral:neutralHealth.id});
    assert.ok(Math.abs(heldWeights[0]/baseWeights[0]-1.25)<1e-10,'不肯麻烦人 did not weight an explicitly marked delay-help event');
    assert.equal(heldWeights[1],baseWeights[1],'不肯麻烦人 changed an event without an explicit helpDelay marker');

    assert.deepEqual(errors,[]);
    await context.close();

    const reduced=await browser.newContext({viewport:{width:360,height:773},reducedMotion:'reduce'}),reducedPage=await reduced.newPage();await reducedPage.goto(URL,{waitUntil:'domcontentloaded'});await reducedPage.waitForFunction(()=>window.__LIFE_BOOTED__===true);await reducedPage.locator('[data-act="new"]').click();await reducedPage.locator('[data-act="birth-next"]').click();await reducedPage.locator('[data-act="random-attributes"]').click();await reducedPage.locator('[data-act="attributes-done"]').click();assert.equal(await reducedPage.locator('.card-draw-pulse').evaluate(node=>getComputedStyle(node).animationName),'none');await reduced.close();
    console.log(JSON.stringify({ok:true,modes:['unlock','requirementShift','costShift','riskShift','resultVariant'],ongoingModifiers:['reliableCarePressure','guardedPartnerBond','delayHelpSeeking'],migration:'schema-10-run-cleared-meta-preserved',refresh:'single card patch',reducedMotion:'static',screenshot:path.join(OUT,'active-card-choice.png')},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
