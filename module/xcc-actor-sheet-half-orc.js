import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";

class XCCActorSheetHalfOrc extends DCCActorSheet {
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
    halforc: {
      id: 'half-orc',
      template: 'modules/xcrawl-classics/templates/actor-partial-half-orc.html'
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

    /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'half-orc') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.HalfOrc",
        'system.class.className': "xcc.halforc",
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
}
export default XCCActorSheetHalfOrc;