import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";

class XCCActorSheetHalfElf extends DCCActorSheet {
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
    halfelf: {
      id: 'half-elf',
      template: 'modules/xcrawl-classics/templates/actor-partial-half-elf.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'half-elf', group: 'sheet', label: 'XCC.HalfElf.ActorSheetHalfElf' }
      ]
    }
  }

    /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'half-elf') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.HalfElf",
        'system.class.className': "xcc.halfelf",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.HalfElf.ClassLink')),
        'system.details.sheetClass': 'half-elf',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }
    return context
  }
}
export default XCCActorSheetHalfElf;