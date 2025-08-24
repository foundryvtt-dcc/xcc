import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";
import { ensurePlus, getCritTableResult, getFumbleTableResult, getFumbleTableNameFromCritTableName, getNPCFumbleTableResult } from "/systems/dcc/module/utilities.js";

class XCCActorSheetSpScout extends DCCActorSheet {
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
    scout: {
      id: 'sp-scout',
      template: 'modules/xcrawl-classics/templates/actor-partial-sp-scout.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-scout', group: 'sheet', label: 'XCC.Specialist.Scout.ActorSheetScout' }
      ]
    }
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-scout') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.Specialist.Scout",
        'system.class.className': "scout",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.Scout.ClassLink')),
        'system.details.sheetClass': 'sp-scout',
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

export default XCCActorSheetSpScout;