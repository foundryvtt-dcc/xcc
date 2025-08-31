import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";

class XCCActorSheetDwarf extends DCCActorSheet {
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
    xccdwarf: {
      id: 'xcc-dwarf',
      template: 'modules/xcrawl-classics/templates/actor-partial-dwarf.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'xcc-dwarf', group: 'sheet', label: 'XCC.Dwarf.ActorSheetDwarf' }
      ]
    }
  }

    /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'xcc-dwarf') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.Dwarf",
        'system.class.className': "xcc.dwarf",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Dwarf.ClassLink')),
        'system.details.sheetClass': 'xcc-dwarf',
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
export default XCCActorSheetDwarf;