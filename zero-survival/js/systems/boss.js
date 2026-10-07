/**
 * systems/boss.js — BOSS 系统
 * 玩家到达 Lv10/20/30… 时刷新一只 BOSS（属性随等级缩放）+ 登场警告。
 * 通过 window.ZS.Systems.Boss 暴露。
 */
(function () {
  const Data = window.ZS.Data;
  const Sfx = window.ZS.Sfx;
  const bus = window.ZS.Events.bus;
  const EV = window.ZS.Events.EV;
  const System = window.ZS.Core.System;

  class Boss extends System {
    constructor() {
      super({ name: 'Boss' });
    }
    update(world, dt) {
      if (world.phase !== 'battle') return;
      if (world.level < world.nextBossLv) return;
      // 到达 BOSS 等级：刷新 BOSS
      const bossId = Object.keys(Data.bosses)[0];
      const scaled = window.ZS.Systems.Scaling.boss(world, bossId);
      const b = world.spawnBoss(bossId, scaled);
      world.nextBossLv += Data.scaling.bossEveryLv;
      Sfx.boss();
      world.addFx({ type: 'warning', life: 2.2 });
      bus.emit(EV.BOSS, b);
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Boss = Boss;
})();