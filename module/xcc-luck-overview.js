/* global canvas, foundry, game, Hooks */

/**
 * Luck overview - the current Luck of every crawler on the viewed scene at a
 * glance, next to Mojo in the XCC Tools sidebar. Luck gets spent all session
 * and is hard to track across a dozen sheets.
 *
 * Read-only: Luck is changed on the character sheet (or by a Luck spend), and
 * the window re-renders when it does.
 */

import { globals } from './settings.js'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * The crawlers to list: player-owned characters with a token on the viewed
 * scene, the same set the Mojo tracker shows.
 * @returns {Actor[]}
 */
export function getLuckActors () {
  const scene = canvas?.scene ?? game.scenes?.viewed
  if (!scene) { return [] }
  const seen = new Set()
  const actors = []
  for (const token of scene.tokens) {
    const actor = token.actor
    if (actor?.type !== 'Player' || !actor.hasPlayerOwner || seen.has(actor.id)) { continue }
    seen.add(actor.id)
    actors.push(actor)
  }
  return actors
}

// How the viewer likes the list sorted - their preference, so it lives on them.
const SORT_FLAG = 'luckOverviewSort'
const DEFAULT_SORT = { by: 'name', dir: 'desc' }

/** @returns {{by: 'name'|'luck', dir: 'asc'|'desc'}} */
export function getLuckSort () {
  return { ...DEFAULT_SORT, ...(game.user?.getFlag?.(globals.id, SORT_FLAG) ?? {}) }
}

/**
 * The sort after clicking a sort button: Name sorts A-Z; Luck sorts highest
 * first, and clicking Luck again flips the direction.
 */
export function nextLuckSort (current, by) {
  if (by !== 'luck') { return { by: 'name', dir: current.dir } }
  if (current.by !== 'luck') { return { by: 'luck', dir: 'desc' } }
  return { by: 'luck', dir: current.dir === 'desc' ? 'asc' : 'desc' }
}

/**
 * One row per crawler, sorted by name or by current Luck (ties by name).
 * @param {Actor[]} actors
 * @param {{by: string, dir: string}} [sort]
 * @returns {object[]}
 */
export function luckRows (actors, sort = DEFAULT_SORT) {
  const byName = (a, b) => a.name.localeCompare(b.name)
  const byLuck = (a, b) => (sort.dir === 'asc' ? a.value - b.value : b.value - a.value) || byName(a, b)
  return actors.map(actor => {
    const lck = actor.system.abilities?.lck ?? {}
    const value = Number(lck.value ?? 0)
    const max = Number(lck.max ?? value)
    const mod = Number(lck.mod ?? 0)
    return {
      actorId: actor.id,
      name: actor.name,
      img: actor.img,
      value,
      max,
      mod: mod >= 0 ? `+${mod}` : `${mod}`,
      spent: value < max
    }
  }).sort(sort.by === 'luck' ? byLuck : byName)
}

class LuckOverviewDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'xcc-luck-overview',
    classes: ['dcc', 'sheet', 'fleeting-luck', 'xcc-luck-overview'],
    position: {
      width: 360,
      height: 'auto'
    },
    actions: {
      openActorSheet: this.#onOpenActorSheet,
      sortBy: this.#onSortBy
    },
    window: {
      resizable: true,
      title: 'XCC.LuckOverview.Title'
    }
  }

  static PARTS = {
    element: {
      template: globals.templatesPath + 'dialog-luck-overview.html'
    }
  }

  async _prepareContext (options = {}) {
    const sort = getLuckSort()
    return { cssClass: 'dcc', sort, actors: luckRows(getLuckActors(), sort) }
  }

  static async #onSortBy (event, target) {
    await game.user.setFlag(globals.id, SORT_FLAG, nextLuckSort(getLuckSort(), target.dataset.sort))
    this.render(false)
  }

  static async #onOpenActorSheet (event, target) {
    const actor = game.actors.get(target.dataset.actorId)
    if (actor?.testUserPermission(game.user, 'OBSERVER')) {
      await actor.sheet.render(true)
    }
  }

  async close (options = {}) {
    LuckOverview.dialog = null
    return super.close(options)
  }
}

export class LuckOverview {
  static dialog = null

  /** Toggle the overview window. */
  static async show () {
    if (LuckOverview.dialog) {
      await LuckOverview.dialog.close()
    } else {
      LuckOverview.dialog = new LuckOverviewDialog()
      LuckOverview.dialog.render(true)
    }
  }

  /** Re-render the window if it is open. */
  static refresh () {
    if (LuckOverview.dialog?.rendered) { LuckOverview.dialog.render(false) }
  }
}

/**
 * The XCC Tools sidebar entry. Called from the `dcc.getSidebarTools` hook
 * right after Mojo, so the two sit next to each other.
 * @param {Record<string, object>} tools
 */
export function addLuckOverviewSidebarTool (tools) {
  tools.luckOverview = {
    label: 'XCC.LuckOverview.Title',
    icon: 'fas fa-clover',
    onClick: () => LuckOverview.show()
  }
}

/** Keep an open window live as Luck changes and crawlers enter or leave the scene. */
export function registerLuckOverviewHooks () {
  Hooks.on('updateActor', (actor, changes) => {
    if (foundry.utils.hasProperty(changes, 'system.abilities.lck') || 'name' in changes || 'img' in changes) {
      LuckOverview.refresh()
    }
  })
  for (const hook of ['createToken', 'deleteToken', 'canvasReady']) {
    Hooks.on(hook, () => LuckOverview.refresh())
  }
}
