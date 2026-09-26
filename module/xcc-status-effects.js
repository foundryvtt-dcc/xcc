/* global CONFIG, canvas, game, Hooks, ui */

/**
 * The XCC status effect palette: XCrawl's conditions in place of Foundry's
 * generic list, our own artwork for them, and ten markers - five colours, five
 * numbers - at the head of the list for telling identical tokens apart.
 *
 * All of it is the one `overrideStatusEffects` setting; off, nothing here runs.
 * On, it only ever drops ids Foundry or DCC defined - another module's
 * condition is left alone.
 */

import { globals } from './settings.js'

const MARKER_ICONS = `${globals.imagesPath}markers/`
// Status icons have to be white art on transparent: the palette paints them
// through `--control-icon-filter`, and an opaque tile survives that as a solid
// square. Strip `<path d="M0 0h512v512H0z" fill="#000">` from any new
// game-icons.net file, and do not borrow from `systems/dcc/styles/images`,
// which ships its whole set with the tile still on.
const XCC_ICONS = `${globals.imagesPath}game-icons-net/`

/**
 * The ids the rebuild may drop. Literal lists rather than derived: by the time
 * it runs, core's, DCC's and other modules' contributions are mixed together
 * and nothing on a status says where it came from.
 */
const CORE_STATUS_IDS = new Set([
  'dead', 'unconscious', 'sleep', 'stun', 'prone', 'restrain', 'paralysis', 'fly', 'blind', 'deaf',
  'silence', 'fear', 'burning', 'frozen', 'shock', 'corrode', 'bleeding', 'disease', 'poison',
  'curse', 'regen', 'degen', 'hover', 'burrow', 'upgrade', 'downgrade', 'invisible', 'target',
  'eye', 'bless', 'fireShield', 'coldShield', 'magicShield', 'holyShield'
])

/** @see systems/dcc/module/status-icons.js */
const DCC_STATUS_IDS = new Set([
  'armor-seized', 'battle-rage', 'disarmed', 'dying', 'grip-disrupted', 'groggy', 'kneecapped',
  'off-balance', 'stumbling', 'turtled', 'weapon-tangled-armor', 'weapon-damaged'
])

const DROPPABLE_STATUS_IDS = new Set([...CORE_STATUS_IDS, ...DCC_STATUS_IDS])

/**
 * The conditions XCrawl's tables actually inflict, in palette order - `order`
 * is assigned from the index, so rearranging this array re-lays out the HUD.
 *
 * Eight of DCC's twelve combat results are folded into a neighbour carrying the
 * same mechanic: kneecapped -> slowed; armor-seized -> stun; stumbling ->
 * off-balance; weapon-damaged, weapon-tangled-armor, grip-disrupted and
 * disarmed all dropped, being four routes to one state; turtled dropped as
 * unattested in XCrawl.
 */
const XCC_STATUS_EFFECTS = [
  // General conditions
  { id: 'prone', name: 'EFFECT.StatusProne', img: 'icons/svg/falling.svg' },
  { id: 'stun', name: 'EFFECT.StatusStunned', img: 'icons/svg/daze.svg' },
  { id: 'unconscious', name: 'EFFECT.StatusUnconscious', img: 'icons/svg/unconscious.svg' },
  { id: 'dying', name: 'DCC.StatusDying', img: `${XCC_ICONS}half-dead.svg` },
  { id: 'dead', name: 'EFFECT.StatusDead', img: `${XCC_ICONS}full-dead.svg` },
  { id: 'bleeding', name: 'EFFECT.StatusBleeding', img: `${XCC_ICONS}drop.svg` },
  // Split out of `restrain`: an opposed contest escaped with a grapple check,
  // rather than being bound by a thing.
  { id: 'grappled', name: 'XCC.Status.Grappled', img: `${XCC_ICONS}grappled.svg` },
  { id: 'restrain', name: 'EFFECT.StatusRestrained', img: `${XCC_ICONS}manacles.svg` },
  { id: 'paralysis', name: 'EFFECT.StatusParalysis', img: `${XCC_ICONS}paralyzed.svg` },
  { id: 'slowed', name: 'XCC.Status.Slowed', img: `${XCC_ICONS}snail.svg` },
  { id: 'sleep', name: 'EFFECT.StatusAsleep', img: 'icons/svg/sleep.svg' },
  { id: 'fear', name: 'EFFECT.StatusFear', img: `${XCC_ICONS}spectre.svg` },
  { id: 'blind', name: 'EFFECT.StatusBlind', img: 'icons/svg/blind.svg' },
  { id: 'deaf', name: 'EFFECT.StatusDeaf', img: 'icons/svg/deaf.svg' },
  { id: 'silence', name: 'EFFECT.StatusSilenced', img: 'icons/svg/silenced.svg' },
  { id: 'poison', name: 'EFFECT.StatusPoison', img: `${XCC_ICONS}poison-bottle.svg` },
  { id: 'disease', name: 'EFFECT.StatusDisease', img: `${XCC_ICONS}parmecia.svg` },
  // Not core's `sun.svg`, which reads as a blessing rather than the opposite.
  { id: 'curse', name: 'EFFECT.StatusCursed', img: `${XCC_ICONS}pentacle.svg` },
  { id: 'burning', name: 'EFFECT.StatusBurning', img: 'icons/svg/fire.svg' },
  { id: 'invisible', name: 'EFFECT.StatusInvisible', img: 'icons/svg/invisible.svg' },
  { id: 'fly', name: 'EFFECT.StatusFlying', img: 'icons/svg/wing.svg' },

  // DCC combat results. `groggy` stands for the book's many flavours of a flat
  // "-N to all rolls".
  { id: 'groggy', name: 'DCC.StatusGroggy', img: `${XCC_ICONS}vomiting.svg` },
  { id: 'off-balance', name: 'DCC.StatusOffBalance', img: `${XCC_ICONS}target-dummy.svg` },
  { id: 'battle-rage', name: 'DCC.StatusBattleRage', img: `${XCC_ICONS}bull.svg` },

  // XCC class effects that outlast the round that caused them. Rolled by the
  // class sheets - `rollDisrespect`, `rollDrawAgro`, `rollLionize`, `rollBless`
  // - and drawn with each sheet's own button art, minus its black tile.
  { id: 'disrespected', name: 'XCC.Status.Disrespected', img: `${XCC_ICONS}disrespected.svg` },
  // Not the sheet's agro.svg: black strokes on a black tile, so de-tiling it
  // leaves a plain silhouette.
  { id: 'agro', name: 'XCC.Status.Agro', img: `${XCC_ICONS}marked-target.svg` },
  { id: 'lionized', name: 'XCC.Status.Lionized', img: `${XCC_ICONS}crowned-heart.svg` },
  { id: 'bless', name: 'EFFECT.StatusBlessed', img: `${XCC_ICONS}blessed.svg` }
]

/**
 * The markers. Five of each because core's palette is five columns wide, so
 * they fill its opening two rows; colours then numbers, so a token can carry
 * one of each. The numerals are seven-segment bars because an SVG used as an
 * `<img>` src cannot load a font.
 */
const XCC_MARKERS = [
  { id: 'xcc-marker-red', name: 'XCC.ColorMarkers.Red' },
  { id: 'xcc-marker-green', name: 'XCC.ColorMarkers.Green' },
  { id: 'xcc-marker-blue', name: 'XCC.ColorMarkers.Blue' },
  { id: 'xcc-marker-yellow', name: 'XCC.ColorMarkers.Yellow' },
  { id: 'xcc-marker-purple', name: 'XCC.ColorMarkers.Purple' },
  { id: 'xcc-marker-1', name: 'XCC.ColorMarkers.One' },
  { id: 'xcc-marker-2', name: 'XCC.ColorMarkers.Two' },
  { id: 'xcc-marker-3', name: 'XCC.ColorMarkers.Three' },
  { id: 'xcc-marker-4', name: 'XCC.ColorMarkers.Four' },
  { id: 'xcc-marker-5', name: 'XCC.ColorMarkers.Five' }
].map(marker => ({ ...marker, img: `${MARKER_ICONS}${marker.id.replace('xcc-', '')}.svg` }))

/** Marks a status as one of ours, for the shift-click handler and the CSS. */
const MARKER_PREFIX = 'xcc-marker-'

/**
 * Rebuild `CONFIG.statusEffects` as the XCC list.
 *
 * Runs on `dcc.ready`, after the system's own `defineStatusIcons()`. DCC adds
 * its results by assigning to `CONFIG.statusEffects`, whose setter re-pushes
 * them through a proxy that keys each entry by id *and* appends it - so an id
 * already present lands twice and the next `Object.values` throws "trap
 * returned duplicate entries". Running last collapses what DCC left behind.
 *
 * Conditions already applied to an actor are untouched; this only decides what
 * the palette offers, so a dropped status has to be removed from the sheet.
 */
export function defineStatusEffects () {
  if (!game.settings.get(globals.id, 'overrideStatusEffects')) return

  const ours = [...XCC_MARKERS, ...XCC_STATUS_EFFECTS]
  const defined = new Set(ours.map(status => status.id))

  // What other modules contributed, in the order it already had - everything
  // core and DCC defined is either replaced below or dropped.
  //
  // Iterated rather than read with `Object.values`, which is the call that
  // throws on the duplicates above; iteration reads indices and never touches
  // `ownKeys`.
  const seen = new Set()
  const survivors = []
  for (const status of CONFIG.statusEffects) {
    if (!status?.id || seen.has(status.id)) continue
    seen.add(status.id)
    if (defined.has(status.id) || DROPPABLE_STATUS_IDS.has(status.id)) continue
    survivors.push(status)
  }

  CONFIG.statusEffects.length = 0
  // `order` is what the palette sorts on. Without it core falls back to the
  // localised name and scatters the markers through the conditions.
  ours.forEach((status, order) => { CONFIG.statusEffects[status.id] = { ...status, order } })
  const tail = ours.length
  // Re-ordered: their old `order` was chosen against core's list, which is gone.
  survivors.forEach((status, index) => { CONFIG.statusEffects[status.id] = { ...status, order: tail + index } })
}

/* -------------------------------------------- */
/*  Colour Marker Shift-Click                   */
/* -------------------------------------------- */

/**
 * Shift-click a marker to apply it to every selected token.
 *
 * Everything else about the markers is core's - they are ordinary palette
 * entries. This listens on the capture phase, so the click never reaches core's
 * dispatcher, which is bound to the HUD root and runs on the bubble.
 */
export function registerColorMarkerHooks () {
  Hooks.on('renderTokenHUD', (hud, html) => {
    // With the override off there are no markers in the palette to catch.
    if (!game.settings.get(globals.id, 'overrideStatusEffects')) return
    const palette = html.querySelector('.palette.status-effects')
    if (!palette) return

    palette.addEventListener('click', event => {
      const statusId = event.target?.dataset?.statusId
      if (!event.shiftKey || !statusId?.startsWith(MARKER_PREFIX)) return
      event.preventDefault()
      event.stopPropagation()
      applyToControlled(hud, statusId)
    }, { capture: true })
  })
}

/**
 * Toggle a marker across every controlled token, forcing them all to match the
 * HUD's own token rather than each flipping its own way.
 *
 * @param {TokenHUD} hud
 * @param {string} statusId
 */
async function applyToControlled (hud, statusId) {
  const active = !hasMarker(hud.actor, statusId)
  const actors = new Set(canvas.tokens.controlled.map(token => token.actor))
  if (hud.actor) actors.add(hud.actor)

  for (const actor of actors) {
    if (!actor?.isOwner) continue
    try {
      await actor.toggleStatusEffect(statusId, { active })
    } catch (error) {
      ui.notifications.warn(error.message)
    }
  }
}

/**
 * Does this actor carry the given marker?
 * @param {Actor} actor
 * @param {string} statusId
 * @returns {boolean}
 */
function hasMarker (actor, statusId) {
  return !!actor?.effects.some(effect => (effect.statuses.size === 1) && effect.statuses.has(statusId))
}
