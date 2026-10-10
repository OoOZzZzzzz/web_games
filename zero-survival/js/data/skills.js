/**
 * data/skills.js — 全部肉鸽技能定义（纯数据）
 * 每个技能：id / name / icon / category / intro / levels(各级描述) / values(各级数值) / effect(运行行为)
 * 由 systems/skills.js 读取数值并换算效果，UI 读取描述/图标/分类。
 * 通过 window.ZS.Data.SKILLS / SKILL_MAP / CATEGORY 暴露。
 */
(function () {
  const CATEGORY = {
    attack: '普攻强化',
    defense: '生存防御',
    summon: '召唤附加',
    crit: '暴击增伤',
  };

  const SKILLS = [
    // ---- 普攻强化类 ----
    {
      id: 'rapidFire', name: '急速射击', icon: '⚡', category: CATEGORY.attack,
      intro: '提升你的攻击速度',
      levels: ['攻击速度 +20%', '攻击速度 +40%', '攻击速度 +65%', '攻击速度 +90%', '攻击速度 +120%'],
      values: [0.20, 0.40, 0.65, 0.90, 1.20],
      effect: { type: 'stat', key: 'fireRate' },
      visual: { kind: 'bulletTrail', color: '#ffffff', params: { streak: 1.6 } },
    },
    {
      id: 'pierce', name: '穿透弹', icon: '🎯', category: CATEGORY.attack,
      intro: '子弹可穿透敌人',
      levels: ['子弹穿透1个敌人', '子弹穿透2个敌人', '子弹穿透3个敌人', '子弹穿透4个敌人', '子弹无限穿透敌人'],
      values: [1, 2, 3, 4, Infinity],
      effect: { type: 'bullet', key: 'pierce' },
      visual: { kind: 'bulletTrail', color: '#ffd54f', params: { streak: 2.4 } },
    },
    {
      id: 'explosive', name: '爆裂弹', icon: '💥', category: CATEGORY.attack,
      intro: '子弹命中敌人产生爆炸伤害',
      levels: ['命中产生小爆炸，额外20%伤害', '爆炸范围扩大，爆炸额外35%伤害', '爆炸范围继续扩大，爆炸额外55%伤害', '爆炸额外80%伤害，命中敌人减速0.5s', '大范围爆炸，爆炸额外120%伤害，减速持续1s'],
      // 每级：[爆炸额外伤害比例, 爆炸半径系数, 减速时长(秒)]
      values: [[0.20, 1.0, 0], [0.35, 1.3, 0], [0.55, 1.6, 0], [0.80, 1.9, 0.5], [1.20, 2.4, 1.0]],
      effect: { type: 'bullet', key: 'explosive', baseRadius: 70 },
      visual: { kind: 'onHit', color: '#ff9800', params: { ring: 1, sparks: 8 } },
    },
    {
      id: 'multiShot', name: '多重弹', icon: '🔱', category: CATEGORY.attack,
      intro: '额外发射多颗子弹',
      levels: ['同向额外发射1颗子弹', '同向额外发射2颗子弹', '同向额外发射3颗子弹', '同向额外发射4颗子弹', '同向额外发射6颗子弹'],
      values: [1, 2, 3, 4, 6],
      effect: { type: 'bullet', key: 'multiShot', spread: 0.06 },
      visual: { kind: 'bulletTrail', color: '#ffb300', params: { sparks: 1 } },
    },

    // ---- 生存防御类 ----
    {
      id: 'vitality', name: '生命强化', icon: '❤️', category: CATEGORY.defense,
      intro: '提升最大生命值',
      levels: ['最大生命值 +20', '最大生命值 +45', '最大生命值 +75', '最大生命值 +110', '最大生命值 +160'],
      values: [20, 45, 75, 110, 160],
      effect: { type: 'stat', key: 'maxHp' },
      visual: { kind: 'onPick', color: '#81c784', params: { ring: 1, rise: 8 } },
    },
    {
      id: 'lifesteal', name: '生命汲取', icon: '🩸', category: CATEGORY.defense,
      intro: '击杀怪物回复生命值',
      levels: ['击杀怪物回复3生命值', '击杀怪物回复6生命值', '击杀怪物回复10生命值', '击杀怪物回复15生命值', '击杀怪物回复22生命值'],
      values: [3, 6, 10, 15, 22],
      effect: { type: 'stat', key: 'lifesteal' },
      visual: { kind: 'onKill', color: '#ef5350', params: { stream: 1 } },
    },
    {
      id: 'haste', name: '迅捷', icon: '👟', category: CATEGORY.defense,
      intro: '提升移动速度',
      levels: ['移动速度 +12%', '移动速度 +25%', '移动速度 +40%', '移动速度 +58%', '移动速度 +80%'],
      values: [0.12, 0.25, 0.40, 0.58, 0.80],
      effect: { type: 'stat', key: 'moveSpeed' },
      visual: { kind: 'playerAura', color: '#4fc3f7', params: { trail: 1 } },
    },
    {
      id: 'armor', name: '减伤护甲', icon: '🛡️', category: CATEGORY.defense,
      intro: '受到的所有伤害降低',
      levels: ['受到所有伤害 -8%', '受到所有伤害 -16%', '受到所有伤害 -25%', '受到所有伤害 -36%', '受到所有伤害 -50%'],
      values: [0.08, 0.16, 0.25, 0.36, 0.50],
      effect: { type: 'stat', key: 'armor' },
      visual: { kind: 'playerAura', color: '#b0bec5', params: { shield: 1 } },
    },

    // ---- 召唤附加类 ----
    {
      id: 'blade', name: '追踪飞刃', icon: '🗡️', category: CATEGORY.summon,
      intro: '召唤自动追踪敌人的飞刃持续攻击',
      levels: ['召唤1把飞刃，自动追踪敌人，基础伤害6', '召唤2把飞刃，飞刃伤害+20%', '召唤3把飞刃，飞刃伤害+40%', '召唤4把飞刃，飞刃伤害+65%', '召唤6把飞刃，飞刃伤害+100%'],
      // 每级：[数量, 伤害加成比例]
      values: [[1, 0], [2, 0.20], [3, 0.40], [4, 0.65], [6, 1.00]],
      baseDamage: 6,
      effect: { type: 'summon', key: 'blade', orbitRadius: 52, attackRange: 46, cooldown: 0.55 },
      visual: { kind: 'summon', color: '#ffd54f', params: { glow: 1, trail: 1 } },
    },
    {
      id: 'flameAura', name: '火焰光环', icon: '🔥', category: CATEGORY.summon,
      intro: '灼烧光环内的敌人',
      levels: ['周身小火环，灼烧范围内敌人，每秒5伤害', '光环范围扩大，每秒8伤害', '光环范围扩大，每秒12伤害', '大范围光环，每秒18伤害', '超大灼烧光环，每秒28伤害'],
      // 每级：[每秒伤害, 光环半径]
      values: [[5, 60], [8, 80], [12, 100], [18, 130], [28, 170]],
      effect: { type: 'summon', key: 'flameAura' },
      visual: { kind: 'summon', color: '#ff5722', params: { particles: 1 } },
    },
    {
      id: 'chainLightning', name: '雷电链', icon: '⚡', category: CATEGORY.summon,
      intro: '普攻命中概率触发连锁闪电',
      levels: ['普攻命中，20%概率触发闪电，连锁1个敌人，伤害8', '触发概率30%，连锁2个敌人，伤害+15%', '触发概率42%，连锁3个敌人，伤害+30%', '触发概率55%，连锁4个敌人，伤害+45%', '触发概率70%，连锁5个敌人，闪电命中敌人短暂僵直0.3s'],
      // 每级：[触发概率, 连锁数量, 伤害加成比例, 僵直时长(秒)]
      values: [[0.20, 1, 0, 0], [0.30, 2, 0.15, 0], [0.42, 3, 0.30, 0], [0.55, 4, 0.45, 0], [0.70, 5, 0.60, 0.3]],
      baseDamage: 8,
      effect: { type: 'summon', key: 'chainLightning', chainRange: 130 },
      visual: { kind: 'onHit', color: '#ffe082', params: { sparks: 1 } },
    },

    // ---- 暴击增伤类 ----
    {
      id: 'crit', name: '暴击增幅', icon: '💢', category: CATEGORY.crit,
      intro: '提升暴击率与暴击伤害',
      levels: ['暴击率+8%，暴击伤害+15%', '暴击率+15%，暴击伤害+30%', '暴击率+22%，暴击伤害+50%', '暴击率+30%，暴击伤害+75%', '暴击率+40%，暴击伤害+110%'],
      // 每级：[暴击率, 暴击伤害加成]
      values: [[0.08, 0.15], [0.15, 0.30], [0.22, 0.50], [0.30, 0.75], [0.40, 1.10]],
      effect: { type: 'stat', key: 'crit' },
      visual: { kind: 'onHit', color: '#ff7043', params: { burst: 1 } },
    },
    {
      id: 'attackBoost', name: '攻击强化', icon: '🗡️', category: CATEGORY.crit,
      intro: '提升所有攻击伤害',
      levels: ['所有攻击伤害+12%', '所有攻击伤害+25%', '所有攻击伤害+40%', '所有攻击伤害+60%', '所有攻击伤害+90%'],
      values: [0.12, 0.25, 0.40, 0.60, 0.90],
      effect: { type: 'stat', key: 'attackBoost' },
      visual: { kind: 'playerAura', color: '#ff7043', params: { power: 1 } },
    },
  ];

  // 按 id 建索引
  const SKILL_MAP = {};
  for (const s of SKILLS) SKILL_MAP[s.id] = s;

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.SKILLS = SKILLS;
  window.ZS.Data.SKILL_MAP = SKILL_MAP;
  window.ZS.Data.SKILL_CATEGORY = CATEGORY;
})();