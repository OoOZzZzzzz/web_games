/**
 * ui/panels/panel-mode.js — 模式选择面板
 * 列出 uiMenu.modes（数据驱动），选中高亮并持久化；locked 模式显示「预告」不可选。
 * 通过 window.ZS.UI.Panel.register 注册为 'mode'。
 */
(function () {
  const Panel = window.ZS.UI.Panel;
  const store = window.ZS.UI.store;

  function build(host, ctx) {
    const modes = ctx.uiMenu.modes;
    const cur = store.get('mode');
    const list = document.createElement('div');
    list.className = 'choice-list';

    for (const m of modes) {
      const card = document.createElement('button');
      card.className = 'choice-card' + (m.locked ? ' locked' : '') + (m.id === cur ? ' active' : '');
      card.innerHTML = `
        <span class="choice-main">
          <span class="choice-name">${m.name}</span>
          ${m.tag ? `<span class="choice-tag">${m.tag}</span>` : ''}
          ${m.locked ? `<span class="choice-tag lock">🔒 预告</span>` : ''}
        </span>
        <span class="choice-desc">${m.desc}</span>`;
      card.addEventListener('click', () => {
        if (m.locked) { window.ZS.Sfx.select(); return; }
        store.set('mode', m.id);
        window.ZS.Sfx.select();
        for (const c of list.children) c.classList.toggle('active', c === card);
      });
      list.appendChild(card);
    }
    host.appendChild(list);
    const note = document.createElement('p');
    note.className = 'panel-note';
    note.textContent = '更多模式正在开发中，敬请期待 ✨';
    host.appendChild(note);
  }

  Panel.register({
    id: 'mode',
    title: '选择模式',
    icon: '🎯',
    build,
  });
})();