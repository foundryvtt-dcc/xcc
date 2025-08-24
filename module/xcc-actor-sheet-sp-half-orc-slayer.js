import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";
import { ensurePlus, getCritTableResult, getFumbleTableResult, getFumbleTableNameFromCritTableName, getNPCFumbleTableResult } from "/systems/dcc/module/utilities.js";

class XCCActorSheetSpHalfOrcSlayer extends DCCActorSheet {
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
    halfOrcSlayer: {
      id: 'sp-half-orc-slayer',
      template: 'modules/xcrawl-classics/templates/actor-partial-sp-half-orc-slayer.html'
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

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-half-orc-slayer') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.Specialist.HalfOrcSlayer",
        'system.class.className': "halforcslayer",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.HalfOrcSlayer.ClassLink')),
        'system.details.sheetClass': 'sp-half-orc-slayer',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.showBackstab': true,
        'system.config.addClassLevelToInitiative': false
      })
    }

    return context
  }
}

export default XCCActorSheetSpHalfOrcSlayer;