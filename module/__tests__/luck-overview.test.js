/* eslint-disable import/no-absolute-path */
/* global game */
import { expect, test } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import { getLuckActors, luckRows, addLuckOverviewSidebarTool } from '../xcc-luck-overview.js'

function makeActor (id, name, lck, { type = 'Player', hasPlayerOwner = true } = {}) {
  return { id, name, img: `${id}.png`, type, hasPlayerOwner, system: { abilities: { lck } } }
}

test('lists player-owned characters on the scene once each, skipping NPCs and unowned PCs', () => {
  const pc = makeActor('a', 'Bear', { value: 9, max: 12, mod: 0 })
  const npc = makeActor('b', 'Poodle', { value: 10, max: 10, mod: 0 }, { type: 'NPC', hasPlayerOwner: false })
  const unowned = makeActor('c', 'Hireling', { value: 10, max: 10, mod: 0 }, { hasPlayerOwner: false })
  game.scenes = { viewed: { tokens: [{ actor: pc }, { actor: npc }, { actor: unowned }, { actor: pc }, { actor: null }] } }

  expect(getLuckActors().map(a => a.name)).toEqual(['Bear'])
})

test('no scene means no rows', () => {
  game.scenes = { viewed: null }
  expect(getLuckActors()).toEqual([])
})

test('rows show current / max luck and a signed modifier, sorted by name', () => {
  const rows = luckRows([
    makeActor('a', 'Xardax', { value: 13, max: 13, mod: 1 }),
    makeActor('b', 'Bear', { value: 6, max: 11, mod: -1 })
  ])
  expect(rows.map(r => r.name)).toEqual(['Bear', 'Xardax'])
  expect(rows[0]).toMatchObject({ value: 6, max: 11, mod: '-1', spent: true })
  expect(rows[1]).toMatchObject({ value: 13, max: 13, mod: '+1', spent: false })
})

test('the Luck tool is added right after Mojo in the XCC Tools sidebar', () => {
  const tools = { fleetingLuck: {} }
  addLuckOverviewSidebarTool(tools)
  tools.grandstandingReset = {}
  expect(Object.keys(tools)).toEqual(['fleetingLuck', 'luckOverview', 'grandstandingReset'])
  expect(tools.luckOverview.label).toEqual('XCC.LuckOverview.Title')
})
