import {beat as b,choice as authoredChoice,track} from './helpers.mjs';

const p=(path,op,value)=>({path,op,value});
const req=(all=[],any=[],none=[])=>({all,any,none});
const add=(target,value)=>({type:'add',target,value});
const c=(text,resultText,consequenceText,extra={})=>authoredChoice(
  text,resultText,consequenceText,{consequenceEffects:[],...extra}
);
const createSocial=(slot,displayName,source,extra={})=>({
  type:'createSocialPerson',target:'people',value:{slot,displayName,source,...extra}
});
const updateSocial=(value)=>({type:'updateSocialPerson',target:'people',value});
const toDating=(value)=>({type:'transitionSocialToDating',target:'relationships.partnerStatus',value});
const referral=(value)=>({type:'createEmploymentReferral',target:'employment',value});
const coResidence=(value)=>({type:'socialCoResidence',target:'housing',value});
const actor=(personIdPath,extra={})=>({
  slot:'socialPerson',relation:'social',alive:true,personIdPath,optional:false,...extra
});
const variant=(id,weight,resultText,consequenceText,effects=[],extra={})=>({
  id,weight,resultText,consequenceText,effects,...extra
});
const sd=(age,requirements,situation,prompt,echoText,choices,extra={})=>({
  age,requirements,situation,prompt,echoText,choices,...extra
});

// 24 beats：童年 3、校园 3、同事 5、室友／邻居 4、兴趣圈 3、线上 3、迁移／重逢／晚年 3。
const beats=[
  // 童年同学与学校日常（3）
  b('ordinary','同学录传到你手里，前一页还在认真写“常联系”。',{age:[8,18],effects:[]}),
  b('ordinary','放学队伍散到两个路口，第二天还是在同一排座位见面。',{age:[7,18],effects:[]}),
  b('friction','转学后的班群一直没退，头像换了几轮，能叫出名字的人越来越少。',{age:[9,25],effects:[]}),

  // 校园、宿舍与社团（3）
  b('awkward','宿舍群说好十一点以后戴耳机，十一点零五分先出现一串“谁还没睡”。',{age:[17,30],requirements:req([p('education.status','eq','enrolled')]),effects:[]}),
  b('ordinary','阿宁替你占了食堂角落的座位，没问成绩，只问今天吃不吃辣。',{age:[18,32],requirements:req([p('education.status','eq','enrolled')]),actors:[actor('social.primaryPersonId',{socialSource:'campus',socialTieAny:['friend','close'],socialProximity:'local'})],effects:[add('relationships.network',1)]}),
  b('ordinary','毕业照发进社团群，接龙从聚餐时间一路歪到谁还留在这座城。',{age:[20,32],requirements:req([p('education.status','in',['enrolled','completed'])]),effects:[]}),

  // 同事、合作与职场人情（5）
  b('ordinary','午饭群每天十一点半问吃什么，真正决定方向的是谁先按下电梯。',{age:[18,68],requirements:req([], [p('employment.status','in',['employed','gig','selfEmployed'])]),effects:[]}),
  b('awkward','群公告写着聚餐自愿，报名表最后一栏却是“不能来的原因”。',{age:[18,68],requirements:req([p('employment.status','eq','employed')]),effects:[]}),
  b('ordinary','旧同事转来一张内部招聘截图，先提醒你别只看职位名称。',{age:[22,68],requirements:req([], [p('employment.status','in',['employed','unemployed','gig'])]),effects:[add('capabilities.network',1)]}),
  b('ordinary','小周把会议纪要抄送给你，也把午休时那句抱怨留在了线下。',{age:[22,68],actors:[actor('social.secondaryPersonId',{socialSource:'work',socialTieAny:['friend','close'],socialProximity:'local'})],effects:[add('relationships.network',1)]}),
  b('friction','离职群退得很快。以前每天一起吃饭的人，后来只在朋友圈互相点过一次赞。',{age:[22,70],requirements:req([p('employment.status','notIn',['employed','selfEmployed'])]),effects:[]}),

  // 室友、邻居与社区（4）
  b('friction','合租群为几十块电费翻到冰箱格，最后还是有人重新拍了电表。',{age:[18,65],requirements:req([p('housing.arrangement','eq','shared')]),effects:[]}),
  b('awkward','物业群接龙找高空抛物，真正有用的消息夹在二十多个表情包中间。',{age:[18,90],effects:[]}),
  b('ordinary','你把小区停水通知转给那位旧识，对方回了个“收到，桶已经接上”。',{age:[20,85],actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close'],socialProximity:'local'})],effects:[add('relationships.network',1)]}),
  b('ordinary','搬家纸箱堵住门口时，对方来替你守了半小时快递，没有接管余下的生活。',{age:[20,75],requirements:req([p('housing.stability','in',['conditional','temporary'])]),actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close'],socialProximity:'local'})],effects:[add('pressures.loneliness',-1)]}),

  // 兴趣圈（3）
  b('ordinary','徒步群出发前把集合点、难度和退出路线发了三遍。',{age:[18,75],effects:[]}),
  b('awkward','球局临时少一人，群里每个“马上到”都有不同的时间单位。',{age:[16,70],effects:[]}),
  b('ordinary','活动散场后，那位旧识还记得你不喝太甜的，给你留了无糖那杯。',{age:[18,80],actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close'],socialProximity:'local'})],effects:[add('relationships.network',1)]}),

  // 线上关系（3）
  b('ordinary','同城帖下面很快排起“蹲一个”，真正约好时间的人少得多。',{age:[18,55],effects:[]}),
  b('ordinary','游戏语音散场以后，有人仍记得问你第二天要不要早起。',{age:[16,65],effects:[]}),
  b('pressure','你在群里发出一条具体邀约，消息被新的链接和团购接龙顶了上去。',{age:[18,90],requirements:req([p('social.latestIntent','eq','connect')]),effects:[add('pressures.loneliness',3)]}),

  // 迁移、重逢与晚年（3）
  b('ordinary','搬到新城市后，通讯录没有变短，能临时叫出来吃饭的人却要重新数。',{age:[18,70],requirements:req([], [p('mobility.mode','in',['domesticNomad','overseasNomad','studyAbroad']),p('housing.stability','eq','temporary')]),effects:[]}),
  b('ordinary','隔着时区，那位旧识还是会在你复诊或搬家那天问一句到家没有。',{age:[30,105],actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close','distant'],socialProximity:'remote'})],effects:[add('pressures.loneliness',-1)]}),
  b('ordinary','你拒绝了临时活动，把下午留给一顿慢饭和没看完的书，屋里安静但不空。',{age:[18,105],requirements:req([p('social.latestIntent','eq','solitude')]),effects:[add('desires.peace.fulfillment',1)]})
];

const decisions=[
  // 1／8：童年或校园旧识重新联系（2 选；结果保持开放，不把一次消息写成终身关系）。
  sd([16,45],req(),
    '整理旧照片时，你翻到一张同学录。对方的现用账号还能搜到，最近一条公开动态停在半年前；要不要发消息，只有你能决定。',
    '这条旧消息，发不发？','那张同学录后来仍夹在旧照片里，旁边多了一次发送或一次停下。',[
      c('发一句具体的近况','你写了自己是谁，也问了对方现在过得怎样，没有先约下一次见面。','那条消息留下了已送达；关系会不会继续，还得等另一个人回应。',{route:'reachedOut',effects:[add('relationships.network',1)],outcomeTags:['social:intent:connect','social:childhood:reachedOut']}),
      c('先不打扰','你关掉搜索页，把照片重新放好，没有编一个忙碌的理由。','旧名字没有被删掉，这次也没有变成新的联系。',{route:'leftAlone',effects:[add('desires.peace.fulfillment',1)],outcomeTags:['social:childhood:leftAlone']})
    ]),

  // 2／8：校园边界与关系转折（3 选；有界稳定随机之一）。
  sd([17,30],req([p('education.status','eq','enrolled'),p('social.primaryPersonId','eq',null)]),
    '宿舍和社团的时间挤在一起。阿宁常和你吃饭，也开始默认借你的东西、替你报名；今晚又把你的名字填进了周末值班表。',
    '这段校园关系怎么谈？','后来再看到那张值班表，你会想起关系是从哪句话靠近，或从哪一步退开。',[
      c('把作息和边界说开','你约阿宁在食堂谈清借东西、代报名和各自要留的时间。','那次谈话没有替以后作保证，却把两个人真正能接受的相处方式说清了。',{route:'talked',effects:[add('capabilities.boundary',2)],outcomeTags:['social:intent:connect','social:campus:turn'],socialOutcome:{variants:[
        variant('campus_deepened',45,'阿宁先道了歉，也把自己介意的事说出来。你们重新排了值班。','毕业以后，你们不再天天见，遇到大事仍知道该找谁。',[createSocial('primary','阿宁','campus',{tie:'close',proximity:'local',turn:'deepened',support:'unseen'}),add('relationships.network',3)],{outcomeTags:['social:turn:deepened']}),
        variant('campus_steady',35,'阿宁改掉这次报名，之后相处仍停在一起吃饭、偶尔搭把手。','后来你们保持普通联系，不必把每次同路都叫作知己。',[add('relationships.network',1)],{outcomeTags:['social:turn:steady']}),
        variant('campus_friction',20,'阿宁觉得你太计较，退出了那次值班，也少来宿舍找你。','边界保住了，这段来往则慢慢退回点头之交。',[add('pressures.loneliness',1)],{outcomeTags:['social:turn:friction']})
      ]}}),
      c('先各过各的','你退出周末值班，也把借出去的东西收回来，没有要求对方理解。','校园里照样有人来往，你给自己留出的那段时间也是真的。',{route:'keptSpace',effects:[add('capabilities.boundary',2),add('desires.peace.fulfillment',1)],outcomeTags:['social:intent:solitude','social:campus:space']}),
      c('换个活动小组','你向组织者说明排班不是自己填的，转去另一个小组。','旧群还在列表里，之后的活动不再默认算上你。',{route:'changedCircle',effects:[add('capabilities.boundary',1)],outcomeTags:['social:campus:exit']})
    ]),

  // 3／8：下班聚餐（3 选）。
  sd([18,68],req([p('employment.status','eq','employed')]),
    '部门群临下班发来聚餐定位，公告写着自愿参加。你明早有自己的安排，打车和饭钱也得自己出；同事说新项目可能会在桌上先透口风。',
    '今晚去不去？','那次聚餐以后，有人记住你到过，也有人记住你把下班时间留给了自己。',[
      c('去坐一会儿就走','你先说好离开时间，AA 转账后赶上了末班车。','你听到几句工作消息，也没有把整晚都交给酒桌。',{route:'brieflyJoined',effects:[add('relationships.network',2),add('finance.cash',-180),add('pressures.body',1)],outcomeTags:['social:intent:connect','social:work:dinner']}),
      c('说明有安排，不去','你在群里回了不参加，手上的交接照常做完。','拒绝没有带来秘密惩罚；项目消息仍应回到正式渠道。',{route:'declinedClearly',effects:[add('capabilities.boundary',2),add('desires.peace.fulfillment',1)],outcomeTags:['social:intent:solitude','social:work:declined']}),
      c('不解释，按时走','你关电脑离开，第二天有人问起时也只说昨晚有事。','关系没有因此自动坏掉，没听见的饭桌消息也确实错过了。',{route:'leftOnTime',effects:[add('capabilities.boundary',1),add('pressures.career',1)],outcomeTags:['social:work:left']})
    ]),

  // 4／8：工作人情、合法线索与第二个持续人物（2 选）。
  sd([22,68],req([p('employment.status','eq','employed'),p('social.primaryPersonId','truthy',true),p('social.secondaryPersonId','eq',null)]),
    '小周请你帮忙补一份内部材料，其中有两项能核实，一项却要你替别人签字。对方也转来一张公开招聘截图，说外部申请照样要过资格审核。',
    '这份人情，帮到哪里？','后来你和小周还会联系；那张招聘截图则一直只是入口，不是一份工作。',[
      c('只帮能核实的部分','你补齐自己见过的事实，拒绝代签。小周把岗位联系人和截止日发得更完整。','你们成了会在工作之外说实话的人；岗位能不能拿到，仍看材料和资格。',{route:'boundedHelp',effects:[createSocial('secondary','小周','work',{tie:'friend',proximity:'local',turn:'deepened',support:'unseen'}),referral({slot:'secondary',status:'available'}),add('relationships.network',2),add('capabilities.evidence',1)],outcomeTags:['social:intent:connect','social:work:boundedHelp','social:bridge:employment']}),
      c('不替这份材料背书','你把不能确认的地方退回去，也没有接那条岗位线索。','小周有些失望，材料上没有多出你的名字；以后仍可能只是普通同事。',{route:'refusedFavor',effects:[add('capabilities.boundary',2),add('pressures.career',1)],outcomeTags:['social:work:refusedFavor']})
    ]),

  // 5／8：朋友／室友提出合住或临时落脚（4 选）。
  sd([20,75],req(),
    '那位朋友发来一套合租房的合同和账单，也说自己家里可以临时腾出一块地方。租金、通勤、作息和多久搬走都要写清，关系好不能替代住房资格。',
    '住处要不要和朋友绑在一起？','钥匙、租约或一句拒绝，后来都比“朋友之间好商量”更管用。',[
      c('一起核合同再合租','你们逐项看过租约、押金和公共开支，再把自己的名字签上。','同住让房租和日常有了新分法，友情仍要面对垃圾、作息和搬离日期。',{route:'sharedHome',housingChoiceKind:'socialCoResidence',effects:[coResidence({personId:'$actor',status:'renting',value:0,stability:'conditional',accessibility:'standard',kind:'choice',housingChoiceKind:'socialCoResidence',residenceOnly:false,reason:'socialSharedHome'}),add('capabilities.riskSense',1)],outcomeTags:['social:bridge:housing','social:housing:shared']}),
      c('只借住一小段','你们写下搬入、搬出和分担开支的日期，你只带了眼下要用的东西。','临时落脚接住了一段难处，没有把原来的产权、按揭或债务写没。',{route:'temporaryStay',housingChoiceKind:'socialCoResidence',effects:[coResidence({personId:'$actor',status:'supported',value:0,stability:'temporary',accessibility:'standard',kind:'choice',housingChoiceKind:'socialCoResidence',residenceOnly:true,reason:'socialTemporaryStay'})],outcomeTags:['social:bridge:housing','social:housing:temporary']}),
      c('各住各的，互留钥匙','你没有搬家，只约好紧急时怎样联系，备用钥匙也写清什么时候归还。','距离没有并成一个地址，能帮到哪里反而更明白。',{route:'nearbySeparate',effects:[updateSocial({personId:'$actor',turn:'deepened'}),add('relationships.network',1)],outcomeTags:['social:housing:separate']}),
      c('这次不合住','你直说作息、钱或边界不合适，没有拿“再看看”拖着对方。','房源另找了人，你保住自己的住法，也放弃了这次住房机会。',{route:'declinedHousing',effects:[add('capabilities.boundary',2)],outcomeTags:['social:housing:declined']})
    ],{actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close'],socialProximity:'local'})]}),

  // 6／8：兴趣圈／线上搭子的第一次见面（3 选；有界稳定随机之一）。
  sd([18,45],req([p('social.primaryPersonId','eq',null)]),
    '你在同城帖下和几个人聊了几天。群里终于定下周六见面：公共场所、各自到场、AA；也可以继续只在线上聊，或者把周末留给休息。',
    '第一次，要不要见？','那次同城邀约可能只停在一顿饭，也可能留下后来还能叫出名字的人。',[
      c('按约去公共场所','你确认了地点和回程，按约到场，没有把初见写成必须合拍。','后来通讯录里留下多少，取决于那天之后双方还愿不愿继续。',{route:'metOffline',effects:[add('capabilities.riskSense',1)],outcomeTags:['social:intent:connect','social:firstMeeting:offline'],socialOutcome:{variants:[
        variant('offline_once',40,'大家吃完各自回家，群里客气地发了几张照片，此后没有再约。','那次见面只占了一个周末，不需要被补写成长久关系。',[add('relationships.network',1)],{outcomeTags:['social:firstMeeting:once']}),
        variant('offline_light',35,'散场时有人问下次要不要再来，你们偶尔在群里接着聊。','这段联系留在活动和群消息之间，近，却还没有深到能托付生活。',[add('relationships.network',2)],{outcomeTags:['social:firstMeeting:light']}),
        variant('offline_persistent',25,'小禾和你同路到地铁口，之后又单独约过两次白天活动。','几年后再提起，你们仍把那次同城见面算作认识的开始。',[createSocial('primary','小禾','interest',{tie:'friend',proximity:'local',turn:'met',support:'unseen'}),add('relationships.network',3),add('mobility.localTies',1)],{outcomeTags:['social:firstMeeting:persistent']})
      ]}}),
      c('先在线上多聊一阵','你没有赴约，只在群里继续聊共同兴趣，也没承诺何时线下见。','关系可以停在线上，也可能慢慢有下一步；这次没有替以后作决定。',{route:'stayedOnline',effects:[],outcomeTags:['social:intent:connect','social:firstMeeting:online'],socialOutcome:{variants:[
        variant('online_once',40,'热闹过几天后，话题被新消息顶走，双方都没有再单独开口。','聊天记录留着，这段接触没有因此成为一段关系。',[],{outcomeTags:['social:firstMeeting:once']}),
        variant('online_light',35,'你们偶尔互发活动链接，回复有快有慢，联系没有断。','彼此知道对方还在，却没有默认谁能随时出现。',[add('relationships.network',1)],{outcomeTags:['social:firstMeeting:light']}),
        variant('online_persistent',25,'小禾记得你提过的考试或排班，后来仍会在固定时间上线聊几句。','这段关系先留在线上；距离不近，回应却不全靠群消息。',[createSocial('primary','小禾','online',{tie:'friend',proximity:'unknown',turn:'met',support:'unseen'}),add('relationships.network',2)],{outcomeTags:['social:firstMeeting:persistent']})
      ]}}),
      c('把周末留给自己','你退出这次报名，关掉群提醒，给自己做了顿饭。','没有赴约不等于错过人生；这个周末确实被休息接住了。',{route:'choseSolitude',effects:[add('desires.peace.fulfillment',2)],outcomeTags:['social:intent:solitude','social:firstMeeting:declined']})
    ]),

  // 7／8：严重压力中的有限支持（2 选；有界稳定随机之一）。
  sd([22,85],req([], [p('finance.totalDebt','gte',100000),p('housing.stability','in',['conditional','temporary']),p('employment.status','eq','unemployed'),p('health.status','in',['treating','limited']),p('development.careLoad','gte',20)]),
    '债务、住处、失业、身体或照护里，至少有一件已经压到日常。那位朋友还在联系人里；你可以只说一个具体缺口，也可以先走专业和公共渠道。',
    '这次，要不要开口？','那次危机没有被友情一笔勾销；对方能做多少，后来有了真实记录。',[
      c('把一个具体缺口说出来','你没有让对方“想办法救我”，只说清眼下最急的那一件事。','开口以后，帮助、限制或拒绝都变成了可以面对的事实。',{route:'askedFriend',effects:[],outcomeTags:['social:intent:connect','social:crisis:asked'],socialOutcome:{variants:[
        variant('support_showed_up',45,'对方腾出半天，只接下你点名的那件事，也说清不能替你承担什么。','那半天让你喘过一口气，债、病、工作或照护责任仍要按原来的规则继续。',[updateSocial({personId:'$actor',turn:'deepened',support:'showedUp'}),add('pressures.loneliness',-5),add('capabilities.resilience',2)],{outcomeTags:['social:support:showedUp']}),
        variant('support_limited',30,'对方到不了现场，帮你核了一个公开入口，又约好晚些时候通话。','帮助有限，也有边界；它没有冒充还款、治疗、录用或长期照护。',[updateSocial({personId:'$actor',support:'limited'}),add('pressures.loneliness',-2),add('capabilities.evidence',1)],{outcomeTags:['social:support:limited']}),
        variant('support_unable',25,'对方说明自己这次实在接不住，也没有拿一句“改天”拖着你等。','你听见了拒绝。眼前的缺口没变，关系以后怎样仍不能由这一次自动决定。',[updateSocial({personId:'$actor',support:'unable'}),add('pressures.loneliness',3)],{outcomeTags:['social:support:unable']})
      ]}}),
      c('先走正式渠道','你把账单、合同、就诊单或照护安排中最急的一项拿去核实，没有要求朋友替制度签字。','能办的事按正式入口继续；联系朋友仍是以后可以另做的选择。',{route:'usedFormalRoute',effects:[add('capabilities.evidence',2),add('capabilities.riskSense',1)],outcomeTags:['social:crisis:formalRoute']})
    ],{actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close','distant']})]}),

  // 8／8：中晚年重联、约会入口、主动独处与明确求连接（4 选；有界稳定随机之一）。
  sd([45,105],req(),
    '最近你开始重新安排和人来往的时间。通讯录、附近活动和一整天空闲同时摆在眼前；联系旧人、单独见面、自己待着或认识新人，都要占掉这段时间。',
    '这次把时间留给谁？','那次选择没有替晚年下定义，只让重逢、约会、独处或重新扩圈各自发生。',[
      c('发一条具体消息','你提起一件双方都记得的小事，也给了对方不回复的余地。','消息发出以后，靠近、客气或没有回应都不再由你单方面决定。',{route:'reconnected',effects:[],outcomeTags:['social:intent:connect','social:reconnect:message'],socialOutcome:{variants:[
        variant('reconnect_close',35,'对方回得很快，还问了你现在方便通话的时间。','你们重新有了能接上的话题，过去没有被假装成从未中断。',[updateSocial({personId:'$actor',tie:'friend',turn:'reconnected'}),add('relationships.network',2),add('pressures.loneliness',-2)],{outcomeTags:['social:reconnect:close']}),
        variant('reconnect_polite',40,'对方礼貌回了近况，没有接住下一次见面的提议。','关系停在能互相问候的位置，不必硬改写成从前。',[updateSocial({personId:'$actor',tie:'distant',turn:'drifted'})],{outcomeTags:['social:reconnect:polite']}),
        variant('reconnect_silent',25,'消息显示已送达，几周过去仍没有新的回复。','想连接的愿望是真的，没有回应带来的空落也是真的。',[updateSocial({personId:'$actor',tie:'distant',turn:'drifted'}),add('pressures.loneliness',3)],{outcomeTags:['social:reconnect:silent']})
      ]}}),
      c('明确约一次单独见面','你没有用“大家有空聚”绕过去，而是问对方愿不愿意只和你见一面。','这条路可能进入约会，也可能只确认彼此已经走远。',{route:'askedForDate',requirements:req([p('relationships.activePartnerId','eq',null),p('relationships.partnerStatus','in',['none','divorced','widowed'])]),effects:[],outcomeTags:['social:intent:connect','social:reconnect:date'],socialOutcome:{variants:[
        variant('date_reconnected',35,'对方答应了。你们约在白天见面，也把这次叫作一次约会。','同一个人从旧识走进约会；之后怎样相处，仍交回伴侣系统。',[updateSocial({personId:'$actor',tie:'close',turn:'reconnected'}),toDating({personId:'$actor'}),add('pressures.loneliness',-2)],{outcomeTags:['social:bridge:romance','social:reconnect:dateAccepted']}),
        variant('date_polite',40,'对方回了谢谢，也直说更愿意保持普通联系。','话说清以后，关系没有变成恋爱，也没有被判成失败。',[updateSocial({personId:'$actor',tie:'distant',turn:'drifted'}),add('capabilities.boundary',1)],{outcomeTags:['social:reconnect:dateDeclined']}),
        variant('date_silent',25,'对方没有回应见面的提议，之后也没再接上话题。','邀请已经发出，关系退远的事实也不需要你替对方解释。',[updateSocial({personId:'$actor',tie:'distant',turn:'drifted'}),add('pressures.loneliness',3)],{outcomeTags:['social:reconnect:dateSilent']})
      ]}}),
      c('今天就自己待着','你把手机放远，做饭、散步或看完一场电影，没有给谁写请假条。','独处是你这次明确选择的生活，不会因为联系人不多自动变成孤独。',{route:'activeSolitude',effects:[add('desires.peace.fulfillment',2)],outcomeTags:['social:intent:solitude','social:later:solitude']}),
      c('去认识附近的人','你报了一个写明时间、费用和退出方式的附近活动，没有假装已经交到朋友。','认识面的入口重新打开，真正的关系仍要由一次次具体来往决定。',{route:'soughtConnection',effects:[add('relationships.network',2),add('mobility.localTies',1)],outcomeTags:['social:intent:connect','social:later:newCircle']})
    ],{actors:[actor('social.primaryPersonId',{socialTieAny:['friend','close','distant'],optional:true})]})
];

export const SOCIAL_COPY=track('社会交往与人生联系',beats,decisions);
