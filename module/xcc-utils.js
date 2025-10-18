/* eslint-disable import/no-absolute-path */
import { ensurePlus } from '/systems/dcc/module/utilities.js'

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
