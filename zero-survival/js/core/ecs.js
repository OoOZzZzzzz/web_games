/**
 * core/ecs.js — 极简 ECS 引擎
 * System 基类 + Engine（主循环调度 / 暂停 / 系统编排）+ query 组件过滤。
 * 实体 = 纯对象，组件 = 其数据字段（e.hp, e.x, e.y…）。
 * 通过 window.ZS.Core.{System, Engine, query} 暴露。
 */
(function () {
  const CONFIG = window.ZS.CONFIG;

  // System 基类：子类在原型上定义 update(world, dt) / draw?(ctx, world)。
  // 注意：绝不在构造器里给 this.update 赋默认空函数，否则会遮蔽子类原型方法。
  class System {
    constructor(opts = {}) {
      this.name = opts.name || 'System';
    }
  }

  // Engine：持有有序系统列表，驱动 rAF 主循环
  class Engine {
    constructor() {
      this.systems = [];
      this.world = null;      // 由 game.js 绑定
      this.ctx = null;        // canvas 2d 上下文（渲染用）
      this.running = false;
      this.paused = false;
      this.rafId = null;
      this.lastTime = performance.now();
    }
    addSystem(sys) { this.systems.push(sys); return this; }
    bindWorld(world) { this.world = world; return this; }
    setCtx(ctx) { this.ctx = ctx; return this; }

    update(dt) {
      if (!this.world) return;
      // 仅调用定义了 update 的系统（如 Render 只绘制、无 update）
      for (const s of this.systems) if (s.update) s.update(this.world, dt);
    }
    draw() {
      if (!this.ctx) return;
      for (const s of this.systems) if (s.draw) s.draw(this.ctx, this.world);
    }

    _loop = (t) => {
      let dt = (t - this.lastTime) / 1000;
      dt = Math.min(dt, CONFIG.time.maxDt);
      this.lastTime = t;
      if (this.running && !this.paused) this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame(this._loop);
    };

    start() { if (this.rafId) return; this.running = true; this.rafId = requestAnimationFrame(this._loop); }
    begin() { this.running = true; this.paused = false; }
    pause() { this.paused = true; }
    resume() { this.paused = false; }
    stop() { this.running = false; }
    togglePause() { this.paused = !this.paused; return this.paused; }
  }

  // 按组件字段名过滤实体列表（返回新数组）
  function query(list, ...comps) {
    if (!comps.length) return list;
    return list.filter((e) => comps.every((c) => e[c] !== undefined));
  }

  window.ZS = window.ZS || {};
  window.ZS.Core = window.ZS.Core || {};
  window.ZS.Core.System = System;
  window.ZS.Core.Engine = Engine;
  window.ZS.Core.query = query;
})();