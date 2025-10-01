import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";
import { globals } from './settings.js';

class XCCActorSheetSpDwarfMechanic extends DCCActorSheet {
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
    dwarfMechanic: {
      id: 'sp-dwarf-mechanic',
      template: globals.templatesPath + 'actor-partial-sp-dwarf-mechanic.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-dwarf-mechanic', group: 'sheet', label: 'XCC.Specialist.DwarfMechanic.ActorSheetDwarfMechanic' }
      ]
    }
  }

  setSpecialistSkills() {
    //DCC System had a bug with pickPocket skill, we're setting a custom one for now
    if (this.actor.system.skills.pickPocket) {
      this.actor.system.skills.pickPocket.ability = 'agl';
      this.actor.system.skills.pickPocket.label = 'DCC.system.skills.pickPocket.value';
    }
    //XCC uses int for forge document skill
    if (this.actor.system.skills.forgeDocument) {
      this.actor.system.skills.forgeDocument.ability = 'int';
    }
  }

  /** @override */
  async _prepareContext(options) {
    // Set base speed
    if (this.actor.system.details.sheetClass !== 'sp-dwarf-mechanic') {
      await this.actor.update({
        'system.attributes.speed.base': 20,
        'system.attributes.speed.value': 20
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-dwarf-mechanic') {
      await this.actor.update({
        'system.class.localizationPath': "XCC.Specialist.DwarfMechanic",
        'system.class.className': "dwarfmechanic",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.DwarfMechanic.ClassLink')),
        'system.details.sheetClass': 'sp-dwarf-mechanic',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.showBackstab': true,
        'system.config.addClassLevelToInitiative': false
      })
    }
    this.setSpecialistSkills();
    return context
  }
}

export default XCCActorSheetSpDwarfMechanic;