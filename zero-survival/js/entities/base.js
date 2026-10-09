/**
 * entities/base.js — Entity 实体基类（OOP 封装）
 * 所有实体(玩家/怪物/BOSS)的公共字段：位置/半径/外观/受击计时。
 * 子类负责数值与外观的具体化。通过 window.ZS.Entities.Entity 暴露。
 */
(function () {
  class Entity {
    constructor(opts = {}) {
      this.x = opts.x ?? 0;
      this.y = opts.y ?? 0;
      this.radius = opts.radius ?? 0;
      this.appearance = opts.appearance ?? {};
      this.slowTimer = 0;
      this.hitFlash = 0;
    }
  }

  window.ZS = window.ZS || {};
  window.ZS.Entities = window.ZS.Entities || {};
  window.ZS.Entities.Entity = Entity;
})();