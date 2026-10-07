/**
 * data.js — 静态数据表
 * 零级求生：技能狂潮
 *
 * 包含：经验等级表、怪物类型表、完整技能库（13个技能 × Lv1~5）。
 * 所有数值严格对应设计文档。
 */

// ============ 经验等级表 ============
// xpToLevel[level] = 从 level 级升到 level+1 级所需经验
const XP_TABLE = [
  20,   // 0 -> 1
  35,   // 1 -> 2
  55,   // 2 -> 3
  80,   // 3 -> 4
  110,  // 4 -> 5
  150,  // 5 -> 6
  200,  // 6 -> 7
  260,  // 7 -> 8
  330,  // 8 -> 9
  410,  // 9 -> 10
];

// 10级之后：下一级所需经验 = 上一级 * 1.25（无限递增）
function xpNeeded(level) {
  if (level < XP_TABLE.length) return XP_TABLE[level];
  // 循环推导到目标等级
  let prev = XP_TABLE[XP_TABLE.length - 1];
  for (let i = XP_TABLE.length; i < level; i++) prev = Math.round(prev * 1.25);
  return Math.round(prev * 1.25);
}

// ============ 怪物类型表 ============
// 属性：名称 / 解锁等级 / 生命值 / 移动速度(px/s) / 单次攻击伤害 / 击杀掉落经验 / 外观颜色 / 半径 / 体型类型
const MONSTER_TYPES = {
  slime: {
    name: '史莱姆', unlockLv: 0, hp: 30, speed: 58, damage: 8, xp: 8,
    color: '#66bb6a', radius: 14, tier: 'normal', desc: '绿色小圆球，基础怪，数量最多',
  },
  crawler: {
    name: '疾行虫', unlockLv: 2, hp: 25, speed: 120, damage: 6, xp: 10,
    color: '#ef5350', radius: 11, tier: 'normal', desc: '红色小虫，移速快，血量低，喜欢围堵',
  },
  golem: {
    name: '重甲傀儡', unlockLv: 4, hp: 80, speed: 46, damage: 15, xp: 18,
    color: '#b0bec5', radius: 20, tier: 'normal', desc: '灰色方块怪，血厚，移动慢，高威胁',
  },
  elite: {
    name: '暗影巨兽', unlockLv: 6, hp: 200, speed: 72, damage: 25, xp: 40,
    color: '#ab47bc', radius: 26, tier: 'elite', desc: '紫色大怪，精英怪，击杀掉大量经验',
  },
  boss: {
    name: '深渊领主', unlockLv: 10, hp: 800, speed: 60, damage: 40, xp: 150,
    color: '#3a3f4b', radius: 38, tier: 'boss', desc: '超大黑色BOSS，每10级刷新一只BOSS',
  },
};

// ============ 技能库 ============
// 技能分类常量
const SKILL_CATEGORY = {
  attack: '普攻强化',
  defense: '生存防御',
  summon: '召唤附加',
  crit: '暴击增伤',
};

/**
 * 技能结构：
 *  id, name, icon, category, intro(一句简介), maxLevel(恒为5),
 *  levels: 每级描述（Lv1..Lv5 对应的显示文案）
 *  values: 每级对应的游戏数值（game.js 读取并换算为实际效果）
 */
const SKILLS = [
  // ---- 普攻强化类 ----
  {
    id: 'rapidFire', name: '急速射击', icon: '⚡', category: SKILL_CATEGORY.attack,
    intro: '提升你的攻击速度',
    levels: ['攻击速度 +20%', '攻击速度 +40%', '攻击速度 +65%', '攻击速度 +90%', '攻击速度 +120%'],
    values: [0.20, 0.40, 0.65, 0.90, 1.20],
  },
  {
    id: 'pierce', name: '穿透弹', icon: '🎯', category: SKILL_CATEGORY.attack,
    intro: '子弹可穿透敌人',
    levels: ['子弹穿透1个敌人', '子弹穿透2个敌人', '子弹穿透3个敌人', '子弹穿透4个敌人', '子弹无限穿透敌人'],
    values: [1, 2, 3, 4, Infinity],   // Infinity = 无限穿透
  },
  {
    id: 'explosive', name: '爆裂弹', icon: '💥', category: SKILL_CATEGORY.attack,
    intro: '子弹命中敌人产生爆炸伤害',
    levels: [
      '命中产生小爆炸，额外20%伤害',
      '爆炸范围扩大，爆炸额外35%伤害',
      '爆炸范围继续扩大，爆炸额外55%伤害',
      '爆炸额外80%伤害，命中敌人减速0.5s',
      '大范围爆炸，爆炸额外120%伤害，减速持续1s',
    ],
    // 每级：[爆炸额外伤害比例, 爆炸半径系数, 减速时长(秒)]
    values: [
      [0.20, 1.0, 0], [0.35, 1.3, 0], [0.55, 1.6, 0], [0.80, 1.9, 0.5], [1.20, 2.4, 1.0],
    ],
  },
  {
    id: 'multiShot', name: '多重弹', icon: '🔱', category: SKILL_CATEGORY.attack,
    intro: '额外发射多颗子弹',
    levels: ['同向额外发射1颗子弹', '同向额外发射2颗子弹', '同向额外发射3颗子弹', '同向额外发射4颗子弹', '同向额外发射6颗子弹'],
    values: [1, 2, 3, 4, 6],
  },

  // ---- 生存防御类 ----
  {
    id: 'vitality', name: '生命强化', icon: '❤️', category: SKILL_CATEGORY.defense,
    intro: '提升最大生命值',
    levels: ['最大生命值 +20', '最大生命值 +45', '最大生命值 +75', '最大生命值 +110', '最大生命值 +160'],
    values: [20, 45, 75, 110, 160],
  },
  {
    id: 'lifesteal', name: '生命汲取', icon: '🩸', category: SKILL_CATEGORY.defense,
    intro: '击杀怪物回复生命值',
    levels: ['击杀怪物回复3生命值', '击杀怪物回复6生命值', '击杀怪物回复10生命值', '击杀怪物回复15生命值', '击杀怪物回复22生命值'],
    values: [3, 6, 10, 15, 22],
  },
  {
    id: 'haste', name: '迅捷', icon: '👟', category: SKILL_CATEGORY.defense,
    intro: '提升移动速度',
    levels: ['移动速度 +12%', '移动速度 +25%', '移动速度 +40%', '移动速度 +58%', '移动速度 +80%'],
    values: [0.12, 0.25, 0.40, 0.58, 0.80],
  },
  {
    id: 'armor', name: '减伤护甲', icon: '🛡️', category: SKILL_CATEGORY.defense,
    intro: '受到的所有伤害降低',
    levels: ['受到所有伤害 -8%', '受到所有伤害 -16%', '受到所有伤害 -25%', '受到所有伤害 -36%', '受到所有伤害 -50%'],
    values: [0.08, 0.16, 0.25, 0.36, 0.50],
  },

  // ---- 召唤附加类 ----
  {
    id: 'blade', name: '追踪飞刃', icon: '🗡️', category: SKILL_CATEGORY.summon,
    intro: '召唤自动追踪敌人的飞刃持续攻击',
    levels: [
      '召唤1把飞刃，自动追踪敌人，基础伤害6',
      '召唤2把飞刃，飞刃伤害+20%',
      '召唤3把飞刃，飞刃伤害+40%',
      '召唤4把飞刃，飞刃伤害+65%',
      '召唤6把飞刃，飞刃伤害+100%',
    ],
    // 每级：[数量, 伤害加成比例]，基础伤害6
    values: [[1, 0], [2, 0.20], [3, 0.40], [4, 0.65], [6, 1.00]],
    baseDamage: 6,
  },
  {
    id: 'flameAura', name: '火焰光环', icon: '🔥', category: SKILL_CATEGORY.summon,
    intro: '灼烧光环内的敌人',
    levels: [
      '周身小火环，灼烧范围内敌人，每秒5伤害',
      '光环范围扩大，每秒8伤害',
      '光环范围扩大，每秒12伤害',
      '大范围光环，每秒18伤害',
      '超大灼烧光环，每秒28伤害',
    ],
    // 每级：[每秒伤害, 光环半径]
    values: [[5, 60], [8, 80], [12, 100], [18, 130], [28, 170]],
  },
  {
    id: 'chainLightning', name: '雷电链', icon: '⚡', category: SKILL_CATEGORY.summon,
    intro: '普攻命中概率触发连锁闪电',
    levels: [
      '普攻命中，20%概率触发闪电，连锁1个敌人，伤害8',
      '触发概率30%，连锁2个敌人，伤害+15%',
      '触发概率42%，连锁3个敌人，伤害+30%',
      '触发概率55%，连锁4个敌人，伤害+45%',
      '触发概率70%，连锁5个敌人，闪电命中敌人短暂僵直0.3s',
    ],
    // 每级：[触发概率, 连锁数量, 伤害加成比例, 僵直时长(秒)]
    values: [[0.20, 1, 0, 0], [0.30, 2, 0.15, 0], [0.42, 3, 0.30, 0], [0.55, 4, 0.45, 0], [0.70, 5, 0.60, 0.3]],
    baseDamage: 8,
  },

  // ---- 暴击增伤类 ----
  {
    id: 'crit', name: '暴击增幅', icon: '💢', category: SKILL_CATEGORY.crit,
    intro: '提升暴击率与暴击伤害',
    levels: [
      '暴击率+8%，暴击伤害+15%',
      '暴击率+15%，暴击伤害+30%',
      '暴击率+22%，暴击伤害+50%',
      '暴击率+30%，暴击伤害+75%',
      '暴击率+40%，暴击伤害+110%',
    ],
    // 每级：[暴击率, 暴击伤害加成]
    values: [[0.08, 0.15], [0.15, 0.30], [0.22, 0.50], [0.30, 0.75], [0.40, 1.10]],
  },
  {
    id: 'attackBoost', name: '攻击强化', icon: '🗡️', category: SKILL_CATEGORY.crit,
    intro: '提升所有攻击伤害',
    levels: ['所有攻击伤害+12%', '所有攻击伤害+25%', '所有攻击伤害+40%', '所有攻击伤害+60%', '所有攻击伤害+90%'],
    values: [0.12, 0.25, 0.40, 0.60, 0.90],
  },
];

// 按 id 建立索引，方便游戏逻辑查询
const SKILL_MAP = {};
for (const s of SKILLS) SKILL_MAP[s.id] = s;

// ============ UI 文案 ============
const UI_TEXT = {
  bossWarn: '⚠ BOSS 深渊领主降临！',
  hintBar: '拾取经验球，击败来袭怪物！',
  deathTitle: '本局结束',
  deathSubtitle: '你被怪物击倒了！',
  restartBtn: '重新开局',
  skillPickTitle: '🎉 等级提升！请选择技能',
};

// 对外暴露（供后续模块统一读取）
window.DATA = {
  XP_TABLE, xpNeeded, MONSTER_TYPES, SKILLS, SKILL_MAP, SKILL_CATEGORY, UI_TEXT,
};