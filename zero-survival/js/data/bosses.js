/**
 * data/bosses.js — BOSS 模型表（纯数据，与普通怪物解耦）
 * 专属属性 / 外观 / 技能 / 登场规则。
 * 通过 window.ZS.Data.bosses 暴露。
 */
(function () {
  const bosses = {
    lord: {
      id: 'lord',
      name: '深渊领主',
      unlockLv: 10,           // 玩家达 10 级（20/30…每 10 级一只）登场
      hp: 800,
      speed: 60,
      damage: 40,
      xp: 150,
      color: '#3a3f4b',
      radius: 38,
      tier: 'boss',
      shape: 'square',
      warnText: '⚠ BOSS 深渊领主降临！',
      // BOSS 专属技能（数值 + 行为描述；当前实现为近战接触，预留扩展）
      skills: [
        { id: 'melee', name: '碾压', desc: '接触玩家造成高额伤害', damage: 40 },
        { id: 'summon', name: '呼召', desc: '周期性召唤小怪（预留）', cooldown: 8, enabled: false },
      ],
      desc: '超大黑色BOSS，每10级刷新一只BOSS',
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Data = window.ZS.Data || {};
  window.ZS.Data.bosses = bosses;
})();