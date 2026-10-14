/**
 * ui/panels/panel-dev.js — 开发者面板（4 类独立预览）
 * 主题色预览 / 战斗预览 / 怪物预览 / 技能预览，复用 DevPreview 引擎实时渲染，
 * 下方显示所选条目简介（怪物/技能）。切换即重置，避免特效残留。
 * 通过 window.ZS.UI.Panel.register 注册为 'dev'。
 */
(function () {
  const Panel = window.ZS.UI.Panel;
  const DevPreview = window.ZS.UI.DevPreview;
  const Sfx = window.ZS.Sfx;

  function tabs(host, items, onPick) {
    const bar = document.createElement('div');
    bar.className = 'dev-tabs';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'dev-tab' + (it.active ? ' active' : '');
      b.textContent = it.name;
      b.addEventListener('click', () => {
        Sfx.select();
        for (const x of bar.children) x.classList.remove('active');
        b.classList.add('active');
        onPick(it.id);
      });
      bar.appendChild(b);
    });
    host.appendChild(bar);
  }

  function canvasEl(host) {
    const wrap = document.createElement('div');
    wrap.className = 'preview-wrap';
    const c = document.createElement('canvas');
    c.width = 560; c.height = 300;
    c.className = 'preview-canvas';
    wrap.appendChild(c);
    host.appendChild(wrap);
    return c;
  }

  function chipRow(host, items, labelFn, active, onPick) {
    const row = document.createElement('div');
    row.className = 'chip-row';
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'chip-sel' + (it.id === active ? ' active' : '');
      b.textContent = labelFn(it);
      b.addEventListener('click', () => {
        Sfx.select();
        for (const x of row.children) x.classList.remove('active');
        b.classList.add('active');
        onPick(it);
      });
      row.appendChild(b);
    }
    host.appendChild(row);
    return row;
  }

  function build(host, ctx) {
    const Dev = window.ZS.Data;
    const SKIN_NAMES = { gold: '黄金', energy: '能量', flame: '烈焰', frost: '冰霜', void: '虚空' };
    const styles = Dev.styleIds.map((id) => Dev.styles[id]);
    const monsters = Object.keys(Dev.monsters).map((id) => ({ id, name: (Dev.monsters[id] || {}).name || id, desc: (Dev.monsters[id] || {}).desc || '' }));
    const skills = Dev.SKILLS;
    const activeTab = { id: 'theme' };

    const cvs = canvasEl(host);
    const ctrl = document.createElement('div');
    ctrl.className = 'dev-ctrl';
    host.appendChild(ctrl);
    const desc = document.createElement('div');
    desc.className = 'dev-desc';
    host.appendChild(desc);

    DevPreview.init(cvs);
    Sfx.ensure();

    // 简介区渲染
    function renderDesc(html) { desc.innerHTML = html; }
    function skillCard(s) {
      return `<span class="dev-desc-name"><i>${s.icon}</i> ${s.name}</span>
        <span class="dev-desc-tag">${s.category}</span>
        <p class="dev-desc-intro">${s.intro}</p>
        <p class="dev-desc-lv">Lv.1 · ${s.levels[0]}</p>`;
    }
    function monsterCard(m) {
      return `<span class="dev-desc-name">👾 ${m.name}</span>
        <p class="dev-desc-intro">${m.desc}</p>`;
    }
    function themeCard(s) {
      return `<span class="dev-desc-name"><i>${s.icon}</i> ${s.name} 主题</span>
        <p class="dev-desc-intro">${s.desc}</p>
        <span class="dev-desc-swatch" style="background:${s.theme.accent.glow};box-shadow:0 0 14px ${s.theme.accent.glow}88"></span>`;
    }

    function renderControls() {
      ctrl.innerHTML = '';
      if (activeTab.id === 'theme') {
        chipRow(ctrl, styles, (s) => s.name, styles[0] && styles[0].id, (s) => { DevPreview.showTheme(s.id); renderDesc(themeCard(s)); });
        renderDesc(themeCard(styles[0]));
        DevPreview.showTheme(styles[0] && styles[0].id);
      } else if (activeTab.id === 'battle') {
        const hint = document.createElement('p');
        hint.className = 'panel-note';
        hint.textContent = '小规模战斗循环：怪物涌来 → 玩家反击 → 阵亡 → 重置';
        ctrl.appendChild(hint);
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-block';
        btn.textContent = '🔄 重新开局预览';
        btn.addEventListener('click', () => { Sfx.select(); DevPreview.showBattle(); });
        ctrl.appendChild(btn);
        renderDesc('');
        DevPreview.showBattle();
      } else if (activeTab.id === 'monster') {
        const first = monsters[0] && monsters[0].id;
        chipRow(ctrl, monsters, (m) => m.name, first, (m) => { DevPreview.showMonster(m.id); renderDesc(monsterCard(m)); });
        if (first) { renderDesc(monsterCard(monsters[0])); DevPreview.showMonster(first); }
      } else if (activeTab.id === 'skill') {
        const first = skills[0] && skills[0].id;
        chipRow(ctrl, skills, (s) => `${s.icon} ${s.name}`, first, (s) => { DevPreview.showSkill(s.id); renderDesc(skillCard(s)); });
        if (first) { renderDesc(skillCard(skills[0])); DevPreview.showSkill(first); }
      }
    }

    tabs(host, ctx.uiMenu.devTabs.map((t) => ({ id: t.id, name: t.name, active: t.id === 'theme' })), (id) => {
      activeTab.id = id;
      renderControls();
    });

    renderControls();
  }

  Panel.register({
    id: 'dev',
    title: '开发者工具',
    icon: '🧪',
    build,
    onHide() { DevPreview.stop(); },
  });
})();