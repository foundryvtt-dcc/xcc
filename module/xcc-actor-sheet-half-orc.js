import DCCActorSheet from '../../../../../../../systems/dcc/module/actor-sheet.js'
import { ensurePlus } from '../../../../../../../systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetHalfOrc extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollWeaponAttackWithWild: this.rollWeaponAttackWithWild
    }
  }

  /** @inheritDoc */
  static CLASS_PARTS = {
    character: {
      id: 'character',
      template: 'systems/dcc/templates/actor-partial-pc-common.html'
    },
    equipment: {
      id: 'equipment',
      template: 'systems/dcc/templates/actor-partial-pc-equipment.html'
    },
    halforc: {
      id: 'half-orc',
      template: globals.templatesPath + 'actor-partial-half-orc.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'half-orc', group: 'sheet', label: 'XCC.HalfOrc.ActorSheetHalfOrc' }
      ]
    }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getWildToHit', function (actor) {
      const lck = String(actor.system.abilities.lck.mod)[0] === '-' ? '' : actor.system.abilities.lck.mod || ''
      const str = actor.system.abilities.str.mod || ''
      const ab = actor.system.details.attackBonus || ''
      return ab + ensurePlus(str + lck)
    })
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'half-orc') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.HalfOrc',
        'system.class.className': 'xcc.halforc',
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.HalfOrc.ClassLink')),
        'system.details.sheetClass': 'half-orc',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }
    return context
  }

  _onRender (context, options) {
    // Add another rollable div to each attack-buttons section
    const attackButtonsElements = this.parts.equipment.children[1].querySelectorAll('.attack-buttons')
    attackButtonsElements.forEach(attackButtons => {
      const newRollableDiv = document.createElement('div')
      newRollableDiv.className = 'rollable wild-button icon-filter'
      newRollableDiv.setAttribute('data-action', 'rollWeaponAttackWithWild')
      newRollableDiv.setAttribute('data-drag', 'false')
      newRollableDiv.setAttribute('title', game.i18n.localize('XCC.HalfOrc.WildAttack'))
      newRollableDiv.setAttribute('draggable', 'false')
      newRollableDiv.innerHTML = '&nbsp;'
      attackButtons.appendChild(newRollableDiv)
    })

    super._onRender(context, options)
  }

  static async rollWeaponAttackWithWild (event, target) {
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const weapon = this.actor.items.find(i => i.id === itemId)
    if (weapon) {
      const wildCritRange = this.actor.system.class.wildCritRange || 20
      const oldDamage = weapon.system.damage
      const oldCrit = weapon.system.critRange
      const oldBonus = weapon.system.toHit
      // Adjust crit range
      weapon.system.critRange = Math.min(wildCritRange, weapon.system.critRange)
      if (this.actor.system.abilities.lck.mod > 0) {
        weapon.system.toHit = oldBonus + ensurePlus(this.actor.system.abilities.lck.mod)
      }
      // Add scourge damage to the formula
      if (this.actor.system.abilities.lck.mod > 0) {
        weapon.system.damage = weapon.system.damage ? `${weapon.system.damage}+${this.actor.system.abilities.lck.mod}` : `+${this.actor.system.abilities.lck.mod}`
      }
      // Add hook to restore original weapon data
      Hooks.once('dcc.rollWeaponAttack', async (rolls, messageData) => {
        if (weapon && messageData.system.weaponId === weapon.id) {
          weapon.system.damage = oldDamage
          weapon.system.critRange = oldCrit
          weapon.system.toHit = oldBonus
        }
      })
      // Call the original roll weapon attack action
      await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
    } else { console.warn(`Weapon not found: ${itemId}`) }
  }
}
export default XCCActorSheetHalfOrc
