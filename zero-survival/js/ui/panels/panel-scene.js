/**
 * ui/panels/panel-scene.js — 场景选择面板
 * 列出 uiMenu.scenes（数据驱动），每个场景对应一个风格主题(styles)。
 * 选中即设为本局偏好场景，开局 startFlow 会优先采用。
 * 通过 window.ZS.UI.Panel.register 注册为 'scene'。
 */
(function () {
  const Panel = window.ZS.UI.Panel;
  const store = window.ZS.UI.store;

  function themeAccent(themeId) {
    const th = (window.ZS.Data.styles[themeId] || {}).theme || {};
    return (th.accent && th.accent.glow) || (th.enemy && th.enemy.glow) || '#8fb6ff';
  }

  function build(host, ctx) {
    const scenes = ctx.uiMenu.scenes;
    const cur = store.get('scene');
    const grid = document.createElement('div');
    grid.className = 'scene-grid';

    for (const s of scenes) {
      const card = document.createElement('button');
      card.className = 'scene-card' + (s.id === cur ? ' active' : '');
      const sw = themeAccent(s.themeId);
      card.innerHTML = `
        <span class="scene-swatch" style="background:${sw};box-shadow:0 0 18px ${sw}66"></span>
        <span class="scene-main">
          <span class="scene-name">${s.name}</span>
          <span class="scene-desc">${s.desc}</span>
        </span>`;
      card.addEventListener('click', () => {
        store.set('scene', s.id);
        window.ZS.Sfx.select();
        for (const c of grid.children) c.classList.toggle('active', c === card);
      });
      grid.appendChild(card);
    }
    host.appendChild(grid);
  }

  Panel.register({
    id: 'scene',
    title: '选择场景',
    icon: '🌌',
    build,
  });
})();