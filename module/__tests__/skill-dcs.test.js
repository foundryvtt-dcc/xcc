/* eslint-disable import/no-absolute-path */
/* global game */
import { expect, test } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'
import fs from 'node:fs'

import { SKILL_DC_LADDERS, describeSkillDCs, skillDCsHTML } from '../xcc-skill-dcs.js'

test('sneak silently 11 beats normal arena floors and misses creaking boards', () => {
  expect(describeSkillDCs('sneakSilently', 11, 8)).toEqual({
    ladders: [{ heading: undefined, beaten: { dc: 10, key: 'SneakNormal' }, missed: { dc: 15, key: 'SneakNoisy' } }],
    trapTriggered: false
  })
})

test('a DC exactly met counts as beaten', () => {
  const [ladder] = describeSkillDCs('climbSheerSurfaces', 13, 10).ladders
  expect(ladder.beaten).toEqual({ dc: 13, key: 'ClimbArena' })
  expect(ladder.missed).toEqual({ dc: 20, key: 'ClimbSmooth' })
})

test('below the easiest DC only shows the miss, above the hardest only the success', () => {
  expect(describeSkillDCs('sneakSilently', 3, 2).ladders[0]).toMatchObject({ beaten: undefined, missed: { dc: 5 } })
  expect(describeSkillDCs('sneakSilently', 24, 18).ladders[0]).toMatchObject({ beaten: { dc: 20 }, missed: undefined })
})

test('hide in shadows reports inside and outside Xcrawl separately', () => {
  const { ladders } = describeSkillDCs('hideInShadows', 12, 9)
  expect(ladders.map(l => l.heading)).toEqual(['InXcrawl', 'OutsideXcrawl'])
  expect(ladders[0]).toMatchObject({ beaten: undefined, missed: { dc: 13, key: 'HideArena' } })
  expect(ladders[1]).toMatchObject({ beaten: { dc: 10, key: 'HideMoon' }, missed: { dc: 15, key: 'HideShadow' } })
})

test('a failed handle poison check says the specialist poisons themselves', () => {
  expect(describeSkillDCs('handlePoison', 9, 5).ladders[0].missed).toEqual({ dc: 10, key: 'PoisonSelf' })
  expect(describeSkillDCs('handlePoison', 10, 5).ladders[0].beaten).toEqual({ dc: 10, key: 'PoisonSafe' })
})

test('a natural 1 on disable trap triggers the trap; other trap rolls show nothing', () => {
  expect(describeSkillDCs('disableTrap', 6, 1)).toEqual({ ladders: [], trapTriggered: true })
  expect(describeSkillDCs('disableTrap', 6, 2)).toBeNull()
  expect(describeSkillDCs('findTrap', 1, 1)).toBeNull()
  expect(describeSkillDCs('acrobatics', 12, 12)).toBeNull()
})

test('the chat HTML lists the beaten and missed DCs', () => {
  game.i18n.localize = (key) => key
  const html = skillDCsHTML(describeSkillDCs('sneakSilently', 11, 8))
  expect(html).toContain('success')
  expect(html).toContain('DC 10: XCC.SkillDCs.SneakNormal')
  expect(html).toContain('DC 15: XCC.SkillDCs.SneakNoisy')
})

test('every DC label and heading has English text', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../../lang/en.json', import.meta.url), 'utf8'))
  const keys = Object.values(SKILL_DC_LADDERS).flat()
    .flatMap(({ heading, tiers, failKey }) => [heading, failKey, ...tiers.map(([, key]) => key)])
    .filter(Boolean)
  for (const key of [...keys, 'TrapTriggered']) {
    expect(en.XCC.SkillDCs[key], key).toBeTruthy()
  }
})
