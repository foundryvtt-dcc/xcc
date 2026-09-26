/* global game, Hooks */
import { globals } from './settings.js'

/**
 * Fixed skill check DCs from the XCC rulebook (Specialist skills, p. 40).
 *
 * Several specialist skills are rolled against a static DC that depends on
 * the situation - sneaking across stone is DC 10, across peanut shells DC 20.
 * Under a skill check chat card we show the hardest situation the roll beats
 * and the next one it misses, so the judge doesn't have to look it up.
 *
 * Each skill has one or more ladders; a ladder may carry a heading (hide in
 * shadows is different inside and outside the arena). Labels are keys under
 * XCC.SkillDCs in lang/en.json.
 */
export const SKILL_DC_LADDERS = {
  sneakSilently: [
    { tiers: [[5, 'SneakSoft'], [10, 'SneakNormal'], [15, 'SneakNoisy'], [20, 'SneakVeryNoisy']] }
  ],
  hideInShadows: [
    { heading: 'InXcrawl', tiers: [[13, 'HideArena']] },
    { heading: 'OutsideXcrawl', tiers: [[5, 'HideDim'], [10, 'HideMoon'], [15, 'HideShadow'], [20, 'HideDaylight']] }
  ],
  pickPockets: [
    { tiers: [[5, 'PickPocketUnaware'], [20, 'PickPocketWatching']] }
  ],
  climbSheerSurfaces: [
    { tiers: [[10, 'ClimbStoneWall'], [13, 'ClimbArena'], [20, 'ClimbSmooth']] }
  ],
  pickLock: [
    { tiers: [[10, 'LockMundane'], [20, 'LockHighQuality']] }
  ],
  readLanguages: [
    { tiers: [[10, 'ReadSimple'], [15, 'ReadDetailed']] }
  ],
  handlePoison: [
    { tiers: [[10, 'PoisonSafe']], failKey: 'PoisonSelf' }
  ]
}

/**
 * Work out which fixed DCs a skill check total beats.
 * @param {string} skillId - DCC skill id, e.g. "sneakSilently"
 * @param {number} total - the check total
 * @param {number} natural - the natural action die result
 * @return {{ladders: Array, trapTriggered: boolean}|null} null when the skill has no fixed DCs
 */
export function describeSkillDCs (skillId, total, natural) {
  const trapTriggered = skillId === 'disableTrap' && natural === 1
  const ladders = (SKILL_DC_LADDERS[skillId] || []).map(({ heading, tiers, failKey }) => {
    const beaten = tiers.filter(([dc]) => total >= dc).pop()
    const missed = tiers.find(([dc]) => total < dc)
    return {
      heading,
      beaten: beaten && { dc: beaten[0], key: beaten[1] },
      missed: missed && { dc: missed[0], key: failKey || missed[1] }
    }
  })
  if (!ladders.length && !trapTriggered) return null
  return { ladders, trapTriggered }
}

/**
 * Build the chat HTML for a {@link describeSkillDCs} result.
 * @param {{ladders: Array, trapTriggered: boolean}} description
 * @return {string}
 */
export function skillDCsHTML ({ ladders, trapTriggered }) {
  const t = (key) => game.i18n.localize(`XCC.SkillDCs.${key}`)
  const line = (cls, icon, { dc, key }) =>
    `<div class="xcc-skill-dc ${cls}"><i class="fas ${icon}"></i> DC ${dc}: ${t(key)}</div>`
  let html = ''
  for (const { heading, beaten, missed } of ladders) {
    if (heading) html += `<div class="xcc-skill-dc-heading">${t(heading)}</div>`
    if (beaten) html += line('success', 'fa-check', beaten)
    if (missed) html += line('failure', 'fa-xmark', missed)
  }
  if (trapTriggered) {
    html += `<div class="xcc-skill-dc failure"><i class="fas fa-triangle-exclamation"></i> ${t('TrapTriggered')}</div>`
  }
  return `<div class="xcc-skill-dcs">${html}</div>`
}

/**
 * Add the fixed DCs under skill check chat cards. Registered at import time,
 * after DCC's own renderChatMessageHTML hook, so the line survives DCC's
 * emote rewrite of the card content.
 */
export function registerSkillDCHooks () {
  Hooks.on('renderChatMessageHTML', (message, html) => {
    if (message.getFlag('dcc', 'RollType') !== 'SkillCheck' || !message.isContentVisible) return
    if (!game.settings.get(globals.id, 'showSkillDCs')) return
    const roll = message.rolls?.[0]
    if (!roll) return
    const description = describeSkillDCs(message.getFlag('dcc', 'SkillId'), roll.total, roll.dice?.[0]?.total)
    if (!description) return
    html.querySelector('.message-content')?.insertAdjacentHTML('beforeend', skillDCsHTML(description))
  })
}
