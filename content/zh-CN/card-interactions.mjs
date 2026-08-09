// v0.6.9：每条互动按轨道、事件问题和选项文本显式登记。
// 这里没有数组位置轮换或通用文案 fallback；找不到精确键就不生成互动。
const EXPLICIT_CARD_INTERACTIONS = Object.freeze({
  "business::第一轮真实数字出来了。先改什么？::缩菜单和排班。先活下来": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“缩菜单和排班。先活下来”时，动手以前，你决定把陌生的部分拆成眼前能学的一步，再看要不要“缩菜单和排班。先活下来”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，新学会的那一步当场用上了。 你这次走的是“缩菜单和排班。先活下来”。",
    "source": "eventAuthored"
  },
  "business::交定金之前，先怎么搞清楚能不能做？::查备案。找做过的人看账": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“查备案。找做过的人看账”时，这次多了一步准备：先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；最容易出问题的地方提前被看见了。 你这次走的是“查备案。找做过的人看账”。",
    "source": "eventAuthored"
  },
  "business::控制权和钱，最后怎么选？::不卖了。慢点长": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“不卖了。慢点长”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“不卖了。慢点长”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“不卖了。慢点长”。",
    "source": "eventAuthored"
  },
  "business::扩张之前，先试什么？::让老店自己转一个周期": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“让老店自己转一个周期”时，眼前仍要你自己选；牌能帮的，是问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；可靠的消息补上了原来够不着的一角。 你这次走的是“让老店自己转一个周期”。",
    "source": "eventAuthored"
  },
  "business::钱怎么来？::用自己挣的。一步一步来": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“用自己挣的。一步一步来”时，你没有急着选，先算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "多出来的差别很具体：缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“用自己挣的。一步一步来”。",
    "source": "eventAuthored"
  },
  "business::站在这之前，先搞清楚什么？::股权、债务、交易顺序——让专业的人查": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“股权、债务、交易顺序——让专业的人查”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“股权、债务、交易顺序——让专业的人查”。",
    "source": "eventAuthored"
  },
  "business::这次扩张，最后留下了什么？::能赚的留着。慢慢来": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“能赚的留着。慢慢来”时，“能赚的留着。慢慢来”要真的走得通，得先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“能赚的留着。慢慢来”照样有代价，不过说出口的条件有了能核对的落点。 你这次走的是“能赚的留着。慢慢来”。",
    "source": "eventAuthored"
  },
  "business::这家店，最后怎么弄？::缩。保住能活的": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“缩。保住能活的”时，这次多做了一层准备：换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，原来那条路不再是唯一答案。 你这次走的是“缩。保住能活的”。",
    "source": "eventAuthored"
  },
  "children::孩子和你，最后怎么定？::搬出去了。该走的亲戚还走": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“搬出去了。该走的亲戚还走”时，眼前仍要你自己选；牌能帮的，是把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；说出口的条件有了能核对的落点。 你这次走的是“搬出去了。该走的亲戚还走”。",
    "source": "eventAuthored"
  },
  "children::你先怎么接？::一起定个规矩。隐私和安全都写进去": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“一起定个规矩。隐私和安全都写进去”时，这次多了一步准备：先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；你的界线没有在点头时一起让出去。 你这次走的是“一起定个规矩。隐私和安全都写进去”。",
    "source": "eventAuthored"
  },
  "children::你怎么决定？::继续妊娠": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“继续妊娠”时，你没有急着选，先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：身体的信号被带进了决定里。 你这次走的是“继续妊娠”。",
    "source": "eventAuthored"
  },
  "children::你怎么决定？::终止妊娠": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“终止妊娠”时，你没有把最后决定交给旁人的态度。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "最后那句话，还是由你自己说出口。 你这次走的是“终止妊娠”。",
    "source": "eventAuthored"
  },
  "children::评估怎么往下走？::如实补齐材料": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“如实补齐材料”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“如实补齐材料”。",
    "source": "eventAuthored"
  },
  "children::评估怎么往下走？::先把支持人叫齐": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“先把支持人叫齐”时，愿意帮忙的人把能接送、能陪诊的时段说清了。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "支持人的电话写进了表格，登记回执还没有下来。 你这次走的是“先把支持人叫齐”。",
    "source": "eventAuthored"
  },
  "children::入学这件事，怎么安排？::按能做的条件入学": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“按能做的条件入学”时，“按能做的条件入学”要真的走得通，得先顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "“按能做的条件入学”照样有代价，不过需要照看的日常没有被一句承诺带过。 你这次走的是“按能做的条件入学”。",
    "source": "eventAuthored"
  },
  "children::现在还开始吗？::确认不要孩子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“确认不要孩子”时，你已经练过把自己的决定说清楚。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "伴侣听见了一个清楚的答案。 你这次走的是“确认不要孩子”。",
    "source": "eventAuthored"
  },
  "children::现在还开始吗？::现在开始备孕": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“现在开始备孕”时，动手以前，你决定把身体反应和该问医生的事记下来，再看要不要“现在开始备孕”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，身体的信号被带进了决定里。 你这次走的是“现在开始备孕”。",
    "source": "eventAuthored"
  },
  "children::现在怎么决定？::继续妊娠": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "“继续妊娠”要真的走得通，得先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "“继续妊娠”照样有代价，不过身体的信号被带进了决定里。",
    "source": "eventAuthored"
  },
  "children::现在怎么决定？::终止妊娠": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "你没有把最后决定交给旁人的态度。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "最后那句话，还是由你自己说出口。",
    "source": "eventAuthored"
  },
  "children::怎么谈？::一起写下来：帮多久，各自做什么": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“一起写下来：帮多久，各自做什么”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“一起写下来：帮多久，各自做什么”。",
    "source": "eventAuthored"
  },
  "children::这次申请怎么定？::完成融合和登记": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“完成融合和登记”时，你没有急着选，先顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：需要照看的日常没有被一句承诺带过。 你这次走的是“完成融合和登记”。",
    "source": "eventAuthored"
  },
  "children::这份申请先怎么准备？::按真实情况提交": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“按真实情况提交”时，你留存材料的习惯减少了来回补件。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "材料少补了几趟，评估和匹配仍得照程序往下走。 你这次走的是“按真实情况提交”。",
    "source": "eventAuthored"
  },
  "children::这件事，最后怎么定？::定下来了。有事能说": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“定下来了。有事能说”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“定下来了。有事能说”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“定下来了。有事能说”。",
    "source": "eventAuthored"
  },
  "children::这件事怎么定？::开始备孕": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“开始备孕”时，你预留的缓冲能垫住检查和最急的一段请假。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "那点缓冲垫住了眼前的账单，却不能替检查单提前写答案。 你这次走的是“开始备孕”。",
    "source": "eventAuthored"
  },
  "children::这件事怎么定？::明确不要孩子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“明确不要孩子”时，你已经练过把自己的决定说清楚。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "伴侣听见了一个清楚的答案。 你这次走的是“明确不要孩子”。",
    "source": "eventAuthored"
  },
  "education::被这样说的时候，你怎么办？::当场纠正对方": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“当场纠正对方”时，眼前仍要你自己选；牌能帮的，是把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；你的界线没有在点头时一起让出去。 你这次走的是“当场纠正对方”。",
    "source": "eventAuthored"
  },
  "education::本科毕业以后，你打算往哪儿走？::先找工作": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“先找工作”时，眼前仍要你自己选；牌能帮的，是拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；做过的事成了这次选择的底气。 你这次走的是“先找工作”。",
    "source": "eventAuthored"
  },
  "education::本科读完了。接下来往哪儿投？::留在美国找工作": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“留在美国找工作”时，动手以前，你决定找出最容易留下后患的那一步，再看要不要“留在美国找工作”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，最容易出问题的地方提前被看见了。 你这次走的是“留在美国找工作”。",
    "source": "eventAuthored"
  },
  "education::本科读完了。接下来往哪儿走？::留在欧洲找工作": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“留在欧洲找工作”时，你没有急着选，先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：最容易出问题的地方提前被看见了。 你这次走的是“留在欧洲找工作”。",
    "source": "eventAuthored"
  },
  "education::毕业以后，你想往哪边准备？::去投当地的专业岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“去投当地的专业岗位”时，眼前仍要你自己选；牌能帮的，是拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；做过的事成了这次选择的底气。 你这次走的是“去投当地的专业岗位”。",
    "source": "eventAuthored"
  },
  "education::毕业以前，先把哪件事做实？::跟老师做一段研究": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“跟老师做一段研究”时，这次多做了一层准备：把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，新学会的那一步当场用上了。 你这次走的是“跟老师做一段研究”。",
    "source": "eventAuthored"
  },
  "education::成年了重新学，第一年怎么排？::报正式的。每周时间固定下来": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“报正式的。每周时间固定下来”时，你没有急着选，先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：新学会的那一步当场用上了。 你这次走的是“报正式的。每周时间固定下来”。",
    "source": "eventAuthored"
  },
  "education::初中读完了。志愿表怎么填？::读普高。继续往本科走": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“读普高。继续往本科走”时，眼前仍要你自己选；牌能帮的，是把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；新学会的那一步当场用上了。 你这次走的是“读普高。继续往本科走”。",
    "source": "eventAuthored"
  },
  "education::第一年，你先把哪件事抓住？::先问研究安排和资助": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“先问研究安排和资助”时，“先问研究安排和资助”要真的走得通，得先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“先问研究安排和资助”照样有代价，不过说出口的条件有了能核对的落点。 你这次走的是“先问研究安排和资助”。",
    "source": "eventAuthored"
  },
  "education::第一年，你先顾哪件事？::先把导师的要求问明白": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“先把导师的要求问明白”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“先把导师的要求问明白”。",
    "source": "eventAuthored"
  },
  "education::第一年，先顾哪一头？::先把学分和考试报名盯住": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“先把学分和考试报名盯住”时，这次多做了一层准备：把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，新学会的那一步当场用上了。 你这次走的是“先把学分和考试报名盯住”。",
    "source": "eventAuthored"
  },
  "education::第一学年，这张课表怎么排？::先把毕业要求弄明白": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“先把毕业要求弄明白”时，这次多了一步准备：先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；新学会的那一步当场用上了。 你这次走的是“先把毕业要求弄明白”。",
    "source": "eventAuthored"
  },
  "education::付钱之前，先怎么搞清这张证？::查目录、报考条件和是谁发的证": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“查目录、报考条件和是谁发的证”时，这次多做了一层准备：找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，最容易出问题的地方提前被看见了。 你这次走的是“查目录、报考条件和是谁发的证”。",
    "source": "eventAuthored"
  },
  "education::接下来，你想往哪边试？::在国内读研": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“在国内读研”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“在国内读研”。",
    "source": "eventAuthored"
  },
  "education::接下来一年，你准备押在哪组申请上？::国内和海外都准备": {
    "primaryMechanic": "network",
    "mode": "unlock",
    "explanation": "准备“国内和海外都准备”时，有人把可靠的申请信息递到了你手里。",
    "patch": [
      {
        "type": "expose",
        "target": "development.routeExposure",
        "value": "overseas"
      }
    ],
    "resultSuffix": "那条原本够不着的信息线，终于接上了。 你这次走的是“国内和海外都准备”。",
    "activeShowWhen": {
      "all": [],
      "any": [],
      "none": []
    },
    "activeRequirements": {
      "all": [
        {
          "path": "development.languagePreparation",
          "op": "gte",
          "value": 8
        },
        {
          "path": "development.routeKnowledge",
          "op": "gte",
          "value": 18
        }
      ],
      "any": [],
      "none": []
    },
    "source": "eventAuthored"
  },
  "education::接下来一年，你准备押在哪组申请上？::主攻国内本科": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“主攻国内本科”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“主攻国内本科”。",
    "source": "eventAuthored"
  },
  "education::开头这段时间，你先忙什么？::先照着学分和考试日期排": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“先照着学分和考试日期排”时，这次多做了一层准备：把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，新学会的那一步当场用上了。 你这次走的是“先照着学分和考试日期排”。",
    "source": "eventAuthored"
  },
  "education::课外时间，你准备花在哪儿？::挑一个真想去的社团": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“挑一个真想去的社团”时，动手以前，你决定问一个确实了解情况的人，再看要不要“挑一个真想去的社团”。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "结果落定时，可靠的消息补上了原来够不着的一角。 你这次走的是“挑一个真想去的社团”。",
    "source": "eventAuthored"
  },
  "education::你打算怎么接上工作？::去投专业或研究岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“去投专业或研究岗位”时，这次多了一步准备：先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；做过的事成了这次选择的底气。 你这次走的是“去投专业或研究岗位”。",
    "source": "eventAuthored"
  },
  "education::你读的是哪一套本科？::在美国读本科": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“在美国读本科”时，你没有急着选，先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：新学会的那一步当场用上了。 你这次走的是“在美国读本科”。",
    "source": "eventAuthored"
  },
  "education::你还想去认识谁？::华人群里坐坐，也约个新认识的人": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“华人群里坐坐，也约个新认识的人”时，这次多做了一层准备：问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "回头看这一步，可靠的消息补上了原来够不着的一角。 你这次走的是“华人群里坐坐，也约个新认识的人”。",
    "source": "eventAuthored"
  },
  "education::你想先怎么处理这件事？::把时间、截图都留下。找一个能听完的人": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把时间、截图都留下。找一个能听完的人”时，动手以前，你决定把日期、凭据和能复核的细节放在手边，再看要不要“把时间、截图都留下。找一个能听完的人”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，该留下的凭据没有缺席。 你这次走的是“把时间、截图都留下。找一个能听完的人”。",
    "source": "eventAuthored"
  },
  "education::你准备先补哪一类入口？::准备医疗执业入口": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“准备医疗执业入口”时，动手以前，你决定把陌生的部分拆成眼前能学的一步，再看要不要“准备医疗执业入口”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，新学会的那一步当场用上了。 你这次走的是“准备医疗执业入口”。",
    "source": "eventAuthored"
  },
  "education::你准备怎么办？::先申请转专业": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“先申请转专业”时，“先申请转专业”要真的走得通，得先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“先申请转专业”照样有代价，不过新学会的那一步当场用上了。 你这次走的是“先申请转专业”。",
    "source": "eventAuthored"
  },
  "education::你准备怎么应对？::把话说回去，合作还是继续": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“把话说回去，合作还是继续”时，这次多了一步准备：先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；你的界线没有在点头时一起让出去。 你这次走的是“把话说回去，合作还是继续”。",
    "source": "eventAuthored"
  },
  "education::先去查哪一份？::继续走国内复试和调剂": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“继续走国内复试和调剂”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“继续走国内复试和调剂”。",
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备在哪儿找？::留在美国找专业岗位": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“留在美国找专业岗位”时，动手以前，你决定找出最容易留下后患的那一步，再看要不要“留在美国找专业岗位”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，最容易出问题的地方提前被看见了。 你这次走的是“留在美国找专业岗位”。",
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备在哪儿找？::留在欧洲找专业岗位": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“留在欧洲找专业岗位”时，你没有急着选，先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：最容易出问题的地方提前被看见了。 你这次走的是“留在欧洲找专业岗位”。",
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备怎么找？::就找专业或研究岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“就找专业或研究岗位”时，你没有急着选，先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：做过的事成了这次选择的底气。 你这次走的是“就找专业或研究岗位”。",
    "source": "eventAuthored"
  },
  "education::这次，你准备怎么找实践？::先问清工作资格，再投实习": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“先问清工作资格，再投实习”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“先问清工作资格，再投实习”。",
    "source": "eventAuthored"
  },
  "education::这次变化，最后去了哪儿？::转成了。缺的课我补": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“转成了。缺的课我补”时，这次多了一步准备：先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；这一下没有堵死后面的路。 你这次走的是“转成了。缺的课我补”。",
    "source": "eventAuthored"
  },
  "education::这次学习，最后怎么收？::读完了。记录留着": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“读完了。记录留着”时，“读完了。记录留着”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“读完了。记录留着”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“读完了。记录留着”。",
    "source": "eventAuthored"
  },
  "education::这个项目，你准备怎么找人、怎么做？::别等“有空”，直接约个时间": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“别等“有空”，直接约个时间”时，眼前仍要你自己选；牌能帮的，是把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "约好时间仍要你自己赴约；说出口的条件有了能核对的落点。 你这次走的是“别等“有空”，直接约个时间”。",
    "source": "eventAuthored"
  },
  "education::这件事，最后怎么收？::有人管了。我回去上课": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“有人管了。我回去上课”时，这次多做了一层准备：问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "回头看这一步，可靠的消息补上了原来够不着的一角。 你这次走的是“有人管了。我回去上课”。",
    "source": "eventAuthored"
  },
  "education::这轮资格准备，最后怎么办？::通过了，按这个方向投": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“通过了，按这个方向投”时，这次多做了一层准备：把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，该留下的凭据没有缺席。 你这次走的是“通过了，按这个方向投”。",
    "source": "eventAuthored"
  },
  "education::这些日常，你先从哪儿摸起？::不懂就问，先把眼前的规则弄明白": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“不懂就问，先把眼前的规则弄明白”时，动手以前，你决定把陌生的部分拆成眼前能学的一步，再看要不要“不懂就问，先把眼前的规则弄明白”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，新学会的那一步当场用上了。 你这次走的是“不懂就问，先把眼前的规则弄明白”。",
    "source": "eventAuthored"
  },
  "education::这学年的课，怎么选？::拉着 advisor 把毕业要求过一遍": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“拉着 advisor 把毕业要求过一遍”时，“拉着 advisor 把毕业要求过一遍”要真的走得通，得先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“拉着 advisor 把毕业要求过一遍”照样有代价，不过说出口的条件有了能核对的落点。 你这次走的是“拉着 advisor 把毕业要求过一遍”。",
    "source": "eventAuthored"
  },
  "education::这一次，你从哪儿安顿下来？::熟人能联系就联系，也认识点新的人": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“熟人能联系就联系，也认识点新的人”时，“熟人能联系就联系，也认识点新的人”要真的走得通，得先问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "“熟人能联系就联系，也认识点新的人”照样有代价，不过可靠的消息补上了原来够不着的一角。 你这次走的是“熟人能联系就联系，也认识点新的人”。",
    "source": "eventAuthored"
  },
  "education::这一次，你拿什么去申请？::把课程和研究写扎实": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把课程和研究写扎实”时，“把课程和研究写扎实”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“把课程和研究写扎实”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“把课程和研究写扎实”。",
    "source": "eventAuthored"
  },
  "education::这一轮，你真交哪组申请？::参加国内考试，交志愿": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“参加国内考试，交志愿”时，“参加国内考试，交志愿”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“参加国内考试，交志愿”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“参加国内考试，交志愿”。",
    "source": "eventAuthored"
  },
  "education::这一轮接下来怎么收？::确认国内录取和第一年费用或资助": {
    "primaryMechanic": "cashBuffer",
    "mode": "requirementShift",
    "explanation": "准备“确认国内录取和第一年费用或资助”时，你留的缓冲，补上了首年费用里最急的一截。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": -1200
      }
    ],
    "resultSuffix": "你没有把那笔缓冲当成已经不存在。 你这次走的是“确认国内录取和第一年费用或资助”。",
    "activeRequirements": {
      "all": [
        {
          "path": "education.domesticOffer",
          "op": "eq",
          "value": true
        }
      ],
      "any": [
        {
          "path": "education.domesticFundingReady",
          "op": "eq",
          "value": true
        },
        {
          "path": "capabilities.cashBuffer",
          "op": "gte",
          "value": 1
        }
      ],
      "none": []
    },
    "source": "eventAuthored"
  },
  "education::这一轮接下来怎么收？::用掉唯一的补申年": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“用掉唯一的补申年”时，你把退件、成绩和资金缺口分开整理，第二次不会从空白开始。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "材料夹里哪些还能用、哪些必须重做，这次写得很清楚。 你这次走的是“用掉唯一的补申年”。",
    "activeRequirements": {
      "all": [
        {
          "path": "education.extraApplicationYearUsed",
          "op": "eq",
          "value": false
        }
      ],
      "any": [],
      "none": []
    },
    "source": "eventAuthored"
  },
  "education::这一年，你想先把什么做出来？::先把研究做完": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“先把研究做完”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“先把研究做完”。",
    "source": "eventAuthored"
  },
  "education::这张证，最后怎么用？::过了。证拿去用": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“过了。证拿去用”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“过了。证拿去用”。",
    "source": "eventAuthored"
  },
  "education::最后，落在哪了？::国内报到了": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“国内报到了”时，动手以前，你决定把日期、凭据和能复核的细节放在手边，再看要不要“国内报到了”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，该留下的凭据没有缺席。 你这次走的是“国内报到了”。",
    "source": "eventAuthored"
  },
  "education::最后，你去了哪儿？::去国内读研": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“去国内读研”时，动手以前，你决定算清手里的缓冲能垫住哪一段，再看要不要“去国内读研”。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "结果落定时，缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“去国内读研”。",
    "source": "eventAuthored"
  },
  "employment::报销单缺了一张附件，业务负责人催财务今天付款。供应商的电话已经打到第三次。::退回补齐附件": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“退回补齐附件”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“退回补齐附件”。",
    "source": "eventAuthored"
  },
  "employment::部门要撤了。桌上这些材料，你先处理哪一样？::把材料对一遍，该签的签": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把材料对一遍，该签的签”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“把材料对一遍，该签的签”。",
    "source": "eventAuthored"
  },
  "employment::仓储园区中午不让出门，售卖机一盒饭的钱接近一小时工资。夜班同事把自带饭放在休息室的小冰箱里。::先买一份，记下价格": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“先买一份，记下价格”时，动手以前，你决定算清手里的缓冲能垫住哪一段，再看要不要“先买一份，记下价格”。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "结果落定时，缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“先买一份，记下价格”。",
    "source": "eventAuthored"
  },
  "employment::超市盘货拖到凌晨，排班表上第二天仍是七点早班。盘点枪还剩一格电，同事已经开始算回家还有没有夜班车。::留下盘完": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“留下盘完”时，你没有急着选，先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：这一下没有堵死后面的路。 你这次走的是“留下盘完”。",
    "source": "eventAuthored"
  },
  "employment::传送带识别失败，人工件越堆越高。组长在另一头催数字，脚边的黄线已经被纸箱压住。::加快手速顶过去": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“加快手速顶过去”时，这次多做了一层准备：找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，最容易出问题的地方提前被看见了。 你这次走的是“加快手速顶过去”。",
    "source": "eventAuthored"
  },
  "employment::第一份工作，你先从哪儿找？::先投入门岗位": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“先投入门岗位”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“先投入门岗位”。",
    "source": "eventAuthored"
  },
  "employment::订单少了，公司让大家签“自愿无薪休假”，恢复上班的日期空着。::休假去学新技能": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“休假去学新技能”时，这次多做了一层准备：把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，新学会的那一步当场用上了。 你这次走的是“休假去学新技能”。",
    "source": "eventAuthored"
  },
  "employment::管培轮岗结束，两张去向表摆在面前：核心项目强度大、升得快；边缘团队资源少，直属领导却愿意把目标和支持写清。::去核心项目": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“去核心项目”时，动手以前，你决定找出最容易留下后患的那一步，再看要不要“去核心项目”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，最容易出问题的地方提前被看见了。 你这次走的是“去核心项目”。",
    "source": "eventAuthored"
  },
  "employment::咖啡店值班伙伴同时盯制作、巡视和新人。客人排到门外，冰箱温度记录还差一次。店长电话占线。::先守食品安全": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“先守食品安全”时，你先把温度、时间和当班责任记清，避免在忙乱里跳过食品安全记录。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "出餐仍然拥挤，但温度记录和处置责任没有丢。 你这次走的是“先守食品安全”。",
    "source": "eventAuthored"
  },
  "employment::客服电话里，顾客要求立刻退款。你的权限只够小额处理，主管消息没回，计时器还在跳。::解释权限，请对方等": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“解释权限，请对方等”时，这次多做了一层准备：把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，你的界线没有在点头时一起让出去。 你这次走的是“解释权限，请对方等”。",
    "source": "eventAuthored"
  },
  "employment::零工市场大屏同时跳出三单：远处装卸给得多，附近保洁当天结，技能单还没刷新。窗口只给你几分钟考虑。::去钱多的装卸": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“去钱多的装卸”时，眼前仍要你自己选；牌能帮的，是找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；最容易出问题的地方提前被看见了。 你这次走的是“去钱多的装卸”。",
    "source": "eventAuthored"
  },
  "employment::面试过了几家，条件都不一样。你怎么选？::回原来的行业": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“回原来的行业”时，“回原来的行业”要真的走得通，得先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“回原来的行业”照样有代价，不过做过的事成了这次选择的底气。 你这次走的是“回原来的行业”。",
    "source": "eventAuthored"
  },
  "employment::奶茶店爆单时，店长自己站到封口机前，让每个人轮流去后场喝水。外卖屏还在往下滚。::留下支援高峰": {
    "primaryMechanic": "resilience",
    "mode": "resultVariant",
    "explanation": "准备“留下支援高峰”时，留下支援之前，你先确认轮换、补水和高峰结束时间，别把支援变成无限加班。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": 1
      }
    ],
    "resultSuffix": "高峰仍然很累，但轮换和结束时间没有被一句支援带过。 你这次走的是“留下支援高峰”。",
    "source": "eventAuthored"
  },
  "employment::入厂以后才知道分到长白班，隔壁技术组要两班倒。宿舍已经领了钥匙，培训表等着签字。::留在长白班": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“留在长白班”时，动手以前，你决定把期限、钱和各自要做的事摊开谈，再看要不要“留在长白班”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，说出口的条件有了能核对的落点。 你这次走的是“留在长白班”。",
    "source": "eventAuthored"
  },
  "employment::商家还在出餐，保温箱里已经有五单。催得太凶怕拿错，不催，后面的楼栋一起超时。站长的头像亮着。::盯住这单，催商家": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“盯住这单，催商家”时，这次多了一步准备：先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；最容易出问题的地方提前被看见了。 你这次走的是“盯住这单，催商家”。",
    "source": "eventAuthored"
  },
  "employment::下属按你批准的方案做，结果出了错。上级已经在群里问“谁负责”，绩效表下周就要交。::公开说决定是我做的": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“公开说决定是我做的”时，这次多做了一层准备：把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，你的界线没有在点头时一起让出去。 你这次走的是“公开说决定是我做的”。",
    "source": "eventAuthored"
  },
  "employment::下一轮申请，哪件事先问到底？::把合同和报到条件问到底": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“把合同和报到条件问到底”时，这次多了一步准备：先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；说出口的条件有了能核对的落点。 你这次走的是“把合同和报到条件问到底”。",
    "source": "eventAuthored"
  },
  "employment::下一轮真来了，你准备先讲什么？::就讲做过的项目和上手有多快": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“就讲做过的项目和上手有多快”时，“就讲做过的项目和上手有多快”要真的走得通，得先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“就讲做过的项目和上手有多快”照样有代价，不过做过的事成了这次选择的底气。 你这次走的是“就讲做过的项目和上手有多快”。",
    "source": "eventAuthored"
  },
  "employment::现金先从哪里松一口气？::把住处降到更省钱的安排": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“把住处降到更省钱的安排”时，眼前仍要你自己选；牌能帮的，是算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“把住处降到更省钱的安排”。",
    "source": "eventAuthored"
  },
  "employment::项目出了错，上级让你先在责任说明上签字，说之后再内部处理。::保存记录如实说明": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“保存记录如实说明”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“保存记录如实说明”。",
    "source": "eventAuthored"
  },
  "employment::项目上线前，需求第三次变化。产品群里只写了“尽量支持”，测试环境已经锁定今晚。::继续改到最后": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“继续改到最后”时，眼前仍要你自己选；牌能帮的，是找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；最容易出问题的地方提前被看见了。 你这次走的是“继续改到最后”。",
    "source": "eventAuthored"
  },
  "employment::项目小群里漏了你。截止前一天，同事才把任务截图转来，还说“我以为有人告诉你了”。::先把缺口补上": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“先把缺口补上”时，你先找真正了解分工的人核对，别让一句“以为有人告诉你”代替任务交接。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "截止日没有因此后退，但可靠的信息补上了原来够不着的一角。 你这次走的是“先把缺口补上”。",
    "source": "eventAuthored"
  },
  "employment::新人第一次跟站点老骑手跑单。对方没讲大道理，只告诉你哪栋楼的电梯藏在消防门后、哪家商场要从卸货口进。下一单已经开始倒计时。::照着老路线跑": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“照着老路线跑”时，“照着老路线跑”要真的走得通，得先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“照着老路线跑”照样有代价，不过做过的事成了这次选择的底气。 你这次走的是“照着老路线跑”。",
    "source": "eventAuthored"
  },
  "employment::新系统第一次交到你手里。直属领导录了一段操作视频，又发来一份做过的模板，说先照着跑一遍，错了再一起看。::先照模板做一次": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“先照模板做一次”时，“先照模板做一次”要真的走得通，得先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“先照模板做一次”照样有代价，不过新学会的那一步当场用上了。 你这次走的是“先照模板做一次”。",
    "source": "eventAuthored"
  },
  "employment::长期岗位合同到期前，公司想让你再带一年新人，工资另算。::续约一年并带新人": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“续约一年并带新人”时，眼前仍要你自己选；牌能帮的，是把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；说出口的条件有了能核对的落点。 你这次走的是“续约一年并带新人”。",
    "source": "eventAuthored"
  },
  "employment::这批机会来了，你先怎么回？::写清底线和期限": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“写清底线和期限”时，这次多做了一层准备：把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，你的界线没有在点头时一起让出去。 你这次走的是“写清底线和期限”。",
    "source": "eventAuthored"
  },
  "employment::这份工作，你怎么答？::接受这份 offer": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“接受这份 offer”时，动手以前，你决定找出最容易留下后患的那一步，再看要不要“接受这份 offer”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，最容易出问题的地方提前被看见了。 你这次走的是“接受这份 offer”。",
    "source": "eventAuthored"
  },
  "employment::这一次，你怎么回到工作里？::先接能报到的工作": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“先接能报到的工作”时，你没有急着选，先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：这一下没有堵死后面的路。 你这次走的是“先接能报到的工作”。",
    "source": "eventAuthored"
  },
  "employment::主管岗位空出来了。接下它，你要开始给以前一起吃午饭的同事打绩效。::接下管理岗": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“接下管理岗”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“接下管理岗”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“接下管理岗”。",
    "source": "eventAuthored"
  },
  "employment::主管说可以涨薪，但从下个月起，周末也要随时回消息。::接下涨薪和职责": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“接下涨薪和职责”时，眼前仍要你自己选；牌能帮的，是把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；你的界线没有在点头时一起让出去。 你这次走的是“接下涨薪和职责”。",
    "source": "eventAuthored"
  },
  "employment::HR发来录用通知：试用期少两千，转正时间只写了“视表现而定”。::先进去再说": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“先进去再说”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“先进去再说”。",
    "source": "eventAuthored"
  },
  "finance::家庭财务盘点时，账户、欠款和担保一项都不能漏。::把所有账和联系人列清": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把所有账和联系人列清”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“把所有账和联系人列清”。",
    "source": "eventAuthored"
  },
  "finance::接下来的日子，先保住哪一块？::配合评估和搬离安排": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“配合评估和搬离安排”时，眼前仍要你自己选；牌能帮的，是给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；这一下没有堵死后面的路。 你这次走的是“配合评估和搬离安排”。",
    "source": "eventAuthored"
  },
  "finance::接下来的日子，先保住哪一块？::先保住住处和最低开销": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“先保住住处和最低开销”时，你能把必要生活费和逃避还款分开说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "留下的是基本生活，不是一笔藏起来的钱。 你这次走的是“先保住住处和最低开销”。",
    "source": "eventAuthored"
  },
  "finance::利率上升后，房贷加其他还款已经超过收入三成。::卖掉非必要资产": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“卖掉非必要资产”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“卖掉非必要资产”。",
    "source": "eventAuthored"
  },
  "finance::落笔之前，这事怎么处理？::不签。帮他把材料整理清楚": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“不签。帮他把材料整理清楚”时，这次多了一步准备：先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；最容易出问题的地方提前被看见了。 你这次走的是“不签。帮他把材料整理清楚”。",
    "source": "eventAuthored"
  },
  "finance::手里现金不够，分期和信用借款能让生活暂时看起来不变。::现在就缩开支": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“现在就缩开支”时，动手以前，你决定算清手里的缓冲能垫住哪一段，再看要不要“现在就缩开支”。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "结果落定时，缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“现在就缩开支”。",
    "source": "eventAuthored"
  },
  "finance::通知到了。你先怎么确认？::先把合同和余额对一遍。让借款人出面": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“先把合同和余额对一遍。让借款人出面”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“先把合同和余额对一遍。让借款人出面”。",
    "source": "eventAuthored"
  },
  "finance::一笔投资号称可能翻倍，销售说错过这周就没有额度。::只投小额验证": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“只投小额验证”时，“只投小额验证”要真的走得通，得先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "resultSuffix": "“只投小额验证”照样有代价，不过最容易出问题的地方提前被看见了。 你这次走的是“只投小额验证”。",
    "source": "eventAuthored"
  },
  "finance::这笔担保，最后怎么了结？::凭回单依法追偿": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“凭回单依法追偿”时，你没有急着选，先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：说出口的条件有了能核对的落点。 你这次走的是“凭回单依法追偿”。",
    "source": "eventAuthored"
  },
  "finance::这笔逾期，先怎么接？::把收入和欠款摊开谈": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“把收入和欠款摊开谈”时，你把收入、必要开支和能还的数一起带上了桌。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "方案里的数字能和你的工资、房租逐项对上。 你这次走的是“把收入和欠款摊开谈”。",
    "source": "eventAuthored"
  },
  "finance::执行已经开始，你先交哪一份安排？::保住可核收入，按月扣": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“保住可核收入，按月扣”时，这次多做了一层准备：把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，该留下的凭据没有缺席。 你这次走的是“保住可核收入，按月扣”。",
    "source": "eventAuthored"
  },
  "finance::执行已经开始，你先交哪一份安排？::如实报财产，再谈分期": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“如实报财产，再谈分期”时，合同、流水和名下资产都有能核对的凭据。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次没有靠一张说不清来源的清单。 你这次走的是“如实报财产，再谈分期”。",
    "source": "eventAuthored"
  },
  "habits::超时超成这样了，怎么收？::觉和该做的事排回来": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“觉和该做的事排回来”时，“觉和该做的事排回来”要真的走得通，得先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "“觉和该做的事排回来”照样有代价，不过这一下没有堵死后面的路。 你这次走的是“觉和该做的事排回来”。",
    "source": "eventAuthored"
  },
  "habits::订单和欠款都对清以后，必要开销和想买的东西怎么分？::让人帮。按单子来": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“让人帮。按单子来”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“让人帮。按单子来”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“让人帮。按单子来”。",
    "source": "eventAuthored"
  },
  "habits::分期开始挤必要开销，包裹也藏不住了。账单先怎么摊开？::单子全打出来。分期关了": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“单子全打出来。分期关了”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“单子全打出来。分期关了”。",
    "source": "eventAuthored"
  },
  "habits::购物车又装满了。付款以前，你先处理哪一笔？::冲动的退了。提醒关了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“冲动的退了。提醒关了”时，你没有急着选，先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：最容易出问题的地方提前被看见了。 你这次走的是“冲动的退了。提醒关了”。",
    "source": "eventAuthored"
  },
  "habits::喝的事，怎么办？::不喝了。去医院看": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“不喝了。去医院看”时，“不喝了。去医院看”要真的走得通，得先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "“不喝了。去医院看”照样有代价，不过身体的信号被带进了决定里。 你这次走的是“不喝了。去医院看”。",
    "source": "eventAuthored"
  },
  "habits::喝了这一口，你怎么办？::说了。联系门诊": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“说了。联系门诊”时，这次多做了一层准备：给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，这一下没有堵死后面的路。 你这次走的是“说了。联系门诊”。",
    "source": "eventAuthored"
  },
  "habits::滑了这一下，你先干什么？::跟人说。联系原来的支持": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“跟人说。联系原来的支持”时，这次多做了一层准备：给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，这一下没有堵死后面的路。 你这次走的是“跟人说。联系原来的支持”。",
    "source": "eventAuthored"
  },
  "habits::买买买的事，怎么收？::冲动的全退。分期关了": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“冲动的全退。分期关了”时，“冲动的全退。分期关了”要真的走得通，得先算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "“冲动的全退。分期关了”照样有代价，不过缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“冲动的全退。分期关了”。",
    "source": "eventAuthored"
  },
  "habits::评估以后，游戏、睡觉和现实里的约定怎么放回同一周？::接着治。按说的玩": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“接着治。按说的玩”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“接着治。按说的玩”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“接着治。按说的玩”。",
    "source": "eventAuthored"
  },
  "habits::评估做完了。接下来的饭局、复诊和日常怎么排？::接着治。有些局先不去": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“接着治。有些局先不去”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“接着治。有些局先不去”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“接着治。有些局先不去”。",
    "source": "eventAuthored"
  },
  "habits::被耽误的安排、藏酒和身体反应已经连在一起。你准备怎么让医生知道真实情况？::实话说了。让医生看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“实话说了。让医生看”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“实话说了。让医生看”。",
    "source": "eventAuthored"
  },
  "habits::群里的下注链接还开着。第一笔钱，你要不要放进去？::不下注。删了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“不下注。删了”时，你没有急着选，先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：最容易出问题的地方提前被看见了。 你这次走的是“不下注。删了”。",
    "source": "eventAuthored"
  },
  "habits::睡眠、功课或工作都被拖住了。游戏时间要怎么重新排？::让人评。把作息重排": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“让人评。把作息重排”时，这次多了一步准备：先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；身体的信号被带进了决定里。 你这次走的是“让人评。把作息重排”。",
    "source": "eventAuthored"
  },
  "habits::下注已经挤进生活费和日常时间。现在先停哪一个口子？::不追了。流水摊开": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“不追了。流水摊开”时，这次多了一步准备：先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；你的界线没有在点头时一起让出去。 你这次走的是“不追了。流水摊开”。",
    "source": "eventAuthored"
  },
  "habits::药盒比复诊日期先空了一格。下一次用药，你准备怎么处理？::按医嘱吃。早点去复诊": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“按医嘱吃。早点去复诊”时，你没有急着选，先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：身体的信号被带进了决定里。 你这次走的是“按医嘱吃。早点去复诊”。",
    "source": "eventAuthored"
  },
  "habits::一直下注这事，怎么收？::不下了。流水全摊出来": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“不下了。流水全摊出来”时，“不下了。流水全摊出来”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“不下了。流水全摊出来”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“不下了。流水全摊出来”。",
    "source": "eventAuthored"
  },
  "habits::医生看过真实用量以后，治疗和每天的安排怎么继续？::按计划，一步步来": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“按计划，一步步来”时，动手以前，你决定把身体反应和该问医生的事记下来，再看要不要“按计划，一步步来”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，身体的信号被带进了决定里。 你这次走的是“按计划，一步步来”。",
    "source": "eventAuthored"
  },
  "habits::用得不对了，怎么收？::带药盒按真的量去复诊": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“带药盒按真的量去复诊”时，“带药盒按真的量去复诊”要真的走得通，得先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "“带药盒按真的量去复诊”照样有代价，不过身体的信号被带进了决定里。 你这次走的是“带药盒按真的量去复诊”。",
    "source": "eventAuthored"
  },
  "habits::又熬了——你先怎么办？::说了。让人看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“说了。让人看”时，这次多做了一层准备：把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，该留下的凭据没有缺席。 你这次走的是“说了。让人看”。",
    "source": "eventAuthored"
  },
  "habits::又过了该睡的时间。下一局已经匹配上了，你还进吗？::关了。去睡": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“关了。去睡”时，你没有急着选，先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：你的界线没有在点头时一起让出去。 你这次走的是“关了。去睡”。",
    "source": "eventAuthored"
  },
  "habits::又加量了——你先怎么弄？::说了。提前去看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“说了。提前去看”时，这次多做了一层准备：把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，该留下的凭据没有缺席。 你这次走的是“说了。提前去看”。",
    "source": "eventAuthored"
  },
  "habits::又开始连买了——怎么弄？::单子全亮出来。等的期恢复": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“单子全亮出来。等的期恢复”时，这次多做了一层准备：给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，这一下没有堵死后面的路。 你这次走的是“单子全亮出来。等的期恢复”。",
    "source": "eventAuthored"
  },
  "habits::这次，怎么收？::重新来。该治的该锁的都跟上": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“重新来。该治的该锁的都跟上”时，眼前仍要你自己选；牌能帮的，是给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；这一下没有堵死后面的路。 你这次走的是“重新来。该治的该锁的都跟上”。",
    "source": "eventAuthored"
  },
  "habits::这回，怎么收？::按看的重新调": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“按看的重新调”时，眼前仍要你自己选；牌能帮的，是给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；这一下没有堵死后面的路。 你这次走的是“按看的重新调”。",
    "source": "eventAuthored"
  },
  "habits::这回，怎么收？::重新看。能管住的接着玩": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“重新看。能管住的接着玩”时，眼前仍要你自己选；牌能帮的，是给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；这一下没有堵死后面的路。 你这次走的是“重新看。能管住的接着玩”。",
    "source": "eventAuthored"
  },
  "habits::这回买过头了，怎么收？::重新让人帮。债慢慢理": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“重新让人帮。债慢慢理”时，眼前仍要你自己选；牌能帮的，是算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“重新让人帮。债慢慢理”。",
    "source": "eventAuthored"
  },
  "habits::这一口以后，怎么收？::按评估重新治": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“按评估重新治”时，眼前仍要你自己选；牌能帮的，是把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；身体的信号被带进了决定里。 你这次走的是“按评估重新治”。",
    "source": "eventAuthored"
  },
  "habits::真实流水摆在桌上以后，治疗、还债和每天的日子怎么一起走？::治。也把大钱锁上": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“治。也把大钱锁上”时，动手以前，你决定算清手里的缓冲能垫住哪一段，再看要不要“治。也把大钱锁上”。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "结果落定时，缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“治。也把大钱锁上”。",
    "source": "eventAuthored"
  },
  "habits::真实用量、身体反应和原来的病都需要重看。你先怎么跟医生说？::跟医生说实话": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“跟医生说实话”时，这次多了一步准备：先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；该留下的凭据没有缺席。 你这次走的是“跟医生说实话”。",
    "source": "eventAuthored"
  },
  "habits::最近每次聚餐都比原计划多喝。今晚到这里，还是再来一杯？::不喝了。换无酒精的": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“不喝了。换无酒精的”时，你没有急着选，先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：身体的信号被带进了决定里。 你这次走的是“不喝了。换无酒精的”。",
    "source": "eventAuthored"
  },
  "health::从今天起，身体这件事怎么过？::好了。以后定期查查就行": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“好了。以后定期查查就行”时，动手以前，你决定把身体反应和该问医生的事记下来，再看要不要“好了。以后定期查查就行”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，身体的信号被带进了决定里。 你这次走的是“好了。以后定期查查就行”。",
    "source": "eventAuthored"
  },
  "health::多年治疗后，你要决定继续追求治愈、带病生活，还是停止消耗。::完成治疗和医疗意愿": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“完成治疗和医疗意愿”时，“完成治疗和医疗意愿”要真的走得通，得先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“完成治疗和医疗意愿”照样有代价，不过你的界线没有在点头时一起让出去。 你这次走的是“完成治疗和医疗意愿”。",
    "source": "eventAuthored"
  },
  "health::康复从哪件事开始？::按评定做训练并持续复诊": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“按评定做训练并持续复诊”时，这次多了一步准备：先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "结果仍不确定；这一下没有堵死后面的路。 你这次走的是“按评定做训练并持续复诊”。",
    "source": "eventAuthored"
  },
  "health::有些东西回不来了。越早面对，能留住的越多。::尽快评估康复": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“尽快评估康复”时，这次多做了一层准备：把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，身体的信号被带进了决定里。 你这次走的是“尽快评估康复”。",
    "source": "eventAuthored"
  },
  "health::又是这张表。和上个月一模一样。还练吗？::换种练法。不急": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "explanation": "准备“换种练法。不急”时，你没有急着选，先给最坏的结果留一条还能继续的路。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：这一下没有堵死后面的路。 你这次走的是“换种练法。不急”。",
    "source": "eventAuthored"
  },
  "health::照护把家里人都拖住了。钱在往外走，能帮忙的都帮过了。::花钱请专业的人来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“花钱请专业的人来”时，眼前仍要你自己选；牌能帮的，是顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；需要照看的日常没有被一句承诺带过。 你这次走的是“花钱请专业的人来”。",
    "source": "eventAuthored"
  },
  "health::这些检查，你打算怎么处理？::按要求完成检查和复核": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“按要求完成检查和复核”时，你没有急着选，先把身体反应和该问医生的事记下来。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：身体的信号被带进了决定里。 你这次走的是“按要求完成检查和复核”。",
    "source": "eventAuthored"
  },
  "health::治疗和生活，怎么同时顾？::停下部分安排，完成主要治疗": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“停下部分安排，完成主要治疗”时，“停下部分责任，完成主要治疗”要真的走得通，得先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“停下部分责任，完成主要治疗”照样有代价，不过你的界线没有在点头时一起让出去。 你这次走的是“停下部分安排，完成主要治疗”。",
    "source": "eventAuthored"
  },
  "housing::报到已经成立，住处的费用、门禁和通勤却不能同时合适。你得在交钥匙前定下来。::住进学校安排的宿舍": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“住进学校安排的宿舍”时，“住进学校安排的宿舍”要真的走得通，得先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“住进学校安排的宿舍”照样有代价，不过说出口的条件有了能核对的落点。 你这次走的是“住进学校安排的宿舍”。",
    "source": "eventAuthored"
  },
  "housing::工作和回家的路线已经固定了一阵。押金、通勤和家里的门，都有各自的价钱。::离工作近一点，先合租": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“离工作近一点，先合租”时，这次多了一步准备：先算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "结果仍不确定；缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“离工作近一点，先合租”。",
    "source": "eventAuthored"
  },
  "housing::工作或许可已经把你带到新的生活半径。短住继续续下去，还是给日常留一个固定地址，要现在决定。::在国内固定下来": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“在国内固定下来”时，动手以前，你决定换个角度，找一条不必硬顶的路，再看要不要“在国内固定下来”。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，原来那条路不再是唯一答案。 你这次走的是“在国内固定下来”。",
    "source": "eventAuthored"
  },
  "housing::两个人已经在谈每天怎么过。备用钥匙、通勤和各自能承担的住房开支，不能只靠一句“以后再说”。::签进同一份住处": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“签进同一份住处”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“签进同一份住处”。",
    "source": "eventAuthored"
  },
  "housing::首付、交易费用、现有债务和接下来的收入都摊在桌上。房子能不能买，不只看银行愿不愿放款。::自己承担，签下这套房": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“自己承担，签下这套房”时，眼前仍要你自己选；牌能帮的，是算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“自己承担，签下这套房”。",
    "source": "eventAuthored"
  },
  "housing::现在的住处开始和洗澡、上下楼、看诊或照应时间打架。要改的是房子、距离，还是生活方式？::在原住处做适老改造": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“在原住处做适老改造”时，你没有急着选，先换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：原来那条路不再是唯一答案。 你这次走的是“在原住处做适老改造”。",
    "source": "eventAuthored"
  },
  "identity::你第一次认真决定，这一生最不愿失去什么。::哪怕不稳，也要自由": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“哪怕不稳，也要自由”时，这次多了一步准备：先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；你的界线没有在点头时一起让出去。 你这次走的是“哪怕不稳，也要自由”。",
    "source": "eventAuthored"
  },
  "identity::你发现早年最想要的东西，已经不完全适合现在。::重新排一次轻重": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“重新排一次轻重”时，动手以前，你决定换个角度，找一条不必硬顶的路，再看要不要“重新排一次轻重”。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，原来那条路不再是唯一答案。 你这次走的是“重新排一次轻重”。",
    "source": "eventAuthored"
  },
  "later::这位亲人留下的东西，最后怎么处理？::按清点范围接受": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“按清点范围接受”时，这次多了一步准备：先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；说出口的条件有了能核对的落点。 你这次走的是“按清点范围接受”。",
    "source": "eventAuthored"
  },
  "later::免费礼物和健康讲座把你带进一个封闭群。里面轮番发“专家”语音、限时名额和退款承诺，你已经付过一笔订金。::查公开信息": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“查公开信息”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“查公开信息”。",
    "source": "eventAuthored"
  },
  "later::热门课程只剩候补。报名页催你尽快确认，真正想学的那门却不知道什么时候有空位。::等候补": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“等候补”时，这次多了一步准备：先换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；原来那条路不再是唯一答案。 你这次走的是“等候补”。",
    "source": "eventAuthored"
  },
  "later::先从哪里理？::列出账户、债务和物件": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“列出账户、债务和物件”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“列出账户、债务和物件”。",
    "source": "eventAuthored"
  },
  "later::先从哪一项开始谈？::把工作量和缺口算清": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把工作量和缺口算清”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“把工作量和缺口算清”。",
    "source": "eventAuthored"
  },
  "later::先碰什么？::查登记、债务和相关方": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“查登记、债务和相关方”时，“查登记、债务和相关方”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“查登记、债务和相关方”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“查登记、债务和相关方”。",
    "source": "eventAuthored"
  },
  "later::先怎么确认需要什么？::做功能与照护评估": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "explanation": "准备“做功能与照护评估”时，动手以前，你决定把身体反应和该问医生的事记下来，再看要不要“做功能与照护评估”。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "结果落定时，身体的信号被带进了决定里。 你这次走的是“做功能与照护评估”。",
    "source": "eventAuthored"
  },
  "later::一个账号连续几周记得你说过的小事，也总在固定时间回应。最近对方开始要求保密，说只差一笔钱就能解决麻烦。::设预算，继续看": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“设预算，继续看”时，这次多做了一层准备：找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，最容易出问题的地方提前被看见了。 你这次走的是“设预算，继续看”。",
    "source": "eventAuthored"
  },
  "later::有人听说你“时间多”，想把一件临时帮忙变成每周固定安排。你不讨厌这件事，只是不想默认答应。::固定接下来": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“固定接下来”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“固定接下来”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“固定接下来”。",
    "source": "eventAuthored"
  },
  "later::这次工作转段，最后怎么定？::停下来，重新排日子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“停下来，重新排日子”时，你没有急着选，先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：你的界线没有在点头时一起让出去。 你这次走的是“停下来，重新排日子”。",
    "source": "eventAuthored"
  },
  "later::这次怎么落定？::按要求签好并留位置": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“按要求签好并留位置”时，“按要求签好并留位置”要真的走得通，得先把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "“按要求签好并留位置”照样有代价，不过你的界线没有在点头时一起让出去。 你这次走的是“按要求签好并留位置”。",
    "source": "eventAuthored"
  },
  "later::这次照护，怎么继续？::保留有效部分，定期复评": {
    "primaryMechanic": "careSkill",
    "mode": "riskShift",
    "explanation": "准备“保留有效部分，定期复评”时，你先核对哪些照护真的有效、谁在承担，以及下一次复评要看什么。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "resultSuffix": "照护没有被一句“继续”带过，有效部分和复评日期都留了下来。 你这次走的是“保留有效部分，定期复评”。",
    "source": "eventAuthored"
  },
  "later::这些帮助怎么落进每天？::把服务和现有帮助搭起来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“把服务和现有帮助搭起来”时，这次多做了一层准备：顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，需要照看的日常没有被一句承诺带过。 你这次走的是“把服务和现有帮助搭起来”。",
    "source": "eventAuthored"
  },
  "leisure::存款只够六个月，你要缩减开支、借钱维持，还是重新求职。::砍开支延长时间": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“砍开支延长时间”时，这次多做了一层准备：算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "回头看这一步，缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“砍开支延长时间”。",
    "source": "eventAuthored"
  },
  "leisure::接下来一年怎么调？::照原计划走。固定节奏": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“照原计划走。固定节奏”时，这次多了一步准备：先换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；原来那条路不再是唯一答案。 你这次走的是“照原计划走。固定节奏”。",
    "source": "eventAuthored"
  },
  "leisure::空窗期已超过两年，面试官开始把它当成首要问题。::补技能如实说明": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "explanation": "准备“补技能如实说明”时，“补技能如实说明”要真的走得通，得先把陌生的部分拆成眼前能学的一步。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“补技能如实说明”照样有代价，不过新学会的那一步当场用上了。 你这次走的是“补技能如实说明”。",
    "source": "eventAuthored"
  },
  "leisure::你开始分不清自己是在休息，还是不敢回到外面的生活。::找人帮忙调作息": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“找人帮忙调作息”时，眼前仍要你自己选；牌能帮的，是换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；原来那条路不再是唯一答案。 你这次走的是“找人帮忙调作息”。",
    "source": "eventAuthored"
  },
  "leisure::你可以继续闲着、回全职，或保留自由同时建立一点收入。::做少量稳定工作": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "explanation": "准备“做少量稳定工作”时，这次多了一步准备：先换个角度，找一条不必硬顶的路。",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；原来那条路不再是唯一答案。 你这次走的是“做少量稳定工作”。",
    "source": "eventAuthored"
  },
  "leisure::朋友邀你做一个低强度项目，每周两天，不保证以后有工作。::去做，保持手感": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“去做，保持手感”时，你没有急着选，先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：做过的事成了这次选择的底气。 你这次走的是“去做，保持手感”。",
    "source": "eventAuthored"
  },
  "leisure::钱从哪来？::用自己的积蓄。写个结束日期": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“用自己的积蓄。写个结束日期”时，“用自己的积蓄。写个结束日期”要真的走得通，得先算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "“用自己的积蓄。写个结束日期”照样有代价，不过缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“用自己的积蓄。写个结束日期”。",
    "source": "eventAuthored"
  },
  "leisure::这段空窗，最后怎么收？::继续缩着。不去找工作": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“继续缩着。不去找工作”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“继续缩着。不去找工作”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“继续缩着。不去找工作”。",
    "source": "eventAuthored"
  },
  "partnership::离婚这件事，最后怎么结束？::协议签完。生活分开": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“协议签完。生活分开”时，这次多做了一层准备：把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，说出口的条件有了能核对的落点。 你这次走的是“协议签完。生活分开”。",
    "source": "eventAuthored"
  },
  "partnership::你打算怎么开这个头？::一样一样列清楚": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“一样一样列清楚”时，动手以前，你决定把日期、凭据和能复核的细节放在手边，再看要不要“一样一样列清楚”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，该留下的凭据没有缺席。 你这次走的是“一样一样列清楚”。",
    "source": "eventAuthored"
  },
  "partnership::你们打算怎么试？::住得近。先试一阵": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“住得近。先试一阵”时，“住得近。先试一阵”要真的走得通，得先顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "“住得近。先试一阵”照样有代价，不过需要照看的日常没有被一句承诺带过。 你这次走的是“住得近。先试一阵”。",
    "source": "eventAuthored"
  },
  "partnership::你如何回应这次试探？::去。但先说好——不是复合": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“去。但先说好——不是复合”时，眼前仍要你自己选；牌能帮的，是把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；你的界线没有在点头时一起让出去。 你这次走的是“去。但先说好——不是复合”。",
    "source": "eventAuthored"
  },
  "partnership::你现在碰哪件事？::把流水和排班表一起摊出来": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把流水和排班表一起摊出来”时，“把流水和排班表一起摊出来”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“把流水和排班表一起摊出来”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“把流水和排班表一起摊出来”。",
    "source": "eventAuthored"
  },
  "partnership::试了这么久，怎么收尾？::重新在一起。但别急着搬": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“重新在一起。但别急着搬”时，你没有急着选，先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：说出口的条件有了能核对的落点。 你这次走的是“重新在一起。但别急着搬”。",
    "source": "eventAuthored"
  },
  "partnership::钥匙、住处和账单，怎么安排？::登记。但自己的账户自己留着": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“登记。但自己的账户自己留着”时，你没有急着选，先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：说出口的条件有了能核对的落点。 你这次走的是“登记。但自己的账户自己留着”。",
    "source": "eventAuthored"
  },
  "partnership::以后的日子怎么过？::住在一起。互相有授权": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“住在一起。互相有授权”时，这次多了一步准备：先顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；需要照看的日常没有被一句承诺带过。 你这次走的是“住在一起。互相有授权”。",
    "source": "eventAuthored"
  },
  "partnership::这场危机怎么收场？::重新约定。回家": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“重新约定。回家”时，这次多了一步准备：先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；说出口的条件有了能核对的落点。 你这次走的是“重新约定。回家”。",
    "source": "eventAuthored"
  },
  "partnership::这段关系怎么开始？::在一起，先把边界说清楚": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“在一起，先把边界说清楚”时，眼前仍要你自己选；牌能帮的，是把愿意承担和不能接受的部分分别说清。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；你的界线没有在点头时一起让出去。 你这次走的是“在一起，先把边界说清楚”。",
    "source": "eventAuthored"
  },
  "public::到最后了，怎么走？::面试体检考察，走完": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“面试体检考察，走完”时，“面试体检考察，走完”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“面试体检考察，走完”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“面试体检考察，走完”。",
    "source": "eventAuthored"
  },
  "public::基层岗位给编制和宿舍，但合同写着三年内不得调动。::签了。先稳定下来": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“签了。先稳定下来”时，这次多了一步准备：先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果仍不确定；说出口的条件有了能核对的落点。 你这次走的是“签了。先稳定下来”。",
    "source": "eventAuthored"
  },
  "public::晋升名额要去外地驻点两年。孩子刚上学，家里也离不开人。::去。周末再赶回来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "explanation": "准备“去。周末再赶回来”时，这次多做了一层准备：顾到每天真正需要被照看的地方。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "resultSuffix": "回头看这一步，需要照看的日常没有被一句承诺带过。 你这次走的是“去。周末再赶回来”。",
    "source": "eventAuthored"
  },
  "public::跨单位调动的时候，系统少了七年经历记录。新岗位要求截止前说清楚。::翻出旧工资条和调令，补齐": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“翻出旧工资条和调令，补齐”时，“翻出旧工资条和调令，补齐”要真的走得通，得先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "“翻出旧工资条和调令，补齐”照样有代价，不过该留下的凭据没有缺席。 你这次走的是“翻出旧工资条和调令，补齐”。",
    "source": "eventAuthored"
  },
  "public::熟人把材料发来，想让你在截止后补进系统一次。::把公开流程截图发给他": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "准备“把公开流程截图发给他”时，动手以前，你决定把愿意承担和不能接受的部分分别说清，再看要不要“把公开流程截图发给他”。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，你的界线没有在点头时一起让出去。 你这次走的是“把公开流程截图发给他”。",
    "source": "eventAuthored"
  },
  "public::外面的岗位薪水更高。但一旦辞职，编制和年金就回不来了。::留下。不走了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“留下。不走了”时，你没有急着选，先找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "resultSuffix": "多出来的差别很具体：最容易出问题的地方提前被看见了。 你这次走的是“留下。不走了”。",
    "source": "eventAuthored"
  },
  "public::一通投诉把窗口推上热搜，你是当天签字的经办人。::把材料调出来，公开说明": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“把材料调出来，公开说明”时，眼前仍要你自己选；牌能帮的，是把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；该留下的凭据没有缺席。 你这次走的是“把材料调出来，公开说明”。",
    "source": "eventAuthored"
  },
  "public::这轮你打算怎么报？::报最符合条件的那个": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“报最符合条件的那个”时，你没有急着选，先把日期、凭据和能复核的细节放在手边。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：该留下的凭据没有缺席。 你这次走的是“报最符合条件的那个”。",
    "source": "eventAuthored"
  },
  "remote::被一个平台捏住了。先怎么办？::把作品和账单导出来。找自己的客户": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "explanation": "准备“把作品和账单导出来。找自己的客户”时，“把作品和账单导出来。找自己的客户”要真的走得通，得先拿一件真正做过的事试路。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "resultSuffix": "“把作品和账单导出来。找自己的客户”照样有代价，不过做过的事成了这次选择的底气。 你这次走的是“把作品和账单导出来。找自己的客户”。",
    "source": "eventAuthored"
  },
  "remote::第一份远程合同，怎么处理？::让对方把条款补齐再签": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "explanation": "准备“让对方把条款补齐再签”时，你没有急着选，先把期限、钱和各自要做的事摊开谈。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "resultSuffix": "多出来的差别很具体：说出口的条件有了能核对的落点。 你这次走的是“让对方把条款补齐再签”。",
    "source": "eventAuthored"
  },
  "remote::基地这件事，最后怎么定？::稳下来。扎根": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“稳下来。扎根”时，你没有急着选，先问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "多出来的差别很具体：可靠的消息补上了原来够不着的一角。 你这次走的是“稳下来。扎根”。",
    "source": "eventAuthored"
  },
  "remote::跨境这件事，最后怎么落？::许可下来了。按条件去": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "准备“许可下来了。按条件去”时，这次多做了一层准备：找出最容易留下后患的那一步。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.loneliness",
        "value": -2
      }
    ],
    "resultSuffix": "回头看这一步，最容易出问题的地方提前被看见了。 你这次走的是“许可下来了。按条件去”。",
    "source": "eventAuthored"
  },
  "remote::平台依赖这件事，怎么收？::分散开。平台只留一小块": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "准备“分散开。平台只留一小块”时，这次多了一步准备：先问一个确实了解情况的人。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "结果仍不确定；可靠的消息补上了原来够不着的一角。 你这次走的是“分散开。平台只留一小块”。",
    "source": "eventAuthored"
  },
  "remote::先怎么试？::租个稳定的地方。把本地的都补齐": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "准备“租个稳定的地方。把本地的都补齐”时，眼前仍要你自己选；牌能帮的，是算清手里的缓冲能垫住哪一段。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "resultSuffix": "这次仍要由你承担后果；缓冲只垫住眼前，没有假装风险已经消失。 你这次走的是“租个稳定的地方。把本地的都补齐”。",
    "source": "eventAuthored"
  },
  "remote::这次跨境，怎么准备？::一项项查清楚。用真实材料": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "准备“一项项查清楚。用真实材料”时，动手以前，你决定把日期、凭据和能复核的细节放在手边，再看要不要“一项项查清楚。用真实材料”。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "resultSuffix": "结果落定时，该留下的凭据没有缺席。 你这次走的是“一项项查清楚。用真实材料”。",
    "source": "eventAuthored"
  }
});

const interactionKey = (track, decision, choice) =>
  `${track}::${decision?.prompt || ''}::${choice?.text || ''}`;

export function cardInteractionFor(track, index, option, authoredDecision) {
  void index;
  const choice = authoredDecision?.choices?.[option];
  const configured = EXPLICIT_CARD_INTERACTIONS[interactionKey(track, authoredDecision, choice)];
  return configured ? structuredClone(configured) : null;
}

export const CARD_INTERACTION_WITNESSES = [
  {
    "id": "network-opens-overseas-preparation",
    "track": "education",
    "index": 3,
    "choice": 1,
    "mechanic": "network",
    "cardDrawAge": 0,
    "state": {
      "development": {
        "languagePreparation": 20,
        "routeKnowledge": 28,
        "routeExposure": []
      }
    }
  },
  {
    "id": "evidence-organizes-shared-undergraduate-retry",
    "track": "education",
    "index": 5,
    "choice": 3,
    "mechanic": "evidence",
    "cardDrawAge": 0,
    "state": {
      "education": {
        "extraApplicationYearUsed": false
      }
    }
  }
];
