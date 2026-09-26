/* global CONFIG, game, Hooks, ui */

/**
 * Grandstanding is once per crawl. The roll sets
 * `system.rewards.grandstanded`; this is the other half - clearing it again for
 * the whole roster, automatically around an encounter and by hand from the DCC
 * Tools sidebar.
 */

/** The field, as an update key. */
export const GRANDSTANDED_FIELD = 'system.rewards.grandstanded'

/**
 * The crawlers on the roster: player characters somebody at the table runs.
 * The whole roster, not the current scene - one checked off while sitting a
 * scene out would otherwise stay locked when they walk back in.
 *
 * @returns {Actor[]}
 */
function crawlers () {
  return game.actors.filter(actor =>
    actor.type === 'Player' && actor.hasPlayerOwner && !!actor.system?.rewards)
}

/**
 * Check or clear the Grandstanding box for the whole roster. One batched
 * update, skipping actors already at the requested value, so a reset between
 * encounters is usually a no-op rather than a round of re-renders.
 *
 * @param {Boolean} value    True to lock everyone out, false to give the
 *                           spotlight back
 * @returns {Promise<Number>}  How many crawlers actually changed
 */
export async function setGrandstandedForAll (value) {
  const updates = crawlers()
    .filter(actor => !!actor.system.rewards.grandstanded !== value)
    .map(actor => ({ _id: actor.id, [GRANDSTANDED_FIELD]: value }))
  if (!updates.length) { return 0 }
  await CONFIG.Actor.documentClass.updateDocuments(updates)
  return updates.length
}

/**
 * Wire the automatic resets. An encounter starting and one ending are both a
 * fresh crawl, so both hand the spotlight back. Only the active GM writes,
 * since every client sees the same combat.
 */
export function registerGrandstandingHooks () {
  const reset = () => {
    if (game.user !== game.users.activeGM) { return }
    setGrandstandedForAll(false)
  }
  Hooks.on('combatStart', reset)
  Hooks.on('deleteCombat', reset)
}

/**
 * Add the judge's roster controls to the DCC Tools sidebar. The hook fires on
 * every render, so gating on `isGM` here is enough.
 *
 * @param {Record<string, object>} tools    The sidebar's tool record
 */
export function addGrandstandingSidebarTools (tools) {
  if (!game.user.isGM) { return }

  tools.grandstandingReset = {
    label: 'XCC.GrandstandingResetAll',
    icon: 'fas fa-rotate-left',
    onClick: async () => {
      const count = await setGrandstandedForAll(false)
      ui.notifications.info(game.i18n.format('XCC.GrandstandingResetAllDone', { count }))
    }
  }

  tools.grandstandingLock = {
    label: 'XCC.GrandstandingLockAll',
    icon: 'fas fa-ban',
    onClick: async () => {
      const count = await setGrandstandedForAll(true)
      ui.notifications.info(game.i18n.format('XCC.GrandstandingLockAllDone', { count }))
    }
  }
}
