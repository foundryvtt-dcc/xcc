import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";

class XCCActorSheetGnome extends DCCActorSheet {
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
    gnome: {
      id: 'gnome',
      template: 'modules/xcrawl-classics/templates/actor-partial-gnome.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'gnome', group: 'sheet', label: 'XCC.Gnome.ActorSheetGnome' }
      ]
    }
  }

    /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'gnome') {
      await this.actor.update({
        'system.class.localizationPath':"XCC.Gnome",
        'system.class.className': "xcc.gnome",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Gnome.ClassLink')),
        'system.details.sheetClass': 'gnome',
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
export default XCCActorSheetGnome;