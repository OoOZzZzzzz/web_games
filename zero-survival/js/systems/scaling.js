/**
 * systems/scaling.js — 等级 → 怪物数值缩放
 * 玩家每提升 5 级，所有怪物血量+15%、伤害+10%；移速随等级微增。
 * 由 spawn.js / boss.js 调用计算缩放后的数值。
 * 通过 window.ZS.Systems.Scaling 暴露。
 */
(function () {
  const Data = window.ZS.Data;

  const Scaling = {
    // 普通/精英怪物按玩家等级缩放（读取继承后的 stats）
    monster(world, typeId) {
      const m = Data.resolveMonster(typeId);
      const lv = world.level;
      const lv5 = Math.floor(lv / 5);
      const hp = Math.round(m.stats.hp * (1 + lv5 * Data.scaling.per5Lv.hp));
      const dmg = Math.round(m.stats.damage * (1 + lv5 * Data.scaling.per5Lv.dmg));
      const speed = m.stats.speed * (1 + lv * Data.scaling.speedPerLv);
      return { hp, damage: dmg, speed };
    },
    // BOSS 按玩家等级缩放
    boss(world, bossId) {
      const b = Data.resolveBoss(bossId);
      const lv = world.level;
      const lv5 = Math.floor(lv / 5);
      const hp = Math.round(b.stats.hp * (1 + lv5 * Data.scaling.per5Lv.hp));
      const dmg = Math.round(b.stats.damage * (1 + lv5 * Data.scaling.per5Lv.dmg));
      return { hp, damage: dmg, speed: b.stats.speed };
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Scaling = Scaling;
})();