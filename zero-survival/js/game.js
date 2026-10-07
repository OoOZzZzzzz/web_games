/**
 * game.js — 游戏总控制器（装配层）
 * 创建 canvas / Engine / World，装配各系统，管理生命周期（begin / restart / chooseSkill / resize）。
 * 供 UI 与入口调用。通过 window.ZS.Game 暴露。
 */
(function () {
  const ZS = window.ZS;
  let canvas = null;
  let ctx = null;
  let engine = null;
  let world = null;
  let xpSystem = null;
  let effectsSystem = null;

  const Game = {
    // 入口初始化（main.js 调用一次）
    init() {
      canvas = document.getElementById('game-canvas');
      ctx = canvas.getContext('2d');

      world = ZS.World;
      world.canvas = canvas;

      engine = new ZS.Core.Engine();
      engine.setCtx(ctx).bindWorld(world);
      world.engine = engine;

      // 装配系统（顺序即更新顺序）
      const S = ZS.Systems;
      engine.addSystem(new S.Player());
      engine.addSystem(new S.Shooting());
      engine.addSystem(new S.Summon());
      engine.addSystem(new S.Spawn());
      engine.addSystem(new S.Boss());
      xpSystem = new S.XPSystem();
      engine.addSystem(xpSystem);
      effectsSystem = new S.Effects();
      engine.addSystem(effectsSystem);
      engine.addSystem(new S.Render());

      // 输入
      ZS.Input.init();

      // UI 注册表初始化（各界面自抓 DOM + 绑按钮）
      ZS.UI.manager.init();

      // 尺寸自适应
      this._resize();
      window.addEventListener('resize', () => this._resize());

      // 显示开始界面 + 启动主循环（菜单阶段只播氛围）
      ZS.UI.manager.show('start');
      engine.start();

      // 暴露实例
      ZS.Game = Game;
    },

    _resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (effectsSystem) effectsSystem.resize(world);
      const p = world.player;
      if (p) {
        p.x = Math.max(p.radius, Math.min(world.width - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(world.height - p.radius, p.y));
      }
    },

    // 开始一局（新手确认 / 重开共用）
    begin() {
      world.reset();
      engine.begin();
      ZS.UI.manager.hide('start');
      ZS.UI.manager.hide('tutorial');
      ZS.UI.manager.hide('levelup');
      ZS.UI.manager.hide('death');
      ZS.UI.manager.show('hud');
      const hud = ZS.UI.manager.get('hud');
      if (hud && hud.refresh) hud.refresh();
    },

    restart() { this.begin(); },

    // 选中技能（UI 回调 → xp 系统应用并恢复）
    chooseSkill(skillId) {
      if (xpSystem) xpSystem.chooseSkill(world, skillId);
      ZS.UI.manager.hide('levelup');
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.Game = Game;
})();