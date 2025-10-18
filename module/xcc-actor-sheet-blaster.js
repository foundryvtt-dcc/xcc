/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetBlaster extends XCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
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
    blaster: {
      id: 'blaster',
      template: globals.templatesPath + 'actor-partial-blaster.html'
    },
    wizardSpells: {
      id: 'wizardSpells',
      template: globals.templatesPath + 'actor-partial-spells.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'blaster', group: 'sheet', label: 'XCC.Blaster.ActorSheetBlaster' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'blaster') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Blaster.ClassLink'), { relativeTo: this.actor })
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'blaster') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Blaster',
        'system.class.className': 'blaster',
        'system.details.sheetClass': 'blaster',
        'system.class.spellCheckAbility': 'per',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': true
      })
    }

    return context
  }
}

export default XCCActorSheetBlaster
