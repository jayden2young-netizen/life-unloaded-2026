// v0.6.11：每条互动按轨道、事件问题和选项文本显式登记。
// 这里没有数组位置轮换或通用文案 fallback；找不到精确键就不生成互动。
const EXPLICIT_CARD_INTERACTIONS = Object.freeze({
  "business::第一轮真实数字出来了。先改什么？::缩菜单和排班。先活下来": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "business::交定金之前，先怎么搞清楚能不能做？::查备案。找做过的人看账": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "business::控制权和钱，最后怎么选？::不卖了。慢点长": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "business::扩张之前，先试什么？::让老店自己转一个周期": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "business::钱怎么来？::用自己挣的。一步一步来": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "business::站在这之前，先搞清楚什么？::股权、债务、交易顺序——让专业的人查": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "business::这次扩张，最后留下了什么？::能赚的留着。慢慢来": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "business::这家店，最后怎么弄？::缩。保住能活的": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::钱、钥匙和家务，哪些还要由你接着兜？::搬出去。平时各过各的，家里照常来往": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::你先怎么接？::一起定个规矩。隐私和安全都写进去": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::你怎么决定？::继续妊娠": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "children::你怎么决定？::终止妊娠": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::评估怎么往下走？::如实补齐材料": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::评估怎么往下走？::先把支持人叫齐": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "children::入学这件事，怎么安排？::按能做的条件入学": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::现在还开始吗？::确认不要孩子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::现在还开始吗？::现在开始备孕": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "children::现在怎么决定？::继续妊娠": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "children::现在怎么决定？::终止妊娠": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::怎么谈？::一起写下来：帮多久，各自做什么": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::这次申请怎么定？::完成融合和登记": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::这份申请先怎么准备？::按真实情况提交": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::手机和房门，最后按什么规矩来？::定下来了。有事能说": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "children::这件事怎么定？::开始备孕": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "children::这件事怎么定？::明确不要孩子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::被这样说的时候，你怎么办？::当场纠正对方": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::本科毕业以后，你打算往哪儿走？::先找工作": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::本科读完了。接下来往哪儿投？::留在美国找工作": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::本科读完了。接下来往哪儿走？::留在欧洲找工作": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::毕业以后，你想往哪边准备？::去投当地的专业岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::毕业以前，先把哪件事做实？::跟老师做一段研究": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::成年了重新学，第一年怎么排？::报正式的。每周时间固定下来": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::初中读完了。志愿表怎么填？::读普高。继续往本科走": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::第一年，你先把哪件事抓住？::先问研究安排和资助": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::第一年，你先顾哪件事？::先把导师的要求问明白": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::第一年，先顾哪一头？::先把学分和考试报名盯住": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::第一学年，这张课表怎么排？::先把毕业要求弄明白": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::付钱之前，先怎么搞清这张证？::查目录、报考条件和是谁发的证": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::接下来，你想往哪边试？::在国内读研": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::接下来一年，你准备押在哪组申请上？::国内和海外都准备": {
    "primaryMechanic": "network",
    "mode": "unlock",
    "patch": [
      {
        "type": "expose",
        "target": "development.routeExposure",
        "value": "overseas"
      }
    ],
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
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::开头这段时间，你先忙什么？::先照着学分和考试日期排": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::课外时间，你准备花在哪儿？::挑一个真想去的社团": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "education::你打算怎么接上工作？::去投专业或研究岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::你读的是哪一套本科？::在美国读本科": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::你还想去认识谁？::华人群里坐坐，也约个新认识的人": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "education::你想先怎么处理这件事？::把时间、截图都留下。找一个能听完的人": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::你准备先补哪一类入口？::准备医疗执业入口": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::你准备怎么办？::先申请转专业": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::你准备怎么应对？::把话说回去，合作还是继续": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::先去查哪一份？::继续走国内复试和调剂": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备在哪儿找？::留在美国找专业岗位": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备在哪儿找？::留在欧洲找专业岗位": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::研究生毕业了。第一份工作，你准备怎么找？::就找专业或研究岗位": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这次，你准备怎么找实践？::先问清工作资格，再投实习": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这次变化，最后去了哪儿？::转成了。缺的课我补": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "education::这些课还要读到哪儿？::读完了。记录留着": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这个项目，你准备怎么找人、怎么做？::别等“有空”，直接约个时间": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这件事，最后怎么收？::有人管了。我回去上课": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "education::这轮资格准备，最后怎么办？::通过了，按这个方向投": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这些日常，你先从哪儿摸起？::不懂就问，先把眼前的规则弄明白": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这学年的课，怎么选？::拉着 advisor 把毕业要求过一遍": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这一次，你从哪儿安顿下来？::熟人能联系就联系，也认识点新的人": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "education::这一次，你拿什么去申请？::把课程和研究写扎实": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这一轮，你真交哪组申请？::参加国内考试，交志愿": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::录取摆在这儿，你接得住哪一份？::确认国内录取和第一年费用或资助": {
    "primaryMechanic": "cashBuffer",
    "mode": "requirementShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": -1200
      }
    ],
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
  "education::录取摆在这儿，你接得住哪一份？::用掉唯一的补申年": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
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
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::这张证，最后怎么用？::过了。证拿去用": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::最后，落在哪了？::国内报到了": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "education::最后，你去了哪儿？::去国内读研": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "employment::报销单缺了一张附件，业务负责人催财务今天付款。供应商的电话已经打到第三次。::退回补齐附件": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::部门要撤了。桌上这些材料，你先处理哪一样？::把材料对一遍，该签的签": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::仓储园区中午不让出门，售卖机一盒饭的钱接近一小时工资。夜班同事把自带饭放在休息室的小冰箱里。::先买一份，记下价格": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "employment::超市盘货拖到凌晨，排班表上第二天仍是七点早班。盘点枪还剩一格电，同事已经开始算回家还有没有夜班车。::留下盘完": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::传送带识别失败，人工件越堆越高。组长在另一头催数字，脚边的黄线已经被纸箱压住。::加快手速顶过去": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::第一份工作，你先从哪儿找？::先投入门岗位": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::订单少了，公司让大家签“自愿无薪休假”，恢复上班的日期空着。::休假去学新技能": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::管培轮岗结束，两张去向表摆在面前：核心项目强度大、升得快；边缘团队资源少，直属领导却愿意把目标和支持写清。::去核心项目": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::咖啡店值班伙伴同时盯制作、巡视和新人。客人排到门外，冰箱温度记录还差一次。店长电话占线。::先守食品安全": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::客服电话里，顾客要求立刻退款。你的权限只够小额处理，主管消息没回，计时器还在跳。::解释权限，请对方等": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::零工市场大屏同时跳出三单：远处装卸给得多，附近保洁当天结，技能单还没刷新。窗口只给你几分钟考虑。::去钱多的装卸": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::面试过了几家，条件都不一样。你怎么选？::回原来的行业": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::奶茶店爆单时，店长自己站到封口机前，让每个人轮流去后场喝水。外卖屏还在往下滚。::留下支援高峰": {
    "primaryMechanic": "resilience",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::入厂以后才知道分到长白班，隔壁技术组要两班倒。宿舍已经领了钥匙，培训表等着签字。::留在长白班": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::商家还在出餐，保温箱里已经有五单。催得太凶怕拿错，不催，后面的楼栋一起超时。站长的头像亮着。::盯住这单，催商家": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::下属按你批准的方案做，结果出了错。上级已经在群里问“谁负责”，绩效表下周就要交。::公开说决定是我做的": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::下一轮申请，哪件事先问到底？::把合同和报到条件问到底": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::下一轮真来了，你准备先讲什么？::就讲做过的项目和上手有多快": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::现金先从哪里松一口气？::把住处降到更省钱的安排": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "employment::项目出了错，上级让你先在责任说明上签字，说之后再内部处理。::保存记录如实说明": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::项目上线前，需求第三次变化。产品群里只写了“尽量支持”，测试环境已经锁定今晚。::继续改到最后": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::项目小群里漏了你。截止前一天，同事才把任务截图转来，还说“我以为有人告诉你了”。::先把缺口补上": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::新人第一次跟站点老骑手跑单。对方没讲大道理，只告诉你哪栋楼的电梯藏在消防门后、哪家商场要从卸货口进。下一单已经开始倒计时。::照着老路线跑": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::新系统第一次交到你手里。直属领导录了一段操作视频，又发来一份做过的模板，说先照着跑一遍，错了再一起看。::先照模板做一次": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::长期岗位合同到期前，公司想让你再带一年新人，工资另算。::续约一年并带新人": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::这批机会来了，你先怎么回？::写清底线和期限": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::这份工作，你怎么答？::接受这份 offer": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::这一次，你怎么回到工作里？::先接能报到的工作": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "employment::主管岗位空出来了。接下它，你要开始给以前一起吃午饭的同事打绩效。::接下管理岗": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::主管说可以涨薪，但从下个月起，周末也要随时回消息。::接下涨薪和职责": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "employment::HR发来录用通知：试用期少两千，转正时间只写了“视表现而定”。::先进去再说": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::家庭财务盘点时，账户、欠款和担保一项都不能漏。::把所有账和联系人列清": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::接下来的日子，先保住哪一块？::配合评估和搬离安排": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "finance::接下来的日子，先保住哪一块？::先保住住处和最低开销": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::利率上升后，房贷加其他还款已经超过收入三成。::卖掉非必要资产": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::这份担保，你签不签？::不签。帮他把材料整理清楚": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "finance::手里现金不够，分期和信用借款能让生活暂时看起来不变。::现在就缩开支": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "finance::通知到了。你先怎么确认？::先把合同和余额对一遍。让借款人出面": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::一笔投资号称可能翻倍，销售说错过这周就没有额度。::只投小额验证": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.money",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "finance::这笔担保，最后怎么了结？::凭回单依法追偿": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::这笔逾期，先怎么接？::把收入和欠款摊开谈": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::执行已经开始，你先交哪一份安排？::保住可核收入，按月扣": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "finance::执行已经开始，你先交哪一份安排？::如实报财产，再谈分期": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::今晚几点关？明早哪件事不能再漏？::觉和该做的事排回来": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::订单和欠款都对清以后，必要开销和想买的东西怎么分？::让人帮。按单子来": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::分期开始挤必要开销，包裹也藏不住了。账单先怎么摊开？::单子全打出来。分期关了": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::购物车又装满了。付款以前，你先处理哪一笔？::冲动的退了。提醒关了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::下一顿饭和下一次复诊，怎么排？::不喝了。去医院看": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::喝了这一口，你怎么办？::说了。联系门诊": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::滑了这一下，你先干什么？::跟人说。联系原来的支持": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::退货期、分期和房租，先保哪一个？::冲动的全退。分期关了": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "habits::评估以后，游戏、睡觉和现实里的约定怎么放回同一周？::接着治。按说的玩": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::评估做完了。接下来的饭局、复诊和日常怎么排？::接着治。有些局先不去": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::被耽误的安排、藏酒和身体反应已经连在一起。你准备怎么让医生知道真实情况？::实话说了。让医生看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::群里的下注链接还开着。第一笔钱，你要不要放进去？::不下注。删了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::睡眠、功课或工作都被拖住了。游戏时间要怎么重新排？::让人评。把作息重排": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::下注已经挤进生活费和日常时间。现在先停哪一个口子？::不追了。流水摊开": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::药盒比复诊日期先空了一格。下一次用药，你准备怎么处理？::按医嘱吃。早点去复诊": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::这笔流水以后还追不追？::不下了。流水全摊出来": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::医生看过真实用量以后，治疗和每天的安排怎么继续？::按计划，一步步来": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::真实用量，怎么带回下一次复诊？::带药盒按真的量去复诊": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::又熬了——你先怎么办？::说了。让人看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::又过了该睡的时间。下一局已经匹配上了，你还进吗？::关了。去睡": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::又加量了——你先怎么弄？::说了。提前去看": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::又开始连买了——怎么弄？::单子全亮出来。等的期恢复": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::这几笔新流水，接下来怎么处理？::重新来。该治的该锁的都跟上": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::药盒怎么带回复诊？::按看的重新调": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::今晚还开不开？::重新看。能管住的接着玩": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::这些订单，接下来怎么办？::重新让人帮。债慢慢理": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "habits::接下来还喝不喝？::再去一趟门诊。该怎么停、怎么接着治，听完再说。": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "habits::真实流水摆在桌上以后，治疗、还债和每天的日子怎么一起走？::治。也把大钱锁上": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "habits::真实用量、身体反应和原来的病都需要重看。你先怎么跟医生说？::跟医生说实话": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "habits::最近每次聚餐都比原计划多喝。今晚到这里，还是再来一杯？::不喝了。换无酒精的": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::从今天起，身体这件事怎么过？::好了。以后定期查查就行": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::治了这么多年。继续找治愈的办法、带着病过，还是停下消耗？::完成治疗和医疗意愿": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "health::康复从哪件事开始？::按评定做训练并持续复诊": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::有些东西回不来了。越早面对，能留住的越多。::尽快评估康复": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::又是这张表。和上个月一模一样。还练吗？::换种练法。不急": {
    "primaryMechanic": "resilience",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::照护把家里人都拖住了。钱在往外走，能帮忙的都帮过了。::花钱请专业的人来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "health::这些检查，你打算怎么处理？::按要求完成检查和复核": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.body",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "health::治疗和生活，怎么同时顾？::把能停的先停了，先治": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "housing::报到已经成立，住处的费用、门禁和通勤却不能同时合适。你得在交钥匙前定下来。::住进学校安排的宿舍": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "housing::工作和回家的路线已经固定了一阵。押金、通勤和家里的门，都有各自的价钱。::离工作近一点，先合租": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "housing::工作或许可已经把你带到新的生活半径。短住继续续下去，还是给日常留一个固定地址，要现在决定。::在国内固定下来": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "housing::两个人已经在谈每天怎么过。备用钥匙、通勤和各自能承担的住房开支，不能只靠一句“以后再说”。::签进同一份住处": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "housing::首付、交易费用、现有债务和接下来的收入都摊在桌上。房子能不能买，不只看银行愿不愿放款。::自己承担，签下这套房": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "housing::现在的住处开始和洗澡、上下楼、看诊或照应时间打架。要改的是房子、距离，还是生活方式？::在原住处做适老改造": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "identity::你第一次认真决定，这一生最不愿失去什么。::哪怕不稳，也要自由": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "identity::你发现早年最想要的东西，已经不完全适合现在。::重新排一次轻重": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::这位亲人留下的东西，最后怎么处理？::按清点范围接受": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::免费礼物和健康讲座把你带进一个封闭群。里面轮番发“专家”语音、限时名额和退款承诺，你已经付过一笔订金。::查公开信息": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::热门课程只剩候补。报名页催你尽快确认，真正想学的那门却不知道什么时候有空位。::等候补": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::先从哪里理？::列出账户、债务和物件": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::先从哪一项开始谈？::把工作量和缺口算清": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::先碰什么？::查登记、债务和相关方": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::先怎么确认需要什么？::做功能与照护评估": {
    "primaryMechanic": "healthLiteracy",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "later::一个账号连续几周记得你说过的小事，也总在固定时间回应。最近对方开始要求保密，说只差一笔钱就能解决麻烦。::设预算，继续看": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "later::有人听说你“时间多”，想把一件临时帮忙变成每周固定安排。你不讨厌这件事，只是不想默认答应。::固定接下来": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::以后每周还给工作几天？::停下来，重新排日子": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::哪些文件今天真要签下来？::按要求签好并留位置": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "later::这次照护，怎么继续？::保留有效部分，定期复评": {
    "primaryMechanic": "careSkill",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.family",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "later::这些帮助怎么落进每天？::把服务和现有帮助搭起来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::存款只够六个月。省着过、借钱撑，还是回去找工作？::砍开支延长时间": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::接下来一年怎么调？::照原计划走。固定节奏": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::空窗期已超过两年，面试官开始把它当成首要问题。::补技能如实说明": {
    "primaryMechanic": "learning",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::你开始分不清自己是在休息，还是不敢回到外面的生活。::找人帮忙调作息": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::你可以继续闲着、回全职，或保留自由同时建立一点收入。::做少量稳定工作": {
    "primaryMechanic": "creativity",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "desires.creation.fulfillment",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::朋友邀你做一个低强度项目，每周两天，不保证以后有工作。::去做，保持手感": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::钱从哪来？::用自己的积蓄。写个结束日期": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "leisure::这段空窗，最后怎么收？::继续缩着。不去找工作": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::离婚这件事，最后怎么结束？::协议签完。生活分开": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::你打算怎么开这个头？::一样一样列清楚": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::你们打算怎么试？::住得近。先试一阵": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::你如何回应这次试探？::去。但先说好——不是复合": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::你现在碰哪件事？::把流水和排班表一起摊出来": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::这次见完，还要不要重新在一起？::重新在一起。但别急着搬": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::钥匙、住处和账单，怎么安排？::登记。但自己的账户自己留着": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::以后的日子怎么过？::住在一起。互相有授权": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::这场危机怎么收场？::重新约定。回家": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "partnership::这段关系怎么开始？::在一起，先把边界说清楚": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::到最后了，怎么走？::面试体检考察，走完": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::基层岗位给编制和宿舍，但合同写着三年内不得调动。::签了。先稳定下来": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::晋升名额要去外地驻点两年。孩子刚上学，家里也离不开人。::去。周末再赶回来": {
    "primaryMechanic": "careSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.originBond",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::跨单位调动的时候，系统少了七年经历记录。新岗位要求截止前说清楚。::翻出旧工资条和调令，补齐": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::熟人把材料发来，想让你在截止后补进系统一次。::把公开流程截图发给他": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::外面的岗位薪水更高。但一旦辞职，编制和年金就回不来了。::留下。不走了": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.career",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "public::一通投诉把窗口推上热搜，你又是当天签字的经办人。这事怎么处理？::把材料调出来，公开说明": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "public::这轮你打算怎么报？::报最符合条件的那个": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "remote::被一个平台捏住了。先怎么办？::把作品和账单导出来。找自己的客户": {
    "primaryMechanic": "portableSkill",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.skill",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "remote::第一份远程合同，怎么处理？::让对方把条款补齐再签": {
    "primaryMechanic": "negotiation",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "remote::基地这件事，最后怎么定？::稳下来。扎根": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "remote::跨境这件事，最后怎么落？::许可下来了。按条件去": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "patch": [
      {
        "type": "add",
        "target": "pressures.loneliness",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "remote::还要把饭碗全押在这个账号上吗？::分散开。平台只留一小块": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "source": "eventAuthored"
  },
  "remote::先怎么试？::租个稳定的地方。把本地的都补齐": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "remote::这次跨境，怎么准备？::一项项查清楚。用真实材料": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "social::这条旧消息，发不发？::发一句具体的近况": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "发消息前，你先找回双方都记得的一件小事，没把“最近好吗”丢进空白里。",
    "patch": [
      {
        "type": "add",
        "target": "relationships.network",
        "value": 2
      }
    ],
    "resultSuffix": "消息发出去了。回不回，还得等对方。",
    "source": "eventAuthored"
  },
  "social::这段校园关系怎么谈？::把作息和边界说开": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "开口以前，你把借东西、代报名和自己的时间分开说，没有把不高兴全塞进一句随便。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "social::今晚去不去？::说明有安排，不去": {
    "primaryMechanic": "boundary",
    "mode": "resultVariant",
    "explanation": "你把今晚不去和明天照常交接放在一句话里，不拿长篇理由换下班许可。",
    "patch": [
      {
        "type": "add",
        "target": "agency",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "social::这份人情，帮到哪里？::只帮能核实的部分": {
    "primaryMechanic": "evidence",
    "mode": "resultVariant",
    "explanation": "你先圈出自己亲眼见过的内容；不能确认的那一项，不靠关系补签。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.evidence",
        "value": 1
      }
    ],
    "source": "eventAuthored"
  },
  "social::住处要不要和朋友绑在一起？::一起核合同再合租": {
    "primaryMechanic": "cashBuffer",
    "mode": "costShift",
    "explanation": "签字以前，你把押金、搬家费和第一个月的公共开支留出了一点缓冲。",
    "patch": [
      {
        "type": "add",
        "target": "finance.cash",
        "value": 1200
      }
    ],
    "source": "eventAuthored"
  },
  "social::第一次，要不要见？::按约去公共场所": {
    "primaryMechanic": "riskSense",
    "mode": "riskShift",
    "explanation": "赴约前，你把地点、回程和临时退出的办法发给了可信的人。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.riskSense",
        "value": 1
      }
    ],
    "resultSuffix": "见面合不合拍还不知道，回程还在自己手里。",
    "source": "eventAuthored"
  },
  "social::这次，要不要开口？::把一个具体缺口说出来": {
    "primaryMechanic": "network",
    "mode": "resultVariant",
    "explanation": "你先把最急的一件事说具体，也允许对方只回答能不能做这一件。",
    "patch": [
      {
        "type": "add",
        "target": "pressures.loneliness",
        "value": -2
      }
    ],
    "source": "eventAuthored"
  },
  "social::这次把时间留给谁？::发一条具体消息": {
    "primaryMechanic": "resilience",
    "mode": "resultVariant",
    "explanation": "你先接受这条消息可能没有回音，再决定把真实近况写进去。",
    "patch": [
      {
        "type": "add",
        "target": "capabilities.resilience",
        "value": 1
      }
    ],
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
