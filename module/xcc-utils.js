/* eslint-disable import/no-absolute-path */
import { ensurePlus } from '/systems/dcc/module/utilities.js'

/**
 * Normalize a roll-formula fragment so it can be concatenated onto another.
 *
 * DCC bakes the sign into each term's formula rather than inserting operators
 * between them, so a fragment has to carry its own. Coerced through String
 * because an `add` change can write a Number into the field.
 *
 * @param {*} formula  A formula fragment, e.g. '1d3', '+2', 2
 * @returns {string}   '' for an empty value, otherwise signed, e.g. '+1d3'
 */
export const signedFormula = function (formula) {
  const trimmed = String(formula ?? '').trim()
  if (!trimmed) return ''
  return '+-'.includes(trimmed[0]) ? trimmed : `+${trimmed}`
}

/**
 * The Fame modifier from Table 6-1: a flat bonus up to 60 Fame, then steps up
 * the action die instead.
 *
 * @param {number} fame
 * @returns {{mod: number, dieSteps: number}}
 */
export const getFameModifier = function (fame) {
  if (fame >= 81) return { mod: 0, dieSteps: 2 }
  if (fame >= 61) return { mod: 0, dieSteps: 1 }
  if (fame >= 41) return { mod: 2, dieSteps: 0 }
  if (fame >= 21) return { mod: 1, dieSteps: 0 }
  return { mod: 0, dieSteps: 0 }
}

export const calculateSpellCheckBonus = function (actor) {
  const blasterDie = actor.system.class?.blasterDie ? ensurePlus(actor.system.class.blasterDie) : ''
  let mod = actor.system.abilities[actor.system.class.spellCheckAbility]?.mod || 0
  if (!actor.system.class?.blasterDie) mod = parseInt(mod) + parseInt(actor.system.details.level.value)
  if (actor.system.details.sheetClass === 'sp-elf-trickster') {
    mod = parseInt(mod) + parseInt(actor.system.abilities.lck.mod)
  }
  if (actor.system.class.spellCheckOtherMod) {
    if (isNaN(parseInt(actor.system.class.spellCheckOtherMod))) {
      mod = ensurePlus(actor.system.class.spellCheckOtherMod) + ensurePlus(mod)
    } else {
      mod = parseInt(mod) + parseInt(actor.system.class.spellCheckOtherMod)
    }
  }
  return blasterDie + ensurePlus(mod)
}
