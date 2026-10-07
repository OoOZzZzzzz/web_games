/**
 * systems/death.js — 死亡结算
 * 玩家 HP<=0 时由 combat 调用：停止引擎、组装结算数据、显示死亡界面、发 GAME_OVER。
 * 通过 window.ZS.Systems.Death 暴露。
 */
(function () {
  const Data = window.ZS.Data;
  const bus = window.ZS.Events.bus;
  const EV = window.ZS.Events.EV;

  const Death = {
    onDeath(world) {
      if (world.engine) world.engine.stop();
      const skillNames = Object.keys(world.skills)
        .filter((id) => world.skills[id] > 0)
        .map((id) => `${Data.SKILL_MAP[id].icon} ${Data.SKILL_MAP[id].name} Lv.${world.skills[id]}`);
      const skillsStr = skillNames.length ? skillNames.join('\n') : '（未获取任何技能）';
      const mm = Math.floor(world.elapsed / 60);
      const ss = Math.floor(world.elapsed % 60);
      const stats = [
        ['最高等级', 'Lv.' + world.maxLevel],
        ['击杀怪物总数', String(world.kills)],
        ['存活时长', `${mm}分${String(ss).padStart(2, '0')}秒`],
        ['获得技能', skillsStr],
      ];
      bus.emit(EV.GAME_OVER, stats);
      window.ZS.UI.manager.show('death', stats);
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Systems = window.ZS.Systems || {};
  window.ZS.Systems.Death = Death;
})();