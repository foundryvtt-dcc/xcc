/* eslint-disable import/no-absolute-path */
/* global game */
/**
 * The athlete's grapple emote highlights a successful deed die. It read
 * `system.deedSucceed`, which is never written; the grapple message stores
 * `deedRollSuccess`.
 */
import { afterEach, beforeEach, expect, test } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import XCCActorSheetAthlete from '../xcc-actor-sheet-athlete.js'

let saved

beforeEach(() => {
  saved = { ...game.i18n.translations }
  Object.assign(game.i18n.translations, {
    'XCC.GrappleRollEmote': '{deedRollHTML}',
    'XCC.Athlete.GrappleRollTrainingEmoteSegment': '{deed}',
    'XCC.Athlete.GrappleRollTrainingSuccess': ''
  })
})

afterEach(() => {
  game.i18n.translations = saved
})

function emote (deedRollSuccess) {
  const messageContent = { innerHTML: '' }
  const html = { querySelector: (sel) => (sel === '.message-content' ? messageContent : null) }
  XCCActorSheetAthlete.emoteGrappleRoll({
    rolls: [{ total: 15, toAnchor: () => ({ outerHTML: '<a>15</a>' }) }],
    isContentVisible: true,
    alias: 'Athlete',
    system: { deedDieRollResult: deedRollSuccess ? 4 : 2, deedDieFormula: '1d4', deedRollSuccess, damageInlineRoll: '' },
    getFlag: () => false
  }, html)
  return messageContent.innerHTML
}

test('a successful deed die is highlighted', () => {
  expect(emote(true)).toContain('class="inline-roll critical"')
})

test('a failed deed die is not', () => {
  expect(emote(false)).toContain('class="inline-roll"')
  expect(emote(false)).not.toContain('critical')
})
