/**
 * ui/screen-levelup.js — 升级三选一弹窗
 * show(choices) 渲染技能卡（分类/图标/等级刻度/新技能标），点击调用 Game.chooseSkill。
 * 通过 window.ZS.UI.manager 注册为 'levelup'。
 */
(function () {
  const ZS = window.ZS;
  const screen = {
    el: null,
    container: null,

    init() {
      this.el = document.getElementById('levelup-modal');
      this.container = document.getElementById('skill-choices');
    },

    show(choices) {
      if (!this.container) return;
      this.container.innerHTML = '';
      for (const c of choices) {
        const card = document.createElement('div');
        card.className = 'skill-card';
        let pips = '';
        for (let i = 1; i <= c.maxLevel; i++) pips += `<span class="pip${i <= c.level ? ' on' : ''}"></span>`;
        card.innerHTML = `
          <div class="skill-card-head">
            <span class="skill-icon">${c.icon}</span>
            <div class="skill-card-info">
              <div class="skill-name">${c.name} ${c.isNew ? '<span class="skill-new">新</span>' : ''}
                <span class="skill-cur">Lv.${c.level}</span></div>
              <div class="skill-cat">${c.category}</div>
            </div>
            <div class="skill-pips">${pips}</div>
          </div>
          <div class="skill-desc">${c.desc}</div>`;
        card.addEventListener('click', () => ZS.Game.chooseSkill(c.id));
        this.container.appendChild(card);
      }
      if (this.el) this.el.classList.remove('hidden');
    },

    hide() { if (this.el) this.el.classList.add('hidden'); },
  };

  ZS.UI.manager.register('levelup', screen);
})();