/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetSpHalfOrcSlayer extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollWeaponAttack: this.rollModifiedWeaponAttack
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
    halfOrcSlayer: {
      id: 'sp-half-orc-slayer',
      template: globals.templatesPath + 'actor-partial-sp-half-orc-slayer.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-half-orc-slayer', group: 'sheet', label: 'XCC.Specialist.HalfOrcSlayer.ActorSheetHalfOrcSlayer' }
      ]
    }
  }

  setSpecialistSkills () {
    // DCC System had a bug with pickPocket skill, we're setting a custom one for now
    if (this.actor.system.skills.pickPocket) {
      this.actor.system.skills.pickPocket.ability = 'agl'
      this.actor.system.skills.pickPocket.label = 'DCC.system.skills.pickPocket.value'
    }
    // XCC uses int for forge document skill
    if (this.actor.system.skills.forgeDocument) {
      this.actor.system.skills.forgeDocument.ability = 'int'
    }
  }

  /** @override */
  async _prepareContext (options) {
    // Half-Orc Slayer adds Reflex to initiative
    if (this.actor.system.details.sheetClass !== 'sp-half-orc-slayer') {
      if (this.actor.isPC && this.actor._getConfig().computeInitiative) {
        await this.actor.update({
          'system.attributes.init.otherMod': this.actor.system.saves.ref.value
        })
      }
    }

    await this.actor.update({
      'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.HalfOrcSlayer.ClassLink'))
    })

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-half-orc-slayer') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Specialist.HalfOrcSlayer',
        'system.class.className': 'halforcslayer',
        'system.details.sheetClass': 'sp-half-orc-slayer',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.showBackstab': true,
        'system.config.addClassLevelToInitiative': false
      })
    }
    this.setSpecialistSkills()
    return context
  }

  static async rollModifiedWeaponAttack (event, target) {
    event.preventDefault()
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const options = DCCActorSheet.fillRollOptions(event)
    Object.assign(options, {
      backstab: target.classList.contains('backstab-button')
    })
    const weapon = this.actor.items.find(i => i.id === itemId)
    let oldTable = ''
    if (options.backstab) {
      if (weapon) {
        // Set critTable to III
        oldTable = weapon.system?.critTable || ''
        weapon.system.critTable = 'III'
        // If backstab is active, we bump the damage die up if backstabDamage is not already set
        if (weapon.system.melee && weapon.system.backstabDamage === '') {
          weapon.system.backstabDamage = game.dcc.DiceChain.bumpDie(weapon.system.damageWeapon, 1)
        }
      }
    }
    // Continue attack
    await this.actor.rollWeaponAttack(itemId, options)

    // Restore regular critTable
    if (options.backstab && weapon) {
      weapon.system.critTable = oldTable
    }
  }
}

export default XCCActorSheetSpHalfOrcSlayer
