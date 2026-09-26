/* global canvas, document, foundry, game, Hooks */

/**
 * The XCC additions to the Token HUD: a row of roll buttons for the checks a
 * crawler reaches for most, and a stepper for their Mojo. Both ride the core
 * Token HUD, and the roll buttons also stand on their own - see
 * `XCCTokenControls`, which puts them under a token as soon as it is selected.
 */

import { globals } from './settings.js'
import XCCActorSheet from './xcc-actor-sheet.js'

// `icon` is a Font Awesome glyph, `image` one of the module's own
// game-icons.net SVGs - a button takes whichever it declares. `spent` marks a
// check the crawler has already used up; the roll refuses it regardless.
const XCC_HUD_BUTTONS = [
  {
    action: 'rollGrandstandingCheck',
    label: 'XCC.Grandstanding',
    image: 'medallist.svg',
    spent: actor => !!actor.system.rewards?.grandstanded,
    spentLabel: 'XCC.GrandstandedHint'
  },
  { action: 'rollXcrawlKnowledgeCheck', label: 'XCC.XcrawlKnowledge', image: 'xbook.svg' }
]

/**
 * Is this a crawler whose HUD we have anything to add to?
 *
 * `rewards` is declared on the Player schema by this module, so its presence is
 * the test for "this actor is a crawler". `isOwner` is true for the GM on every
 * document, so this covers "owner or GM" too.
 *
 * @param {Actor} actor
 * @returns {Boolean}
 */
function isCrawler (actor) {
  return !!actor?.isOwner && !!actor.system?.rewards
}

/**
 * The roll buttons under a selected token, without the right-click the core
 * Token HUD demands.
 *
 * `BasePlaceableHUD` positions itself over the placeable's bounds and lives in
 * `#hud`, so panning and zooming need no arithmetic of ours; the row is hung
 * below that box in CSS. It stands down whenever the real Token HUD opens, so
 * the buttons are never on screen twice.
 */
class XCCTokenControls extends foundry.applications.hud.BasePlaceableHUD {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'xcc-token-controls',
    classes: ['placeable-hud', 'xcc-token-controls']
  }

  /**
   * @override
   * The base implementation serialises the whole token document to drive core's
   * visibility and lock controls. This HUD has neither, and builds its row from
   * the actor rather than a template.
   */
  async _prepareContext (_options) {
    return {}
  }

  /** @override */
  async _renderHTML (_context, _options) {
    return buildRollHudRow(this.object.actor)
  }

  /** @override */
  _replaceHTML (result, content, _options) {
    content.replaceChildren(result)
  }
}

/** The single instance, bound and unbound as tokens are selected. */
let tokenControls = null

/**
 * Show the standalone controls for the controlled token, or hide them if there
 * is nothing suitable selected. Rebound rather than cached, since a roll flips
 * the Grandstanding button to spent and rebinding is what redraws it.
 */
function refreshTokenControls () {
  if (!tokenControls) return
  // The full HUD covers the same ground and already carries these buttons.
  const covered = canvas?.hud?.token?.rendered
  const token = canvas?.tokens?.controlled?.at(-1)

  if (covered || !token || !isCrawler(token.actor) ||
      !game.settings.get(globals.id, 'showHudRolls')) {
    if (tokenControls.rendered) tokenControls.close()
    return
  }
  tokenControls.bind(token)
}

/**
 * Wire the Token HUD additions. Called at import time from xcc.js, so the very
 * first HUD render of a session already includes them.
 */
export function registerTokenHudHooks () {
  Hooks.on('renderTokenHUD', (hud, html) => {
    const actor = hud.actor
    if (!isCrawler(actor)) return

    // Fall back to the left column if core ever restructures the middle one, so
    // the buttons degrade to a worse position rather than disappearing.
    const column = html.querySelector('.col.middle') ?? html.querySelector('.col.left')
    if (!column) return

    if (game.settings.get(globals.id, 'showHudRolls')) column.append(buildRollHudRow(actor))
    if (game.settings.get(globals.id, 'showHudMojo')) placeMojoHudRow(actor, html, column)
  })

  Hooks.once('ready', () => { tokenControls = new XCCTokenControls() })

  // Selecting, deselecting, and the full HUD opening or closing all change
  // which of the two should be on screen.
  Hooks.on('controlToken', () => refreshTokenControls())
  Hooks.on('renderTokenHUD', () => refreshTokenControls())
  Hooks.on('closeTokenHUD', () => refreshTokenControls())
  // A roll spends the Grandstanding check; redraw so the button greys out.
  Hooks.on('updateActor', () => refreshTokenControls())

  // `BasePlaceableHUD` places itself from the token *document's* position, which
  // is already the destination by the time this runs - left alone, the buttons
  // would jump ahead and wait there. Stand down for the trip instead.
  Hooks.on('updateToken', (tokenDoc, change) => {
    if (!tokenControls?.rendered || tokenDoc.object !== tokenControls.object) return
    if (!('x' in change) && !('y' in change) && !('width' in change) && !('height' in change)) return
    tokenControls.close()

    // The animation has not started yet - the document's `_onUpdate` fires this
    // hook before handing off to the placeable - so the promise to wait on only
    // exists once the stack unwinds. Re-reading the getter in a loop also covers
    // a move that chains onto the one in flight.
    Promise.resolve().then(async () => {
      let animating = tokenDoc.object?.movementAnimationPromise
      while (animating) {
        await animating
        animating = tokenDoc.object?.movementAnimationPromise
      }
      refreshTokenControls()
    })
  })
  // Nothing is selected on a fresh scene, and the old binding is stale anyway.
  Hooks.on('canvasReady', () => tokenControls?.close())
}

/**
 * The crawler's common checks, as a row of HUD controls.
 * @param {Actor} actor
 * @returns {HTMLElement}
 */
function buildRollHudRow (actor) {
  const row = document.createElement('div')
  row.className = 'xcc-hud-rolls'

  for (const { action, label, icon, image, spent, spentLabel } of XCC_HUD_BUTTONS) {
    const isSpent = !!spent?.(actor)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `control-icon xcc-${action}`
    // A disabled button emits no pointer events, so core's tooltip never fires
    // on it; `title` is the one that still reaches a greyed-out control.
    if (isSpent) {
      button.disabled = true
      button.title = game.i18n.localize(spentLabel ?? label)
    } else {
      button.dataset.tooltip = label
      button.dataset.tooltipDirection = 'DOWN'
    }
    button.setAttribute('aria-label', game.i18n.localize(label))
    // The game-icons.net set ships white art on an opaque black tile - see
    // `.xcc-hud-icon` in xcc.css for how the tile is dropped.
    button.innerHTML = image
      ? `<img class="xcc-hud-icon" src="${globals.imagesPath}game-icons-net/${image}" alt="" inert>`
      : `<i class="fa-solid ${icon}" inert></i>`

    button.addEventListener('click', async (event) => {
      event.preventDefault()
      // Without this the click also reaches the token layer and deselects the
      // token out from under the open HUD.
      event.stopPropagation()
      // Class sheets may override these (the half-elf one adds a charisma die to
      // Grandstanding), so dispatch through the actor's own sheet class. The
      // handlers only need `this.actor`, but pass the sheet so an override can
      // use more of it.
      const sheet = actor.sheet
      const handler = sheet?.constructor?.[action] ?? XCCActorSheet[action]
      await handler.call(sheet ?? { actor }, event, button)
    })

    row.append(button)
  }

  return row
}

/**
 * Put the Mojo stepper on the HUD, if this crawler has any Mojo to show.
 *
 * Bar2's slot is a plain flex child of the middle column under
 * `justify-content: space-between`, so dropping the stepper in there puts it
 * above the token exactly as bar1 sits below it, with no positioning of our
 * own. When the token really does display a second bar, the stepper is stacked
 * clear of it instead.
 *
 * @param {Actor} actor
 * @param {HTMLElement} html      The HUD root
 * @param {HTMLElement} column    The column the roll row went into
 */
function placeMojoHudRow (actor, html, column) {
  const mojo = buildMojoHudRow(actor)
  if (!mojo) return

  const slot = html.querySelector('.attribute.bar2')
  if (slot && !slot.querySelector('input')) {
    // Marked so the slot can be widened to the token: an empty `.attribute` is
    // content-sized, and the stepper needs bar1's full width to lay out against.
    slot.classList.add('xcc-mojo-slot')
    slot.append(mojo)
  } else {
    mojo.classList.add('stacked')
    column.append(mojo)
  }
}

/**
 * The crawler's Mojo, as a stepper above the token.
 *
 * Reads and writes through `game.dcc.FleetingLuck` rather than the flag behind
 * it, so a change here posts the same chat notice and refreshes the tracker as
 * the tracker's own buttons do - see module/xcc-mojo.js.
 *
 * @param {Actor} actor
 * @returns {HTMLElement|null}   Null for a character the tracker does not carry
 */
function buildMojoHudRow (actor) {
  const mojoApi = game.dcc?.FleetingLuck
  if (!mojoApi?.isTrackedForActor?.(actor)) return null

  const row = document.createElement('div')
  row.className = 'xcc-hud-mojo'

  // A text input rather than a number one: core styles the HUD's bars through
  // `input[type="text"]`, which is what makes this read as the twin of the HP
  // box below the token. The value is parsed and clamped below regardless.
  const input = document.createElement('input')
  input.type = 'text'
  input.inputMode = 'numeric'
  input.value = mojoApi.getValue(actor.id)
  input.dataset.tooltip = 'DCC.FleetingLuck'
  input.dataset.tooltipDirection = 'UP'
  input.setAttribute('aria-label', game.i18n.localize('DCC.FleetingLuck'))

  // Give and take rather than a bare write, so every route to a crawler's Mojo
  // announces itself the same way.
  const applyValue = async (value) => {
    const current = mojoApi.getValue(actor.id)
    const delta = Math.max(0, Math.round(value || 0)) - current
    if (delta > 0) await mojoApi.give(actor.id, delta)
    else if (delta < 0) await mojoApi.take(actor.id, -delta)
    input.value = mojoApi.getValue(actor.id)
  }

  const step = (label, icon, amount) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'control-icon'
    button.dataset.tooltip = label
    button.dataset.tooltipDirection = 'UP'
    button.setAttribute('aria-label', game.i18n.localize(label))
    button.innerHTML = `<i class="fa-solid ${icon}" inert></i>`
    button.addEventListener('click', async (event) => {
      event.preventDefault()
      // Otherwise the click reaches the token layer and deselects the token.
      event.stopPropagation()
      await applyValue(mojoApi.getValue(actor.id) + amount)
    })
    return button
  }

  input.addEventListener('change', event => applyValue(parseInt(event.target.value)))
  // Enter commits by blurring, which fires `change` above. Both handlers stop
  // the event so typing a number does not reach the canvas as a hotkey.
  input.addEventListener('keydown', (event) => {
    event.stopPropagation()
    if (event.key === 'Enter') { event.preventDefault(); input.blur() }
  })
  input.addEventListener('click', event => event.stopPropagation())

  row.append(
    step('DCC.FleetingLuckTakeTitle', 'fa-minus', -1),
    input,
    step('DCC.FleetingLuckGiveTitle', 'fa-plus', 1)
  )
  return row
}
