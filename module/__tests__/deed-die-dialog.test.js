/* eslint-disable import/no-absolute-path */
/* global game */
import { expect, test, vi, beforeEach, afterEach } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import { dieFaces, findDamageDeedField, linkDeedDice } from '../xcc-deed-die-dialog.js'

// A minimal stand-in for the dialog's DOM: rows of labels and inputs, matched
// the way linkDeedDice queries them.
function makeField (id, value) {
  const listeners = {}
  return {
    id,
    value,
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn) },
    fire: (type) => (listeners[type] ?? []).forEach(fn => fn())
  }
}
const makeLabel = (htmlFor, text) => ({ htmlFor, textContent: text })
function makeRow (terms) {
  const labels = terms.map(([id, label]) => makeLabel(id, label))
  const fields = terms.map(([id, , value]) => makeField(id, value))
  return {
    labels,
    fields,
    querySelectorAll: (selector) => selector.startsWith('label') ? labels : fields
  }
}
function makeDialog (attackTerms, damageTerms) {
  const attackRow = makeRow(attackTerms)
  const damageRow = makeRow(damageTerms)
  let clickHandler
  return {
    attackRow,
    damageRow,
    querySelector: (selector) => selector.includes('damage-row') ? damageRow : null,
    querySelectorAll: () => [attackRow, damageRow],
    addEventListener: (type, fn) => { clickHandler = fn },
    click: (term) => clickHandler({ target: { closest: () => ({ dataset: { term } }) } })
  }
}

// Attack: action die, deed die, to-hit; damage: weapon die, deed die, bonus
const standardDialog = () => makeDialog(
  [['term-0', 'Action Die', '1d20'], ['term-1', 'Deed Die', '1d3'], ['term-2', 'To Hit', '+1']],
  [['term-damage-0', 'Damage Die', '1d3'], ['term-damage-1', 'Damage Die', '1d3'], ['term-damage-2', 'Damage Modifier', '-1']]
)

beforeEach(() => {
  game.i18n.localize = (key) => ({ 'DCC.DeedDie': 'Deed Die' })[key] ?? key
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

test('dieFaces reads single-die formulas only', () => {
  expect(dieFaces('1d3')).toBe(3)
  expect(dieFaces('+d14')).toBe(14)
  expect(dieFaces('1d6+1')).toBeNull()
  expect(dieFaces('+2')).toBeNull()
})

test('the damage deed die is the last damage die of its size', () => {
  const fields = [{ value: '1d6' }, { value: '1d4' }, { value: '1d4' }]
  expect(findDamageDeedField('1d4', fields)).toBe(fields[2])
  expect(findDamageDeedField('1d8', fields)).toBeNull()
})

test('relabels the damage deed die, leaving a same-size weapon die alone (shield d3 + deed d3)', () => {
  const dialog = standardDialog()
  linkDeedDice(dialog)
  expect(dialog.damageRow.labels.map(l => l.textContent)).toEqual(['Damage Die', 'Deed Die', 'Damage Modifier'])
})

test('typing in either deed field updates the other', () => {
  const dialog = standardDialog()
  linkDeedDice(dialog)
  const attackDeed = dialog.attackRow.fields[1]
  const damageDeed = dialog.damageRow.fields[1]

  attackDeed.value = '1d4'
  attackDeed.fire('input')
  expect(damageDeed.value).toBe('1d4')

  damageDeed.value = '1d5'
  damageDeed.fire('change')
  expect(attackDeed.value).toBe('1d5')
  expect(dialog.damageRow.fields[0].value).toBe('1d3')
})

test("the dialog's buttons on either deed field update the other", () => {
  const dialog = standardDialog()
  linkDeedDice(dialog)
  const attackDeed = dialog.attackRow.fields[1]
  const damageDeed = dialog.damageRow.fields[1]

  // e.g. the dice chain "up" button on the attack deed die
  dialog.click('1')
  attackDeed.value = '+1d4'
  vi.runAllTimers()
  expect(damageDeed.value).toBe('+1d4')

  dialog.click('damage-1')
  damageDeed.value = '1d3'
  vi.runAllTimers()
  expect(attackDeed.value).toBe('1d3')

  // Buttons on other terms leave the deed dice alone
  dialog.click('damage-0')
  dialog.damageRow.fields[0].value = '1d4'
  vi.runAllTimers()
  expect(attackDeed.value).toBe('1d3')
})

test('does nothing without a deed die or a damage row', () => {
  const noDeed = makeDialog([['term-0', 'Action Die', '1d20'], ['term-1', 'To Hit', '+2']], [['term-damage-0', 'Damage Die', '1d8']])
  linkDeedDice(noDeed)
  expect(noDeed.damageRow.labels[0].textContent).toBe('Damage Die')

  const noDamage = { querySelector: () => null, querySelectorAll: () => [], addEventListener: vi.fn() }
  expect(() => linkDeedDice(noDamage)).not.toThrow()
})
