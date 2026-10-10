/**
 * data/bosses.js — BOSS 模型表（纯数据，继承 monsterBase，与普通怪物解耦）
 * 专属属性 / 外观 / 能力(abilities) / 登场规则。
 * resolveBoss(bossId) 返回合并后的完整定义。
 * 通过 window.ZS.Data.{bosses, resolveBoss} 暴露。
 */
(function () {
  const base = window.ZS.Data.monsterBase;

  const bosses = {
    lord: {
      id: 'lord',
      name: '深渊领主',
      unlockLv: 10,           // 玩家达 10 级（20/30…每 10 级一只）登场
      tier: 'boss',
      shape: 'square',
      radius: 38,
      stats: { hp: 800, speed: 60, damage: 40, xp: 150 },
      appearance: { color: '#3a3f4b', glow: '#ff5722', stroke: 'rgba(255,255,255,0.2)' },
      features: ['huge'],
      abilities: ['summonMinions', 'rageBelow25'],
      onDeath: 'megaSplash',
      warnText: '⚠ BOSS 深渊领主降临！',
      // BOSS 专属技能（数值 + 行为描述；当前实现为近战接触，预留扩展）
      skills: [
        { id: 'melee', name: '碾压', desc: '接触玩家造成高额伤害', damage: 40 },
        { id: 'summon', name: '呼召', desc: '周期性召唤小怪（预留）', cooldown: 8, enabled: false },
      ],
      desc: '超大黑色BOSS，每10级刷新一只BOSS',
    },
  };

  function merge(a, b) {
    const out = {};
    for (const k in a) out[k] = clone(a[k]);
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) &&
          a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) {
        out[k] = merge(a[k], b[k]);   // 深合并嵌套对象（appearance/stats）
      } else {
        out[k] = clone(b[k]);
      }
    }
    return out;
  }
  function clone(v) {
    if (Array.isArray(v)) return v.slice();
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
    return v;
  }
  function resolveBoss(bossId) { return merge(base, bosses[bossId]); }

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.bosses = bosses;
  window.ZS.Data.resolveBoss = resolveBoss;
})();