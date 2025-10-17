/* eslint-disable import/no-absolute-path */
import DCCActor from '/systems/dcc/module/actor.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'

class XCCActor extends DCCActor {
  computeSpellCheck (item, options = {}) {
    console.log('Computing Spell Check for XCC', this, item, options)
    super.computeSpellCheck(item, options)
    if (this.system.details.sheetClass === 'blaster') {
      // Custom logic for Blaster class spell checks
      const blasterMod = ensurePlus(this.system.class?.blasterDie || 'd3')
      const abilityMod = ensurePlus(this.system.abilities.per.mod)
      const otherMod = this.system.class.spellCheckOtherMod ? ensurePlus(this.system.class.spellCheckOtherMod) : ''
      this.system.class.spellCheck = ensurePlus(blasterMod + abilityMod + otherMod)

      if (this.system.class.spellCheckOverride) {
        this.system.class.spellCheck = this.system.class.spellCheckOverride
      }
    }
  }
}
export default XCCActor
