/**
 * ui.js — 界面管理（DOM 层）
 * 零级求生：技能狂潮
 *
 * 负责：开始界面、新手弹窗、HUD 常驻显示、升级三选一弹窗、死亡结算界面。
 * 游戏逻辑（game.js）只负责数据与渲染，UI 通过本模块读写 DOM。
 */
const UI = (() => {
  // 缓存 DOM 引用
  let el = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    el.canvas = $('game-canvas');
    el.hud = $('hud');
    el.hudLevel = $('hud-level');
    el.hudHpFill = $('hud-hp-fill');
    el.hudHpText = $('hud-hp-text');
    el.hudXpFill = $('hud-xp-fill');
    el.hudXpText = $('hud-xp-text');
    el.hudKills = $('hud-kills');
    el.startScreen = $('start-screen');
    el.tutorialModal = $('tutorial-modal');
    el.levelupModal = $('levelup-modal');
    el.skillChoices = $('skill-choices');
    el.deathScreen = $('death-screen');
    el.deathStats = $('death-stats');

    // 按钮事件
    $('btn-start').addEventListener('click', onStartClick);
    $('btn-confirm-start').addEventListener('click', onConfirmStart);
    $('btn-restart').addEventListener('click', onRestartClick);

    // 画布尺寸自适应
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    el.canvas.width = window.innerWidth;
    el.canvas.height = window.innerHeight;
    if (Game.instance) Game.instance.onResize();
  }

  // ---------- 界面切换 ----------

  function showStart() {
    el.startScreen.classList.remove('hidden');
    el.tutorialModal.classList.add('hidden');
    el.hud.classList.add('hidden');
    el.levelupModal.classList.add('hidden');
    el.deathScreen.classList.add('hidden');
  }

  function hideStart() {
    el.startScreen.classList.add('hidden');
  }

  // 新手弹窗：显示 / 隐藏
  function showTutorial() { el.tutorialModal.classList.remove('hidden'); }
  function hideTutorial() { el.tutorialModal.classList.add('hidden'); }

  // 进入战斗：隐藏所有菜单，显示 HUD 与画布
  function enterGame() {
    hideStart();
    hideTutorial();
    el.levelupModal.classList.add('hidden');
    el.deathScreen.classList.add('hidden');
    el.hud.classList.remove('hidden');
  }

  // ---------- HUD 更新 ----------

  // 更新左上角：等级、HP 条、HP 文本、经验条、经验文本
  function updateHUD(player) {
    el.hudLevel.textContent = 'Lv.' + player.level;
    const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
    el.hudHpFill.style.width = clamp(hpPct, 0, 100) + '%';
    el.hudHpText.textContent = `HP：${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
    const need = DATA.xpNeeded(player.level);
    const xpPct = need > 0 ? (player.xp / need) * 100 : 0;
    el.hudXpFill.style.width = clamp(xpPct, 0, 100) + '%';
    el.hudXpText.textContent = `经验：${player.xp} / ${need}`;
  }

  function updateKills(count) {
    el.hudKills.textContent = '击杀数：' + count;
  }

  // ---------- 升级三选一（后续里程碑实现逻辑，此处预留） ----------
  function showLevelUp(choices) {
    el.skillChoices.innerHTML = '';
    for (const c of choices) {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.innerHTML = `
        <div class="skill-name">${c.icon} ${c.name} <span class="skill-cur">Lv.${c.level}</span></div>
        <div class="skill-desc">${c.desc}</div>`;
      card.addEventListener('click', () => Game.onSkillChosen(c.id));
      el.skillChoices.appendChild(card);
    }
    el.levelupModal.classList.remove('hidden');
  }

  function hideLevelUp() { el.levelupModal.classList.add('hidden'); }

  // ---------- 死亡结算（后续里程碑实现逻辑） ----------
  function showDeath(stats) {
    el.deathStats.innerHTML = '';
    for (const [label, value] of stats) {
      const row = document.createElement('div');
      // 技能列表等多行文本需保留换行显示
      row.style.whiteSpace = 'pre-line';
      row.textContent = `${label}：${value}`;
      el.deathStats.appendChild(row);
    }
    el.deathScreen.classList.remove('hidden');
  }

  function hideDeath() { el.deathScreen.classList.add('hidden'); }

  // ---------- 按钮回调（委托给 main.js 的逻辑） ----------
  function onStartClick() {
    Sfx.ensure();     // 用户手势，解锁音频
    Sfx.select();
    showTutorial();   // 点击开始 → 弹出新手说明
  }

  function onConfirmStart() {
    Sfx.ensure();
    Sfx.select();
    if (!Game.instance) {
      console.error('[UI] Game 实例不存在，main.js 尚未初始化');
      return;
    }
    Game.instance.begin();
    enterGame();
  }

  function onRestartClick() {
    Sfx.ensure();
    Sfx.select();
    Game.instance.restart();
    enterGame();
  }

  // 小工具
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  return { init, updateHUD, updateKills, showStart, enterGame, showLevelUp, hideLevelUp, showDeath, hideDeath };
})();