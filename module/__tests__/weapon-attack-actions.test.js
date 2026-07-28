/* eslint-disable import/no-absolute-path */
/**
 * Regression tests for issue #14: class sheets delegated regular weapon
 * attacks to XCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack, which
 * does not exist (the DCC action handler is private), so Wild Attack and
 * friends crashed. They now go through XCCActorSheet.rollStandardWeaponAttack
 * and restore/clean up weapon state in a finally block.
 *
 * Uses the DCC system's Foundry mocks (see vitest.config.js for the
 * /systems/dcc alias).
 */

import { expect, test, vi } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'
import fs from 'node:fs'

import XCCActorSheet from '../xcc-actor-sheet.js'
import XCCActorSheetHalfOrc from '../xcc-actor-sheet-half-orc.js'
import XCCActorSheetDwarf from '../xcc-actor-sheet-dwarf.js'

function makeEvent () {
  return { preventDefault: vi.fn(), ctrlKey: false, metaKey: false, shiftKey: false }
}

function makeTarget (itemId, extraDataset = {}) {
  return {
    dataset: { itemId, ...extraDataset },
    classList: { contains: () => false }
  }
}

test('rollStandardWeaponAttack forwards the attack to the actor', async () => {
  const rollWeaponAttack = vi.fn()
  const sheet = { actor: { rollWeaponAttack } }

  const event = makeEvent()
  await XCCActorSheet.rollStandardWeaponAttack.call(sheet, event, makeTarget('w1'))

  expect(event.preventDefault).toHaveBeenCalled()
  expect(rollWeaponAttack).toHaveBeenCalledTimes(1)
  expect(rollWeaponAttack).toHaveBeenCalledWith('w1', expect.objectContaining({
    backstab: false,
    thrown: false
  }))
})

function makeHalfOrcSheet (weapon, rollWeaponAttack) {
  return {
    actor: {
      items: [weapon],
      system: {
        class: { wildCritRange: 18 },
        abilities: { lck: { mod: 2 } }
      },
      rollWeaponAttack
    }
  }
}

test('wild attack applies wild crit range and luck, then restores the weapon', async () => {
  const weapon = { id: 'w1', name: 'Axe', system: { damage: '1d8', critRange: 20, toHit: '+1' } }
  let duringRoll = null
  const rollWeaponAttack = vi.fn(async () => { duringRoll = { ...weapon.system } })
  const sheet = makeHalfOrcSheet(weapon, rollWeaponAttack)

  await XCCActorSheetHalfOrc.rollWeaponAttackWithWild.call(sheet, makeEvent(), makeTarget('w1'))

  // The attack itself was rolled with the modified weapon
  expect(rollWeaponAttack).toHaveBeenCalledWith('w1', expect.anything())
  expect(duringRoll).toEqual({ damage: '1d8+2', critRange: 18, toHit: '+1+2' })

  // The weapon is restored afterwards
  expect(weapon.system).toEqual({ damage: '1d8', critRange: 20, toHit: '+1' })
})

test('wild attack restores the weapon even when the roll fails', async () => {
  const weapon = { id: 'w1', name: 'Axe', system: { damage: '1d8', critRange: 20, toHit: '+1' } }
  const rollWeaponAttack = vi.fn(async () => { throw new Error('roll failed') })
  const sheet = makeHalfOrcSheet(weapon, rollWeaponAttack)

  await expect(
    XCCActorSheetHalfOrc.rollWeaponAttackWithWild.call(sheet, makeEvent(), makeTarget('w1'))
  ).rejects.toThrow('roll failed')

  expect(weapon.system).toEqual({ damage: '1d8', critRange: 20, toHit: '+1' })
})

test('wild attack keeps a wider weapon crit range', async () => {
  const weapon = { id: 'w1', name: 'Axe', system: { damage: '1d8', critRange: 16, toHit: '+1' } }
  let duringRoll = null
  const rollWeaponAttack = vi.fn(async () => { duringRoll = { ...weapon.system } })
  const sheet = makeHalfOrcSheet(weapon, rollWeaponAttack)

  await XCCActorSheetHalfOrc.rollWeaponAttackWithWild.call(sheet, makeEvent(), makeTarget('w1'))

  expect(duringRoll.critRange).toEqual(16)
})

test('shield bash rolls a fake weapon and always removes it again', async () => {
  const items = new Map()
  let sizeDuringRoll = null
  const rollWeaponAttack = vi.fn(async () => { sizeDuringRoll = items.size })
  const sheet = {
    actor: { items, rollWeaponAttack },
    getShieldBashDamage: () => '1d3+1',
    getShieldBashToHit: () => '+2'
  }

  await XCCActorSheetDwarf.rollShieldBashAttack.call(sheet, makeEvent(), makeTarget('bash1'))

  expect(rollWeaponAttack).toHaveBeenCalledWith('bash1', expect.anything())
  expect(sizeDuringRoll).toEqual(1)
  expect(items.size).toEqual(0)

  // Cleanup also happens when the roll fails
  rollWeaponAttack.mockRejectedValueOnce(new Error('roll failed'))
  await expect(
    XCCActorSheetDwarf.rollShieldBashAttack.call(sheet, makeEvent(), makeTarget('bash1'))
  ).rejects.toThrow('roll failed')
  expect(items.size).toEqual(0)
})

test('half-orc partial binds wild crit range to the schema field', () => {
  const html = fs.readFileSync(new URL('../../templates/actor-partial-half-orc.html', import.meta.url), 'utf8')
  // system.class.wildCritRange is the field defined in xcc.js; the old
  // system.details.wildCritRange binding silently dropped the value (#14)
  expect(html).toContain('name="system.class.wildCritRange"')
  expect(html).not.toContain('system.details.wildCritRange')
})
