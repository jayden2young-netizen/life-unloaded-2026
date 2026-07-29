const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.CARD_INTERACTION_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.6.3-cards');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
fs.mkdirSync(OUT,{recursive:true});

const interaction=(mode,episode=false)=>{for(const event of decisions)if(Boolean(event.episode)===episode){const index=event.choices.findIndex(choice=>choice.cardInteraction?.mode===mode);if(index>=0)return{event,index,choice:event.choices[index]}}throw new Error(`missing ${mode}/${episode?'episode':'ordinary'} interaction`)};
const cardFor=mechanic=>data.cards.find(card=>card.mechanic===mechanic);
const snapshot=page=>page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());

async function forceOrdinary(page,target,cards){
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:value.cards,cardAges:[0],phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{cards});
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),target.event.id),target.event.id);
  return snapshot(page);
}

(async()=>{
  assert.deepEqual([data.version,data.schemaVersion,data.contentRevision],['0.6.3',11,21]);
  const choices=decisions.flatMap(event=>event.choices);
  assert.ok(choices.every(choice=>Array.isArray(choice.mechanicTags)&&Object.hasOwn(choice,'cardInteraction')),'every choice has explicit card fields');
  assert.deepEqual(data.cardInteractionCoverage,{decisionPanels:162,activePanels:162,interactions:164,witnesses:2});
  assert.deepEqual(new Set(choices.filter(choice=>choice.cardInteraction).map(choice=>choice.cardInteraction.mode)),new Set(['unlock','requirementShift','costShift','riskShift','resultVariant']));

  const browser=await chromium.launch({headless:true,...(fs.existsSync(CHROME)?{executablePath:CHROME}:{})});
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
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[11,'0.6.3',null]);
    assert.equal(migrated.meta.histories[0].title,'旧人生');
    await page.evaluate(key=>localStorage.removeItem(key),SAVE_KEY);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    await page.locator('[data-act="new"]').click();await page.locator('[data-act="birth-next"]').click();await page.locator('[data-act="random-attributes"]').click();await page.locator('[data-act="attributes-done"]').click();await page.locator('[data-card]').first().click();

    const resultVariant=interaction('resultVariant',false),resultCard=cardFor(resultVariant.choice.cardInteraction.primaryMechanic);
    await forceOrdinary(page,resultVariant,[]);assert.equal(await page.locator('.card-active').count(),0);await page.locator(`[data-choice="${resultVariant.index}"]`).click();await page.waitForTimeout(240);
    let run=await snapshot(page);assert.equal(run.decisionHistory.at(-1).result,resultVariant.choice.resultText,'no-card result stays compatible');

    await forceOrdinary(page,resultVariant,[resultCard.id]);assert.equal(await page.locator('.card-active').count(),1);assert.match(await page.locator('.card-effect').innerText(),new RegExp(resultCard.displayName));assert.equal(await page.locator('.card-hand i').count(),1);const cardHandStyle=await page.locator('.card-hand').evaluate(node=>({border:getComputedStyle(node).borderTopWidth,background:getComputedStyle(node).backgroundColor}));assert.equal(cardHandStyle.border,'0px');assert.equal(cardHandStyle.background,'rgba(0, 0, 0, 0)');await page.waitForTimeout(320);await page.screenshot({path:path.join(OUT,'active-card-choice.png'),fullPage:true});await page.setViewportSize({width:320,height:568});await page.screenshot({path:path.join(OUT,'active-card-choice-320x568.png'),fullPage:false});await page.setViewportSize({width:360,height:773});await page.locator(`[data-choice="${resultVariant.index}"]`).click();await page.waitForTimeout(240);
    run=await snapshot(page);assert.match(run.decisionHistory.at(-1).result,new RegExp(resultVariant.choice.cardInteraction.resultSuffix));

    for(const mode of['costShift','riskShift']){
      const target=interaction(mode,false),card=cardFor(target.choice.cardInteraction.primaryMechanic);await forceOrdinary(page,target,[card.id]);await page.locator(`[data-choice="${target.index}"]`).click();await page.waitForTimeout(240);run=await snapshot(page);assert.match(run.decisionHistory.at(-1).result,new RegExp(target.choice.cardInteraction.resultSuffix));
    }

    const sameMechanic=data.cards.filter(card=>card.mechanic===resultCard.mechanic);assert.ok(sameMechanic.length>=2);await forceOrdinary(page,resultVariant,[sameMechanic[1].id,sameMechanic[0].id]);assert.match(await page.locator('.card-effect').innerText(),new RegExp(sameMechanic[1].displayName),'earliest held matching card is primary');

    const eventMechanics=new Set(resultVariant.event.choices.map(choice=>choice.cardInteraction?.primaryMechanic).filter(Boolean)),passiveCards=[0,18,35,55].map(age=>data.cards.find(card=>card.drawAge===age&&!eventMechanics.has(card.mechanic)));assert.ok(passiveCards.every(Boolean));await forceOrdinary(page,resultVariant,passiveCards.map(card=>card.id));assert.equal(await page.locator('.card-active').count(),0);assert.equal(await page.locator('.card-hand i').count(),4);await page.setViewportSize({width:320,height:568});await page.waitForTimeout(320);await page.screenshot({path:path.join(OUT,'passive-four-card-hand-320x568.png'),fullPage:false});await page.setViewportSize({width:360,height:773});

    const unlock=interaction('unlock',true),unlockCard=cardFor(unlock.choice.cardInteraction.primaryMechanic);await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:[value.card],cardAges:[0],development:{languagePreparation:20,routeKnowledge:28,routeExposure:[]},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{card:unlockCard.id});assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),unlock.event.id),unlock.event.id);await page.locator('[data-act="episode-next"]').click();assert.equal(await page.locator(`[data-choice="${unlock.index}"]`).count(),1);assert.equal(await page.locator(`[data-choice="${unlock.index}"]`).isEnabled(),true);

    const shift=interaction('requirementShift',true),shiftCard=cardFor(shift.choice.cardInteraction.primaryMechanic);await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({cards:[value.card],cardAges:[0],capabilities:{cashBuffer:1},education:{domesticOffer:true,domesticFundingReady:false},originHousehold:{assets:0,debt:999999,context:{educationBudget:0}},finance:{cash:7900},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}),{card:shiftCard.id});assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),shift.event.id),shift.event.id);await page.locator('[data-act="episode-next"]').click();assert.equal(await page.locator(`[data-choice="${shift.index}"]`).isEnabled(),true);await page.locator(`[data-choice="${shift.index}"]`).click();run=await snapshot(page);const cashAfterChoice=run.finance.cash;assert.equal(run.sceneQueue[0].kind,'result');const refreshPage=await context.newPage();refreshPage.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));refreshPage.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});await refreshPage.goto(URL,{waitUntil:'domcontentloaded'});await refreshPage.waitForFunction(()=>window.__LIFE_BOOTED__===true);run=await snapshot(refreshPage);assert.equal(run.finance.cash,cashAfterChoice,'refresh does not repeat the card patch');await refreshPage.evaluate(()=>window.__LIFE_DEBUG__.patchRun({activity:{mode:'childhood',funding:'family'},employment:{status:'none'},finance:{liabilities:[]}}));await refreshPage.locator('[data-act="episode-next"]').click();run=await snapshot(refreshPage);assert.equal(run.finance.cash,cashAfterChoice,'result confirmation does not repeat the card patch');await refreshPage.close();

    assert.deepEqual(errors,[]);
    await context.close();

    const reduced=await browser.newContext({viewport:{width:360,height:773},reducedMotion:'reduce'}),reducedPage=await reduced.newPage();await reducedPage.goto(URL,{waitUntil:'domcontentloaded'});await reducedPage.waitForFunction(()=>window.__LIFE_BOOTED__===true);await reducedPage.locator('[data-act="new"]').click();await reducedPage.locator('[data-act="birth-next"]').click();await reducedPage.locator('[data-act="random-attributes"]').click();await reducedPage.locator('[data-act="attributes-done"]').click();assert.equal(await reducedPage.locator('.card-draw-pulse').evaluate(node=>getComputedStyle(node).animationName),'none');await reduced.close();
    console.log(JSON.stringify({ok:true,modes:['unlock','requirementShift','costShift','riskShift','resultVariant'],migration:'schema-10-run-cleared-meta-preserved',refresh:'single card patch',reducedMotion:'static',screenshot:path.join(OUT,'active-card-choice.png')},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
