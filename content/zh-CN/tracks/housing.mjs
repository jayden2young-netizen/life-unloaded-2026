import {beat as b,choice as c,track} from './helpers.mjs';

const p=(path,op,value)=>({path,op,value});
const req=(all=[],any=[],none=[])=>({all,any,none});
const move=(value)=>({type:'transitionHousing',target:'housing',value});
const hc=(kind,text,resultText,consequenceText,value,extra={})=>c(
  text,resultText,consequenceText,
  {...extra,housingChoiceKind:kind,effects:[...(extra.effects||[]),move({...value,kind:'choice',housingChoiceKind:kind})]}
);
const hd=(age,requirements,prompt,echoText,...choices)=>({age,requirements,prompt,echoText,choices});

const beats=[
  b('ordinary','小时候，能摊开作业本的地方常常也是家里的饭桌。',{age:[6,15],requirements:req([p('housing.arrangement','eq','originFamily')])}),
  b('ordinary','旧卧室的门关不关得上，家里每个人都有自己的说法。',{age:[8,18],requirements:req([p('housing.arrangement','eq','originFamily')])}),
  b('friction','搬家纸箱还没拆完，新的上学路线已经要背熟了。',{age:[6,18],requirements:req([p('originHousehold.context.housingStability','lte',55)])}),
  b('ordinary','楼下那家店换过招牌，你还是认得回家的拐角。',{age:[6,18],requirements:req([p('originHousehold.context.housingStability','gte',60)])}),

  b('ordinary','宿舍钥匙和校园卡拴在一起，丢一件就得跑两个窗口。',{age:[17,30],requirements:req([p('housing.arrangement','eq','dormitory'),p('education.enrollmentRegion','eq','domestic'),p('education.status','eq','enrolled')])}),
  b('awkward','熄灯以后，最亮的是几张床帘后面的手机。',{age:[17,30],requirements:req([p('housing.arrangement','eq','dormitory'),p('education.enrollmentRegion','eq','domestic'),p('education.status','eq','enrolled')])}),
  b('friction','公共卫浴门口排起队，早八不会因此晚十分钟。',{age:[17,30],requirements:req([p('housing.arrangement','eq','dormitory'),p('education.enrollmentRegion','eq','domestic'),p('education.status','eq','enrolled')])}),
  b('friction','潮气从墙角返出来，报修单在群里接了好几次龙。',{age:[17,30],requirements:req([p('housing.arrangement','eq','dormitory'),p('education.enrollmentRegion','eq','domestic'),p('education.status','eq','enrolled')])}),
  b('ordinary','最后一班回校的车开走后，你开始记住每条步行近路。',{age:[17,30],requirements:req([p('education.status','eq','enrolled'),p('housing.arrangement','neq','dormitory')])}),

  b('ordinary','residence hall 的门卡能进楼，假期能不能留下要看另一封邮件。',{age:[17,32],requirements:req([p('housing.region','eq','us'),p('housing.arrangement','eq','dormitory'),p('education.status','eq','enrolled')])}),
  b('friction','室友协议写了安静时间，真正难谈的是谁又把朋友带回来。',{age:[17,32],requirements:req([p('housing.region','eq','us'),p('housing.arrangement','in',['dormitory','shared']),p('education.status','eq','enrolled')])}),
  b('awkward','校内住宿费和学费出现在同一张账单上，截止日却各算各的。',{age:[17,32],requirements:req([p('housing.region','eq','us'),p('education.status','eq','enrolled')])}),

  b('ordinary','学生住房的候补号码往前动了两位，开学日动得更快。',{age:[17,32],requirements:req([p('housing.region','eq','europe'),p('education.status','eq','enrolled')])}),
  b('friction','合租面谈先聊作息，再聊谁能给合同作担保。',{age:[17,32],requirements:req([p('housing.region','eq','europe'),p('housing.arrangement','eq','shared'),p('education.status','eq','enrolled')])}),
  b('awkward','钥匙交到手里，押金回执上的当地词你又查了一遍。',{age:[17,32],requirements:req([p('housing.region','eq','europe'),p('housing.status','eq','renting'),p('education.status','eq','enrolled')])}),

  b('ordinary','合同上的出租人姓名，终于和证件、收款账户对上了。',{age:[18,70],requirements:req([p('housing.status','eq','renting')])}),
  b('ordinary','退租清单拍了十几张照片，墙角那处旧印也单独留了一张。',{age:[18,70],requirements:req([p('housing.status','eq','renting')])}),
  b('friction','房东说准备卖房，续租的答复只肯在语音里给。',{age:[20,68],requirements:req([p('housing.status','eq','renting'),p('housing.stability','neq','temporary')])}),
  b('friction','晚上再走一遍看房路线，白天没听见的车声全回来了。',{age:[18,65],requirements:req([p('housing.status','eq','renting')])}),
  b('awkward','合租电费只差几十块，群里的消息却从账单翻到冰箱格。',{age:[18,60],requirements:req([p('housing.arrangement','eq','shared')])}),
  b('ordinary','清洁表贴在门后，谁忘了倒垃圾一眼就能看见。',{age:[18,60],requirements:req([p('housing.arrangement','eq','shared')])}),

  b('ordinary','备用钥匙交出去以后，谁先到家不再需要临时发消息。',{age:[20,75],requirements:req([p('housing.arrangement','eq','partner')])}),
  b('friction','共同租约续不续，不能只拿一句“再看看”拖过去。',{age:[22,70],requirements:req([p('housing.arrangement','eq','partner'),p('housing.status','eq','renting')])}),
  b('ordinary','家里谈到以后怎么照应，同住、住近一点和定期上门被分成了三行。',{age:[30,90],requirements:req([p('housing.arrangement','neq','multigenerational'),p('relationships.childCount','gte',1)])}),
  b('friction','多代同住以后，早饭、洗澡和孩子写作业都在争同一段时间。',{age:[25,85],requirements:req([p('housing.arrangement','eq','multigenerational')])}),
  b('pressure','备用钥匙还在抽屉里，搬离日期和交接单却还没有定。',{age:[22,80],requirements:req([p('relationships.partnerStatus','eq','separated'),p('housing.arrangement','eq','partner')])}),

  b('ordinary','单位宿舍的钥匙和工牌一起领，离职时也要一起交。',{age:[18,65],requirements:req([p('housing.arrangement','eq','dormitory'),p('employment.employerType','eq','public')])}),
  b('ordinary','书桌装好以后，视频里终于不再每周换一面墙。',{age:[20,70],requirements:req([p('housing.stability','eq','stable'),p('employment.arrangement','in',['remote','hybrid'])])}),
  b('pressure','收入降下来，搬家箱先装走了不再付得起的那部分生活。',{age:[20,75],requirements:req([p('housing.stability','in',['conditional','temporary']),p('pressures.money','gte',45)])}),

  b('ordinary','浴室扶手装好后，洗澡不必每次先等另一个人有空。',{age:[55,105],requirements:req([p('housing.accessibility','eq','adapted')])}),
  b('friction','电梯又停了，你把当天要办的事按上下楼次数重新排。',{age:[60,105],requirements:req([p('housing.accessibility','eq','standard'),p('health.careNeed','gte',1)])}),
  b('ordinary','住处离服务点近了，预约单上的时间终于不再全耗在路上。',{age:[60,105],requirements:req([p('housing.arrangement','eq','service')])}),
];

const decisions=[
  hd([17,30],req([p('education.status','eq','enrolled'),p('education.level','gte',4)]),
    '报到已经成立，住处的费用、门禁和通勤却不能同时合适。你得在交钥匙前定下来。',
    '那次报到以后，住处也成了学业的一部分。',
    hc('educationHousing','住进学校安排的宿舍','你领了床位和门禁，费用仍按教育资助方案走。','后来记得最清楚的，是谁几点关灯。',{status:'supported',arrangement:'dormitory',region:'$educationRegion',stability:'conditional',costShare:'supported',coResidentRefs:[],reason:'educationDormitory'}),
    hc('educationHousing','继续从家里通勤','你没有领宿舍钥匙，课表从此要和往返时间一起排。','错过末班车的那几次，让你很早学会算时间。',{status:'family',value:0,arrangement:'originFamily',region:'$homeRegion',stability:'stable',costShare:'supported',coResidentRefs:[],reason:'educationCommute'},{showWhen:req([p('education.enrollmentRegion','eq','domestic')])}),
    hc('educationHousing','在学校附近合租','合同和押金清单核过后，你把行李搬进一间合租房。','毕业时，退租照片比合影拍得还齐。',{status:'renting',value:0,arrangement:'shared',region:'$educationRegion',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'educationSharedRent'})),

  hd([18,38],req([], [p('employment.status','in',['employed','gig','selfEmployed'])]),
    '工作和回家的路线已经固定了一阵。押金、通勤和家里的门，都有各自的价钱。',
    '第一次把住处写在自己名下以后，回家成了一个可以选择的方向。',
    hc('firstIndependent','离工作近一点，先合租','你核过合同和押金，把自己的东西收进一间能关门的房。','公共区域一直需要商量，通勤却短了。',{status:'renting',value:0,arrangement:'shared',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'firstSharedHome'}),
    hc('firstIndependent','住远一点，保住独处','你接受更长的路，把合同只签在自己名下。','每天多坐几站，关门以后不用再解释作息。',{status:'renting',value:0,arrangement:'solo',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'firstSoloHome'}),
    hc('firstIndependent','先留在家里住','你没有签新合同，通勤和家里的作息继续一起算。','存款没有先交给押金，房门后的边界仍要慢慢谈。',{status:'family',value:0,arrangement:'originFamily',region:'$homeRegion',stability:'stable',costShare:'supported',coResidentRefs:[],reason:'stayWithOriginFamily'})),

  hd([20,65],req([], [p('mobility.mode','in',['domesticNomad','overseasNomad','studyAbroad']),p('employment.arrangement','in',['remote','hybrid'])]),
    '工作或许可已经把你带到新的生活半径。短住继续续下去，还是给日常留一个固定地址，要现在决定。',
    '后来每次填地址，你都会想起那次决定。',
    hc('workMigration','在国内固定下来','你签下长期合同，书桌和收件地址都不再跟着行李走。','固定地址留下了，也留下了下一次离开的成本。',{status:'renting',value:0,arrangement:'solo',region:'$homeRegion',stability:'stable',costShare:'self',coResidentRefs:[],reason:'domesticWorkBase'}, {showWhen:req([p('mobility.mode','neq','overseasNomad')])}),
    hc('workMigration','在美国租下长期住处','你核完租约、押金和通勤，把长期地址留在当地。','假期和工作变动时，那份租约仍按日期走。',{status:'renting',value:0,arrangement:'shared',region:'us',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'usWorkBase'}, {showWhen:req([p('mobility.lastOverseasSystem','eq','us'),p('mobility.mode','in',['studyAbroad','overseasNomad'])])}),
    hc('workMigration','在欧洲找一间长期合租','房源面谈和押金凭据都对上以后，你拿到了钥匙。','当地语言不再只出现在课堂，也出现在报修消息里。',{status:'renting',value:0,arrangement:'shared',region:'europe',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'europeWorkBase'}, {showWhen:req([p('mobility.lastOverseasSystem','eq','europe'),p('mobility.mode','in',['studyAbroad','overseasNomad'])])}),
    hc('workMigration','继续短住，保留下一站','你没有签长期租约，行李仍按下一次出发的重量收。','省下的不是全部成本，只是离开时少一份合同。',{status:'unstable',value:0,arrangement:'solo',stability:'temporary',costShare:'self',coResidentRefs:[],reason:'continueMobileHousing'})),

  hd([22,80],req([p('relationships.activePartnerId','truthy',true),p('relationships.partnerStatus','in',['dating','partnered','married'])]),
    '两个人已经在谈每天怎么过。备用钥匙、通勤和各自能承担的住房开支，不能只靠一句“以后再说”。',
    '那次住处安排没有替关系作保证，只把每天从哪里开始说清了。',
    hc('partnerReconfiguration','签进同一份住处','你们把两个人的名字、付款日和钥匙都核清，开始共同住。','共同地址让很多事方便，也让作息和钱都更难含糊。',{status:'renting',value:0,arrangement:'partner',stability:'conditional',costShare:'joint',coResidentRefs:['$activePartner'],reason:'partnerJointHome'}),
    hc('partnerReconfiguration','住在附近，各留一扇门','你们没有退掉各自住处，把见面和照应放进步行距离。','距离缩短了，谁都还保留能关上的门。',{status:'renting',value:0,arrangement:'solo',stability:'stable',costShare:'self',coResidentRefs:[],reason:'nearbySeparateHomes'}),
    hc('partnerReconfiguration','先维持现在的住法','你们没有交换钥匙，只把通勤和见面的时间重新排过。','没搬家不等于没选择，那条边界后来一直在。',{reason:'keepSeparateHousing'})),

  hd([24,68],req([p('housing.region','in',['tier1','tier2','county','town']),p('housing.status','notIn',['owned','mortgaged']),p('finance.available','gte',59800)], [p('employment.status','in',['employed','gig','selfEmployed'])]),
    '首付、交易费用、现有债务和接下来的收入都摊在桌上。房子能不能买，不只看银行愿不愿放款。',
    '那次没有替未来房价下结论，只留下了一份真实合同。',
    hc('homePurchase','自己承担，签下这套房','首付和搬入缓冲从现金里扣掉，按揭本金与房屋价值分别记账。','钥匙属于你，月供也没有因为签约变轻。',{status:'mortgaged',arrangement:'solo',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[],reason:'homePurchase'}, {debtGate:'homePurchase'}),
    hc('homePurchase','两个人共同住，由我背按揭','伴侣住房收入只抵共同住处的一部分，按揭仍完整留在你名下。','关系没有替债务担保；共同分担停下时，余额还在。',{status:'mortgaged',arrangement:'partner',stability:'stable',accessibility:'standard',costShare:'joint',coResidentRefs:['$activePartner'],reason:'jointHomePurchase'}, {requirements:req([p('relationships.activePartnerId','truthy',true),p('relationships.partnerStatus','in',['dating','partnered','married'])]),debtGate:'homePurchase'}),
    hc('homePurchase','继续租，把现金留在手里','你没有签购房合同，租约和可用现金继续留在当下。','后来搬走时，行李比房产交易简单；租住也仍有自己的账。',{status:'renting',value:0,arrangement:'solo',stability:'stable',costShare:'self',coResidentRefs:[],reason:'rentInsteadOfBuy'}),
    hc('homePurchase','这次先不动住处','估价和贷款方案收进文件夹，你没有为了期限制造一笔交易。','错过的可能性留在那一页，现住处没有被改写。',{reason:'deferPurchase'})),

  hd([55,105],req([p('health.careNeed','gte',1),p('housing.accessibility','eq','standard'),p('housing.arrangement','neq','service')]),
    '现在的住处开始和洗澡、上下楼、看诊或照应时间打架。要改的是房子、距离，还是生活方式？',
    '住处变得更合用以后，晚年仍然是自己的日子。',
    hc('laterFit','在原住处做适老改造','扶手、照明和常走的路线先改，门牌没有变。','熟悉的地方留下来，维护这些安排也成了日常。',{accessibility:'adapted',stability:'stable',reason:'ageInPlaceAdaptation'}),
    hc('laterFit','和伴侣住到一起','两边的药单、钥匙和作息对过以后，你们合到一个住处。','能互相照应，也得重新分配各自的安静时间。',{arrangement:'partner',accessibility:'adapted',costShare:'joint',coResidentRefs:['$activePartner'],reason:'laterPartnerHome'}, {requirements:req([p('relationships.activePartnerId','truthy',true),p('relationships.partnerStatus','in',['partnered','married'])])}),
    hc('laterFit','和家人同住','搬家箱按谁常用什么分开，住处改成了多代一起生活。','照应近了，门、饭点和谁做主都要重新商量。',{status:'supported',value:0,arrangement:'multigenerational',accessibility:'supported',costShare:'supported',coResidentRefs:['$firstChild'],stability:'stable',reason:'laterMultigenerational'}, {requirements:req([p('relationships.childCount','gte',1)])}),
    hc('laterFit','搬到服务更近的住处','合同写清服务和居住各管什么，你把常用物件搬进新房间。','有人提供服务，不等于你交出了全部决定。',{status:'supported',value:0,arrangement:'service',accessibility:'supported',costShare:'supported',coResidentRefs:[],stability:'stable',reason:'laterServiceHousing'}))
];

export const HOUSING_COPY=track('住房与居住',beats,decisions);
