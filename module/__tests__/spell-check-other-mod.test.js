/* eslint-disable import/no-absolute-path */
/**
 * The class's extra spell-check modifier: `parseInt` read '+1+2' as 1 and
 * '+1d4' as 1, silently dropping the rest of the bonus.
 */
import { expect, test } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import { addSpellCheckOtherMod, calculateSpellCheckBonus } from '../xcc-utils.js'

test('a plain integer is summed in', () => {
  expect(addSpellCheckOtherMod(3, '+2')).toBe(5)
  expect(addSpellCheckOtherMod(3, '-1')).toBe(2)
  expect(addSpellCheckOtherMod(3, 2)).toBe(5)
})

test('an empty modifier leaves the bonus alone', () => {
  expect(addSpellCheckOtherMod(3, '')).toBe(3)
  expect(addSpellCheckOtherMod(3, null)).toBe(3)
})

test('a chained or dice modifier is kept whole as a formula fragment', () => {
  expect(addSpellCheckOtherMod(3, '+1+2')).toBe('+1+2+3')
  expect(addSpellCheckOtherMod(3, '+1d4')).toBe('+1d4+3')
  expect(addSpellCheckOtherMod(3, '1d4')).toBe('+1d4+3')
  expect(addSpellCheckOtherMod(3, '@ab')).toBe('+@ab+3')
})

test('the spell-check bonus keeps every part of the extra modifier', () => {
  const actor = {
    system: {
      abilities: { int: { mod: 1 } },
      class: { spellCheckAbility: 'int', spellCheckOtherMod: '+1d4' },
      details: { level: { value: 2 }, sheetClass: 'messiah' }
    }
  }
  expect(calculateSpellCheckBonus(actor)).toBe('+1d4+3')
  actor.system.class.spellCheckOtherMod = '+1+2'
  expect(calculateSpellCheckBonus(actor)).toBe('+1+2+3')
  actor.system.class.spellCheckOtherMod = '+2'
  expect(calculateSpellCheckBonus(actor)).toBe('+5')
})
