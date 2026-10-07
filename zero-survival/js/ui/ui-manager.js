/**
 * ui/ui-manager.js — UI 注册表 / 管理器
 * 每个界面是一个自包含 screen 对象 { init(), show(payload), hide() }。
 * 通过 register(id, screen) 注册；show(id, payload) 显示（可传变体id，兼容随机开局）。
 * 新增界面只需 register + 在 index.html 加一个 script 标签，不改既有系统。
 * 通过 window.ZS.UI.manager 暴露。
 */
(function () {
  const manager = {
    registry: {},

    register(id, screen) { this.registry[id] = screen; return this; },
    get(id) { return this.registry[id]; },

    // 初始化所有已注册界面
    init() {
      for (const id in this.registry) {
        if (this.registry[id].init) this.registry[id].init();
      }
    },

    // 显示某界面（可传 payload，如等级/技能列表/结算数据/变体id）
    show(id, payload) {
      const s = this.registry[id];
      if (s && s.show) s.show(payload);
    },

    hide(id) {
      const s = this.registry[id];
      if (s && s.hide) s.hide();
    },

    hideAll() {
      for (const id in this.registry) {
        if (this.registry[id].hide) this.registry[id].hide();
      }
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.UI = window.ZS.UI || {};
  window.ZS.UI.manager = manager;
})();