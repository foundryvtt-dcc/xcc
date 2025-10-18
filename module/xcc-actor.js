/* eslint-disable import/no-absolute-path */
import DCCActor from '/systems/dcc/module/actor.js'
import { calculateSpellCheckBonus } from './xcc-utils.js'

class XCCActor extends DCCActor {
  computeSpellCheck (item, options = {}) {
    super.computeSpellCheck(item, options)
    if (this.system.class.spellCheckOverride) {
      this.system.class.spellCheck = this.system.class.spellCheckOverride
    } else {
      this.system.class.spellCheck = calculateSpellCheckBonus(this)
    }
  }
}
export default XCCActor
