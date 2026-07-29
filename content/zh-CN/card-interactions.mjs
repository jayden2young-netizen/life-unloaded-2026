const modes={
  evidence:'resultVariant',portableSkill:'resultVariant',cashBuffer:'costShift',healthLiteracy:'riskShift',
  riskSense:'riskShift',resilience:'riskShift',boundary:'resultVariant',network:'resultVariant',
  learning:'resultVariant',creativity:'resultVariant',careSkill:'resultVariant',negotiation:'resultVariant'
};

const explanations={
  evidence:'你留好的记录这次派上了用场。',portableSkill:'你把会做的事换成了眼前能用的办法。',
  cashBuffer:'你手里那点缓冲，替这一步垫住了一部分。',healthLiteracy:'你没有把身体给出的信号当成小事。',
  riskSense:'你先把最容易出事的地方看了一遍。',resilience:'事情没变轻，你还是给自己留住了下一步。',
  boundary:'你把不该自己吞下的那部分说清了。',network:'有人肯把靠谱的消息递到你手里。',
  learning:'你把眼前的难处拆成了能动手的一小步。',creativity:'你换了个做法，没只剩原来的那条路。',
  careSkill:'你把人和日子都多照看了一点。',negotiation:'你把条件放到桌面上谈，没有只靠猜。'
};

const suffixes={
  evidence:'留好的记录也一起递了出去。',portableSkill:'你把手里的本事落到了实处。',
  cashBuffer:'那点缓冲替你顶住了眼前的一截。',healthLiteracy:'你没有把该问清的地方含糊过去。',
  riskSense:'你先避开了最容易翻车的一步。',resilience:'你没有立刻被这一下打散。',
  boundary:'这次你把自己的界线留住了。',network:'有人替你补上了一条可靠消息。',
  learning:'你换了个办法，继续把这件事往下做。',creativity:'你没有只按旧路走。',careSkill:'你把该照看的部分先安顿好了。',negotiation:'这次的条件被说得更明白。'
};

const trackRotations={
  education:['evidence','learning','network','cashBuffer','learning','evidence','resilience','network','portableSkill','learning','evidence','cashBuffer'],
  employment:['portableSkill','network','negotiation','evidence','learning','riskSense','resilience','cashBuffer','portableSkill','network','negotiation','evidence'],
  public:['evidence','learning','negotiation','network','resilience','evidence','riskSense','portableSkill'],
  remote:['portableSkill','network','riskSense','learning','resilience','negotiation','evidence'],
  business:['riskSense','cashBuffer','negotiation','evidence','portableSkill','resilience','network','creativity'],
  leisure:['cashBuffer','boundary','resilience','creativity','riskSense','network','learning','negotiation'],
  partnership:['negotiation','boundary','network','resilience','careSkill','evidence','negotiation','boundary','network','resilience'],
  children:['careSkill','resilience','cashBuffer','boundary','negotiation','healthLiteracy','careSkill','network','resilience','learning'],
  finance:['evidence','riskSense','cashBuffer','negotiation','boundary','resilience','evidence','riskSense'],
  health:['healthLiteracy','resilience','careSkill','boundary','riskSense','network','learning','healthLiteracy'],
  habits:['resilience','boundary','healthLiteracy','network','riskSense','careSkill','resilience','boundary','healthLiteracy','network'],
  later:['careSkill','evidence','negotiation','healthLiteracy','boundary','network','riskSense','resilience','careSkill'],
  identity:['creativity','resilience']
};

const universalRotation=['evidence','portableSkill','cashBuffer','healthLiteracy','riskSense','resilience','negotiation','network','learning','creativity','careSkill','boundary'];
const rotations=Object.fromEntries(Object.keys(trackRotations).map(track=>[track,universalRotation]));
const rotationOffsets={education:0,employment:1,public:2,remote:3,business:4,leisure:5,partnership:6,children:7,finance:8,health:9,habits:10,later:11,identity:4};
const pressureForTrack={education:'career',employment:'career',public:'career',remote:'loneliness',business:'money',leisure:'money',partnership:'family',children:'family',finance:'money',health:'body',habits:'body',later:'family',identity:'loneliness'};

const genericPatch=(mechanic,track)=>{
  if(mechanic==='cashBuffer')return[{type:'add',target:'finance.cash',value:1200}];
  if(['healthLiteracy','riskSense','resilience'].includes(mechanic))return[{type:'add',target:`pressures.${pressureForTrack[track]||'money'}`,value:-2}];
  if(mechanic==='network')return[{type:'add',target:'relationships.network',value:2}];
  if(mechanic==='boundary')return[{type:'add',target:'agency',value:1}];
  if(mechanic==='careSkill')return[{type:'add',target:'relationships.originBond',value:1}];
  if(['portableSkill','learning'].includes(mechanic))return[{type:'add',target:'capabilities.skill',value:1}];
  if(mechanic==='creativity')return[{type:'add',target:'desires.creation.fulfillment',value:1}];
  if(mechanic==='negotiation')return[{type:'add',target:'agency',value:1}];
  return[{type:'add',target:'capabilities.evidence',value:1}];
};

const genericInteraction=(mechanic,track)=>({primaryMechanic:mechanic,mode:modes[mechanic],explanation:explanations[mechanic],patch:genericPatch(mechanic,track),resultSuffix:suffixes[mechanic]});

export function cardInteractionFor(track,index,option){
  const rotation=rotations[track];
  if(!rotation)return null;
  if(track==='education'&&index===3&&option===1)return{
    primaryMechanic:'network',mode:'unlock',explanation:'有人把可靠的申请信息递到了你手里。',patch:[{type:'expose',target:'development.routeExposure',value:'overseas'}],resultSuffix:'那条原本够不着的信息线，终于接上了。',
    activeShowWhen:{all:[],any:[],none:[]},activeRequirements:{all:[{path:'development.languagePreparation',op:'gte',value:8},{path:'development.routeKnowledge',op:'gte',value:18}],any:[],none:[]}
  };
  if(track==='education'&&index===5&&option===0)return{
    primaryMechanic:'cashBuffer',mode:'requirementShift',explanation:'你留的缓冲，补上了首年费用里最急的一截。',patch:[{type:'add',target:'finance.cash',value:-1200}],resultSuffix:'你没有把那笔缓冲当成已经不存在。',
    activeRequirements:{all:[{path:'education.domesticOffer',op:'eq',value:true}],any:[{path:'education.domesticFundingReady',op:'eq',value:true},{path:'capabilities.cashBuffer',op:'gte',value:1}],none:[]}
  };
  if(track==='education'&&index===5&&option===3)return{
    primaryMechanic:'evidence',mode:'resultVariant',explanation:'你把退件、成绩和资金缺口分开整理，第二次不会从空白开始。',patch:[{type:'add',target:'capabilities.evidence',value:1}],resultSuffix:'材料夹里哪些还能用、哪些必须重做，这次写得很清楚。',
    activeRequirements:{all:[{path:'education.extraApplicationYearUsed',op:'eq',value:false}],any:[],none:[]}
  };
  if(option!==0)return null;
  const mechanic=rotation[(index+(rotationOffsets[track]||0))%rotation.length];
  return genericInteraction(mechanic,track);
}

export const CARD_INTERACTION_WITNESSES=[{
  id:'network-opens-overseas-preparation',track:'education',index:3,choice:1,mechanic:'network',cardDrawAge:0,
  state:{development:{languagePreparation:20,routeKnowledge:28,routeExposure:[]}}
},{
  id:'evidence-organizes-shared-undergraduate-retry',track:'education',index:5,choice:3,mechanic:'evidence',cardDrawAge:0,
  state:{education:{extraApplicationYearUsed:false}}
}];
