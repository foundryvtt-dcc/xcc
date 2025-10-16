/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'

class XCCActorSheetGeneric extends DCCActorSheet {
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
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' }
      ]
    }
  }

  static addHooksAndHelpers () {
    // No additional helpers for the generic sheet
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'xcc-generic') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.GenericSheet',
        'system.class.className': 'xcc-generic',
        'system.details.sheetClass': 'xcc-generic',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.class.spellCheckAbility': 'per',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }
    return context
  }
}
export default XCCActorSheetGeneric
