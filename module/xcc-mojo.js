/* global CONFIG, CONST, ChatMessage, canvas, document, foundry, game, Hooks, ui */

/**
 * Mojo - XCrawl Classics' take on Fleeting Luck.
 *
 * DCC tracks Fleeting Luck per *user*; XCrawl awards it to the *crawler*, as
 * the class benefits spell out. So the pool follows the character sheet: a
 * player running two crawlers keeps two pools.
 *
 * Installed *over* `game.dcc.FleetingLuck` rather than alongside it, since the
 * system's own modules hold a direct import of that class and would otherwise
 * keep paying the same natural 20 into a second, user-scoped ledger.
 */

import { globals } from './settings.js'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

// A flag rather than a system field: a character imported from a plain DCC
// world has no such field, and an unset flag reads as zero.
const MOJO_SCOPE = globals.id
const MOJO_FLAG = 'mojo'

// Show only your own crawlers - the viewer's preference, so it lives on them.
const FILTER_FLAG = 'mojoFilter'

class MojoDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: 'fleeting-luck',
    classes: ['dcc', 'sheet', 'fleeting-luck'],
    tag: 'form',
    position: {
      width: 400,
      height: 'auto'
    },
    actions: {
      openActorSheet: this.#onOpenActorSheet,
      takeLuck: this.#onTakeLuck,
      giveLuck: this.#onGiveLuck,
      clearLuck: this.#onClearLuck,
      toggleFilter: this.#onToggleFilter,
      spendLuck: this.#onSpendLuck,
      clearAllLuck: this.#onClearAllLuck,
      resetAllLuck: this.#onResetAllLuck
    },
    window: {
      resizable: true,
      title: 'DCC.FleetingLuck'
    }
  }

  static PARTS = {
    element: {
      template: globals.templatesPath + 'dialog-mojo.html'
    }
  }

  /**
   * Build a row per tracked crawler.
   * @return {Object}
   */
  async _prepareContext (options = {}) {
    const data = {}
    data.cssClass = 'dcc'
    data.user = game.user
    data.config = CONFIG.DCC
    data.actors = []
    const filterEnabled = Mojo.isFilterEnabled()
    for (const actor of Mojo.getTrackedActors()) {
      // The judge always sees everyone; awarding is theirs to adjudicate.
      if (!game.user.isGM && filterEnabled && !actor.isOwner) { continue }
      const value = actor.getFlag(MOJO_SCOPE, MOJO_FLAG)
      data.actors.push({
        actorId: actor.id,
        img: actor.img,
        name: actor.name,
        // Spending is the character's decision, so the coin shows per crawler.
        canSpend: actor.isOwner,
        mojo: value ? value.toString() : '0'
      })
    }
    data.actors.sort((a, b) => a.name.localeCompare(b.name))
    return data
  }

  /**
   * Open a crawler's sheet from their portrait, if permissions allow
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onOpenActorSheet (event, target) {
    const actor = game.actors.get(target.dataset.actorId)
    if (actor?.isOwner || game.user.isGM) {
      await actor.sheet.render(true)
    }
  }

  /**
   * Handle removing Mojo from a crawler
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onTakeLuck (event, target) {
    await Mojo.take(target.dataset.actorId, 1)
  }

  /**
   * Handle giving Mojo to a crawler
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onGiveLuck (event, target) {
    await Mojo.give(target.dataset.actorId, 1)
  }

  /**
   * Handle spending Mojo
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onSpendLuck (event, target) {
    const actorId = target.dataset.actorId
    const actor = game.actors.get(actorId)
    const mojoValue = Mojo.getValue(actorId)

    if (mojoValue <= 0) {
      ui.notifications.warn(game.i18n.format('DCC.FleetingLuckSpendNoLuckWarning', { user: actor?.name ?? '' }))
      return
    }

    const terms = [
      {
        type: 'FleetingLuck',
        formula: Math.min(1, mojoValue),
        fleetingLuck: mojoValue
      }
    ]
    const options = {
      showModifierDialog: true,
      title: game.i18n.localize('DCC.FleetingLuckSpendTitle'),
      rollLabel: game.i18n.localize('DCC.FleetingLuckSpendButton')
    }

    const roll = await game.dcc.DCCRoll.createRoll(terms, actor.getRollData(), options)
    await roll.evaluate()

    await Mojo.spend(actorId, roll.total)
  }

  /**
   * Handle removing all Mojo from a crawler
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onClearLuck (event, target) {
    await Mojo.clear(target.dataset.actorId)
  }

  /**
   * Handle removing all Mojo from every crawler
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onClearAllLuck (event, target) {
    await Mojo.clearAll()
  }

  /**
   * Handle resetting Mojo for every crawler
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onResetAllLuck (event, target) {
    await Mojo.resetAll()
  }

  /**
   * Handle filter toggle
   * @this {MojoDialog}
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   */
  static async #onToggleFilter (event, target) {
    await Mojo.toggleFilter()
  }

  /** @override */
  async close (options = {}) {
    Mojo.dialog = null
    return super.close()
  }
}

// The system calls `init` on this same class earlier in the ready chain, so
// guard the listeners against a second call double-awarding.
let hooksRegistered = false

class Mojo {
  /**
   * Initialise the Mojo subsystem
   */
  static init () {
    if (hooksRegistered) { return }
    hooksRegistered = true

    if (game.user.isGM) {
      // Only the judge's client writes, so an award lands once however many
      // browsers saw the roll.
      Hooks.on('createChatMessage', (message) => {
        if (!game.dcc.FleetingLuck.automationEnabled) { return }

        const effect = message.getFlag('dcc', 'FleetingLuckEffect')
        if (effect === undefined) { return }

        switch (effect) {
          case 'Gain': {
            // The crawler who rolled, not the person who rolled for them.
            const actor = ChatMessage.getSpeakerActor(message.speaker) ?? message.author?.character
            if (Mojo.isTrackedForActor(actor)) {
              Mojo.give(actor.id, 1)
            }
            break
          }
          case 'Lose':
            // A fumble still costs the whole table, as in DCC.
            Mojo.clearAll()
            break
        }
      })
    }

    // Everyone's tracker follows the sheets it is showing.
    Hooks.on('updateActor', (doc, change) => {
      if (change.name || change.img || change.ownership || change.flags?.[MOJO_SCOPE]) {
        Mojo.refresh()
      }
    })
    Hooks.on('createActor', () => Mojo.refresh())
    Hooks.on('deleteActor', () => Mojo.refresh())

    // The roster is whoever is on the scene, so the tracker follows the tokens
    // on it and the scene being viewed.
    Hooks.on('canvasReady', () => Mojo.refresh())
    Hooks.on('createToken', () => Mojo.refresh())
    Hooks.on('deleteToken', () => Mojo.refresh())

    // The layer menu is rebuilt on every control change, so the running total
    // has to be put back each time.
    Hooks.on('renderSceneControls', (app, element) => Mojo.renderTotalControl(element))
    // The controls are built during `Game#initializeUI`, before this ready
    // chain, so the first render is one the hook above never saw.
    Mojo.renderTotalControl()
  }

  /**
   * Toggle the Mojo dialog
   */
  static async show () {
    if (Mojo.dialog) {
      await Mojo.dialog.close()
      Mojo.dialog = null
    } else {
      Mojo.dialog = new MojoDialog()
      Mojo.dialog.render(true)
    }
  }

  /**
   * Refresh the dialog if open
   * @returns {Promise}
   */
  static async refresh () {
    Mojo.renderTotalControl()
    if (Mojo.dialog) {
      return await Mojo.dialog.render(false)
    }
  }

  /**
   * The crawlers whose Mojo is this user's business: their own, or the whole
   * roster for the judge. Drawn from `getTrackedActors`, so the running total
   * and the tracker window it opens always count the same characters.
   *
   * @returns {Actor[]}
   */
  static getOwnActors () {
    return Mojo.getTrackedActors().filter(actor => game.user.isGM || actor.isOwner)
  }

  /**
   * Total Mojo on show for this user.
   * @returns {Number}
   */
  static getTotal () {
    return Mojo.getOwnActors().reduce((total, actor) => total + Mojo.getValue(actor.id), 0)
  }

  /**
   * Keep the running total at the foot of the scene controls up to date,
   * adding or removing the button as needed. Called both from the controls'
   * own render, which drops anything of ours, and from `refresh`.
   *
   * @param {ParentNode} root    The scene controls element, or the document
   */
  static renderTotalControl (root = document) {
    // `data-action="control"` is unique to the layer menu, so this finds it
    // without depending on core's id for that part.
    const menu = root.querySelector('button[data-action="control"]')?.closest('menu')
    if (!menu) return

    const existing = menu.querySelector('#xcc-mojo-total')
    const actors = Mojo.getOwnActors()
    // A real zero is worth showing; an empty roster is not.
    if (!actors.length) { existing?.closest('li')?.remove(); return }

    const total = actors.reduce((sum, actor) => sum + Mojo.getValue(actor.id), 0)
    if (existing) { existing.textContent = total; return }

    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'xcc-mojo-total'
    // No `icon` class: that switches the button to the Font Awesome face,
    // which has no digits to render.
    button.className = 'control ui-control layer xcc-mojo-total'
    button.dataset.tooltip = 'DCC.FleetingLuck'
    button.setAttribute('aria-label', game.i18n.localize('DCC.FleetingLuck'))
    button.textContent = total
    button.addEventListener('click', (event) => {
      event.preventDefault()
      Mojo.show()
    })

    const item = document.createElement('li')
    item.append(button)
    menu.append(item)
  }

  /**
   * Get Mojo for a crawler
   * @param {String} id      Id of the actor
   * @returns {Number}
   */
  static getValue (id) {
    const actor = game.actors.get(id)
    return parseInt(actor?.getFlag(MOJO_SCOPE, MOJO_FLAG) || 0)
  }

  /**
   * Set Mojo for a crawler
   * @param {String} id      Id of the actor
   * @param {Number} value   New value
   * @returns {Promise}
   */
  static async _set (id, value) {
    const actor = game.actors.get(id)
    if (!actor) { return }
    await actor.setFlag(MOJO_SCOPE, MOJO_FLAG, value)
    return await Mojo.refresh()
  }

  /**
   * Give Mojo to a crawler
   * @param {String} id      Id of the actor
   * @param {Number} amount  Amount of Mojo to give
   * @returns {Promise}
   */
  static async give (id, amount) {
    const actor = game.actors.get(id)
    if (!actor) { return }
    const currentValue = Mojo.getValue(id)
    await actor.setFlag(MOJO_SCOPE, MOJO_FLAG, currentValue + amount)
    if (amount !== 0) {
      await Mojo.addChatMessage(game.i18n.format('DCC.FleetingLuckGiveMessage', { user: actor.name, amount }))
    }
    return await Mojo.refresh()
  }

  /**
   * Take Mojo from a crawler
   * @param {String} id      Id of the actor
   * @param {Number} amount  Amount of Mojo to take
   * @returns {Promise}
   */
  static async take (id, amount) {
    const actor = game.actors.get(id)
    if (!actor) { return }
    const currentValue = Mojo.getValue(id)
    const newValue = Math.max(currentValue - amount, 0)
    await actor.setFlag(MOJO_SCOPE, MOJO_FLAG, newValue)
    if (currentValue !== newValue) {
      await Mojo.addChatMessage(game.i18n.format('DCC.FleetingLuckTakeMessage', { user: actor.name, amount: currentValue - newValue }))
    }
    return await Mojo.refresh()
  }

  /**
   * Spend Mojo for a crawler
   * @param {String} id      Id of the actor
   * @param {Number} amount  Amount of Mojo to spend
   * @returns {Promise}
   */
  static async spend (id, amount) {
    const actor = game.actors.get(id)
    if (!actor) { return }
    const currentValue = Mojo.getValue(id)
    const newValue = Math.max(currentValue - amount, 0)
    await actor.setFlag(MOJO_SCOPE, MOJO_FLAG, newValue)
    if (currentValue !== newValue) {
      await Mojo.addChatMessage(game.i18n.format('DCC.FleetingLuckSpendMessage', { user: actor.name, amount: currentValue - newValue }))
    }
    return await Mojo.refresh()
  }

  /**
   * Clear all Mojo for a crawler
   * @param {String} id      Id of the actor
   * @returns {Promise}
   */
  static async clear (id) {
    return await Mojo._clear(id)
  }

  static async _clear (id) {
    return await Mojo._set(id, 0)
  }

  /**
   * Clear all Mojo for every crawler
   */
  static async clearAll () {
    for (const actor of Mojo.getTrackedActors()) {
      await Mojo._clear(actor.id)
    }
    await Mojo.addChatMessage(game.i18n.localize('DCC.FleetingLuckClearMessage'))
  }

  /**
   * Reset Mojo for every crawler
   */
  static async resetAll () {
    for (const actor of Mojo.getTrackedActors()) {
      await Mojo._set(actor.id, 1)
    }
    await Mojo.addChatMessage(game.i18n.localize('DCC.FleetingLuckResetMessage'))
  }

  /**
   * Poll the status of the Mojo dialog
   * @returns {Boolean}     Visibility status of the dialog
   */
  static get visible () {
    return Mojo.dialog !== null
  }

  /**
   * Should this character be considered for Mojo? Only a player character
   * somebody at the table runs - judge-only NPCs and the party sheet stay out.
   *
   * @param {Actor} actor    Actor document
   * @returns {Boolean}
   */
  static isTrackedForActor (actor) {
    return actor?.type === 'Player' && actor.hasPlayerOwner
  }

  /**
   * The crawlers in play: tracked characters with a token on the viewed scene.
   * The list, `clearAll` and `resetAll` all work from this, so "Take All"
   * cannot reach a character who is not in tonight's dungeon. Falls back to
   * every tracked character when there is no scene to read.
   *
   * Read from `actorId` rather than `token.actor`: an unlinked token carries a
   * synthetic actor, and the base character holds the Mojo.
   *
   * @returns {Actor[]}
   */
  static getTrackedActors () {
    const actors = game.actors.filter(actor => Mojo.isTrackedForActor(actor))
    const scene = canvas?.scene ?? game.scenes?.viewed
    if (!scene) { return actors }
    const present = new Set(scene.tokens.map(token => token.actorId))
    return actors.filter(actor => present.has(actor.id))
  }

  /**
   * Never - Mojo belongs to characters here. The system asks this before its
   * own user-scoped award and before offering "Award Mojo" in the Players
   * list, so a flat no switches both off.
   *
   * @returns {Boolean}
   */
  static isTrackedForUser () {
    return false
  }

  /**
   * Toggle the Mojo filter for the current user
   * @returns {Promise}
   */
  static async toggleFilter () {
    const currentValue = Mojo.isFilterEnabled()
    await game.user.setFlag(MOJO_SCOPE, FILTER_FLAG, !currentValue)
    return await Mojo.refresh()
  }

  /**
   * Get the Mojo filter status for the current user
   * Defaults to true if undefined
   * @returns {Boolean}
   */
  static isFilterEnabled () {
    const value = game.user.getFlag(MOJO_SCOPE, FILTER_FLAG)
    if (value !== undefined) {
      return value
    }
    return true
  }

  /*
   * Send a chat message notifying of Mojo changes
   * @param {String} content    Message Content
   * @return {Promise}
   */
  static async addChatMessage (content) {
    const messageData = {
      user: game.user.id,
      style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
      content,
      sound: CONFIG.sounds.notification
    }
    return CONFIG.ChatMessage.documentClass.create(messageData)
  }
}

Mojo.dialog = null

// The system's storage and UI, replaced in place. Its `updateFlags*` helpers
// are left alone: they stamp a rolled 20 or 1 onto a chat message, which is
// what this implementation reads in turn.
const REPLACED = [
  'init', 'show', 'refresh', 'getValue', '_set', 'give', 'take', 'spend',
  'clear', '_clear', 'clearAll', 'resetAll', 'isTrackedForActor',
  'getTrackedActors', 'getOwnActors', 'getTotal', 'renderTotalControl',
  'isTrackedForUser', 'toggleFilter', 'isFilterEnabled', 'addChatMessage'
]

/**
 * Point `game.dcc.FleetingLuck` at the character-scoped implementation. The
 * class is patched rather than the `game.dcc` reference replaced, since DCC's
 * own modules imported it directly and that object is the only shared seam.
 */
export function installMojo () {
  const target = game.dcc.FleetingLuck
  for (const key of REPLACED) {
    target[key] = Mojo[key]
  }
  Object.defineProperty(target, 'visible', {
    configurable: true,
    get: () => Mojo.visible
  })
  Object.defineProperty(target, 'dialog', {
    configurable: true,
    get: () => Mojo.dialog,
    set: (value) => { Mojo.dialog = value }
  })
}

export default Mojo
