import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";
import { ensurePlus, getCritTableResult, getFumbleTableResult, getFumbleTableNameFromCritTableName, getNPCFumbleTableResult } from "/systems/dcc/module/utilities.js";

class XCCActorSheetSpAcrobat extends DCCActorSheet {
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
    thief: {
      id: 'sp-acrobat',
      template: 'modules/xcrawl-classics/templates/actor-partial-sp-acrobat.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-acrobat', group: 'sheet', label: 'XCC.Specialist.Acrobat.ActorSheetAcrobat' }
      ]
    }
  }

  constructor (options = {}) {
    console.log("XCCActorSheetSpAcrobat constructor")
    super(options)
    this.actor.system.skills.acrobatics.ability = 'agl';
    this.actor.system.skills.acrobatics.label = 'DCC.system.skills.acrobatics.value';
    this.actor.system.skills.tightropeWalk.ability = 'agl';
    this.actor.system.skills.tightropeWalk.label = 'DCC.system.skills.tightropeWalk.value';
    this.actor.system.skills.leap.ability = 'str';
    this.actor.system.skills.leap.label = 'DCC.system.skills.leap.value';
    this.actor.system.skills.poleVault.ability = 'str';
    this.actor.system.skills.poleVault.label = 'DCC.system.skills.poleVault.value';
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-acrobat') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.Specialist.Acrobat",
        'system.class.className': "acrobat",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.Acrobat.ClassLink')),
        'system.details.sheetClass': 'sp-acrobat',
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

export default XCCActorSheetSpAcrobat;