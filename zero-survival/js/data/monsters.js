/**
 * data/monsters.js — 普通怪物 + 精英 模型表（纯数据，继承 monsterBase）
 * 每个怪物：继承基类 + 覆盖 stats/appearance + features(特色)/abilities(能力) 钩子。
 * resolveMonster(typeId) 返回「基类+具体」合并后的完整定义，供世界/系统读取。
 * 通过 window.ZS.Data.{monsters, resolveMonster, monsterNormalIds} 暴露。
 */
(function () {
  const base = window.ZS.Data.monsterBase;

  const monsters = {
    slime: {
      name: '史莱姆', unlockLv: 0, shape: 'circle', radius: 14,
      stats: { hp: 30, speed: 58, damage: 8, xp: 8 },
      appearance: { color: '#66bb6a', highlight: 'rgba(255,255,255,0.16)' },
      features: ['bouncy'],
      onDeath: 'splash',
      desc: '绿色小圆球，基础怪，数量最多',
    },
    crawler: {
      name: '疾行虫', unlockLv: 2, shape: 'ellipse', radius: 11,
      stats: { hp: 25, speed: 120, damage: 6, xp: 10 },
      appearance: { color: '#ef5350' },
      features: ['fast', 'zigzag'],
      desc: '红色小虫，移速快，血量低，喜欢围堵',
    },
    golem: {
      name: '重甲傀儡', unlockLv: 4, shape: 'square', radius: 20,
      stats: { hp: 80, speed: 46, damage: 15, xp: 18 },
      appearance: { color: '#b0bec5', eyes: false },
      features: ['heavy'],
      desc: '灰色方块怪，血厚，移动慢，高威胁',
    },
    elite: {
      name: '暗影巨兽', unlockLv: 6, tier: 'elite', radius: 26,
      stats: { hp: 200, speed: 72, damage: 25, xp: 40 },
      appearance: { color: '#ab47bc', glow: '#7b1fa2' },
      features: ['regenerate'],
      desc: '紫色大怪，精英怪，击杀掉大量经验',
    },
  };

  // 深合并：基类 + 具体怪物（对象递归，数组克隆）
  function merge(a, b) {
    const out = {};
    for (const k in a) out[k] = clone(a[k]);
    for (const k in b) out[k] = clone(b[k]);
    return out;
  }
  function clone(v) {
    if (Array.isArray(v)) return v.slice();
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
    return v;
  }
  function resolveMonster(typeId) { return merge(base, monsters[typeId]); }

  const normalIds = Object.keys(monsters).filter((id) => (monsters[id].tier || 'normal') === 'normal');

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.monsters = monsters;
  window.ZS.Data.resolveMonster = resolveMonster;
  window.ZS.Data.monsterNormalIds = normalIds;
})();