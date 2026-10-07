/**
 * config.js — 全局常量与基础配置
 * 零级求生：技能狂潮
 *
 * 说明：这里只存放「数字、颜色、开关」等静态配置，
 * 玩家局内动态属性（当前HP/等级/经验）由 game.js 中的 Player 实例管理。
 */
const CONFIG = {

  // ---- 画布 / 场景 ----
  canvas: {
    bg: '#0b0e14',          // 背景色（与 CSS 一致）
    gridColor: '#131a26',   // 网格线颜色
    gridSize: 48,           // 网格间距（像素）
    gridOffset: 24,         // 网格起始偏移（让网格相对居中）
  },

  // ---- 玩家 Lv0 初始基础属性 ----
  player: {
    maxHp: 100,             // 最大生命值
    moveSpeed: 210,         // 移动速度（像素/秒）
    attackDamage: 10,       // 单发子弹伤害
    fireRate: 1,            // 攻击频率（发/秒）
    bulletSpeed: 460,       // 子弹飞行速度（像素/秒）
    radius: 14,             // 碰撞半径（像素）
    color: '#4fc3f7',       // 玩家颜色
    invulnTime: 0.6,        // 受击后的无敌时间（秒）
  },

  // ---- 经验球 ----
  orb: {
    radius: 7,              // 经验球半径
    color: '#ffd54f',       // 经验球颜色
    colorInner: '#fff3c4',  // 经验球高光
    magnetRadius: 70,       // 磁吸范围（玩家进入该范围后经验球自动飞来）
    magnetSpeed: 420,       // 磁吸飞行速度（像素/秒）
  },

  // ---- 自动瞄准普攻 ----
  attack: {
    bulletRadius: 4,        // 子弹半径
    bulletColor: '#ffd54f', // 子弹颜色
    bulletLife: 1.4,        // 子弹最大存活时间（秒，超过即消失）
    maxBullets: 500,        // 同屏子弹数量上限（性能保护）
    reticleRange: 380,      // 自动瞄准索敌范围（像素）
  },

  // ---- 怪物刷新（基础值，随等级动态缩放） ----
  spawn: {
    baseInterval: 1.5,      // Lv0 时基础刷新间隔（秒/只）
    minInterval: 0.18,      // 刷新间隔下限（秒）
    intervalPerLv: 0.055,   // 每升一级间隔缩短量
    baseMaxEnemies: 18,     // 同屏怪物数量上限（Lv0）
    maxEnemiesPerLv: 7,     // 每升一级同屏上限增加量
    eliteChanceBase: 0.06,  // 精英怪基础刷新概率（Lv6 起生效）
    spawnMargin: 30,        // 怪物刷新生成长度（边缘外多少像素）
    minSpawnDist: 160,      // 与玩家的最小出生距离（防止贴脸刷怪）
  },

  // ---- 怪物数值缩放（玩家每提升5级，全怪物加强） ----
  scaling: {
    hpPer5Lv: 0.15,         // 怪物血量 +15%
    dmgPer5Lv: 0.10,        // 怪物伤害 +10%
  },

  // ---- 受击保护 ----
  hit: {
    knockback: 60,          // 受击击退距离（像素）
    flashTime: 0.15,        // 受伤红闪时长（秒）
  },

  // ---- 时间 ----
  time: {
    maxDt: 0.05,            // 单帧最大时间步长（秒），防止切后台后大跳帧
  },
};