/**
 * ui/panel.js — 主菜单面板系统
 * 每个面板是一个自包含对象 { id, title, icon, build(host, ctx), onShow(), onHide() }，
 * 注册进 Panel 表；由 screen-start 统一挂载到面板宿主并切换。
 * 新增面板 = 新建一个模块 + register，不改既有界面。
 * 通过 window.ZS.UI.Panel 暴露。
 */
(function () {
  const Panel = {
    registry: {},
    current: null,
    host: null,

    register(p) { this.registry[p.id] = p; return this; },
    get(id) { return this.registry[id]; },
    ids() { return Object.keys(this.registry); },

    // 由 screen-start 注入面板宿主容器（所有面板 content 渲染进它）
    mount(host) { this.host = host; },

    // 打开某面板：构建内容 + 显示
    open(id) {
      const p = this.registry[id];
      if (!p || !this.host) return;
      if (this.current && this.current.onHide) this.current.onHide();
      this.current = p;
      const host = this.host;
      host.classList.remove('hidden');
      host.innerHTML = '';   // 清空，重新构建
      const head = document.createElement('div');
      head.className = 'panel-head';
      head.innerHTML = `<span class="panel-icon">${p.icon || ''}</span><h3 class="panel-title">${p.title}</h3>
        <button class="panel-close" aria-label="关闭">✕</button>`;
      head.querySelector('.panel-close').addEventListener('click', () => this.close());
      host.appendChild(head);
      const body = document.createElement('div');
      body.className = 'panel-body';
      host.appendChild(body);
      p.host = body;
      if (p.build) p.build(body, { store: window.ZS.UI.store, game: window.ZS.Game, uiMenu: window.ZS.Data.uiMenu });
      host.classList.add('open');
      if (p.onShow) p.onShow();
    },

    close() {
      if (this.current && this.current.onHide) this.current.onHide();
      if (this.host) {
        this.host.classList.remove('open');
        this.host.classList.add('hidden');
        this.host.innerHTML = '';
      }
      this.current = null;
    },
  };

  window.ZS = window.ZS || {};
  window.ZS.UI = window.ZS.UI || {};
  window.ZS.UI.Panel = Panel;
})();