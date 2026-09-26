/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import { globals } from './settings.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'

class XCCActorSheetSpCriminal extends XCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 670
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
    criminal: {
      id: 'sp-criminal',
      template: globals.templatesPath + 'actor-partial-sp-criminal.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-criminal', group: 'sheet', label: 'XCC.Specialist.Criminal.ActorSheetCriminal' }
      ]
    }
  }

  setSpecialistSkills () {
    // XCC uses int for forge document skill
    if (this.actor.system.skills.forgeDocument) {
      this.actor.system.skills.forgeDocument.ability = 'int'
    }
    // Criminal: Criminal connections skill
    if (this.actor.system.skills.criminalConnections) {
      this.actor.system.skills.criminalConnections.ability = 'per'
      this.actor.system.skills.criminalConnections.label = 'DCC.system.skills.criminalConnections.value'
    }
    // Criminal: Bribery expert skill - class level + Int. The level data writes
    // the level on level-up; without it, show the level until the player sets
    // a value (a criminal's bonus is never 0), so manual edits aren't overwritten
    if (this.actor.system.skills.briberyExpert) {
      if (!parseInt(this.actor.system.skills.briberyExpert.value)) {
        this.actor.system.skills.briberyExpert.value = ensurePlus(String(this.actor.system.details.level.value || 0))
      }
      this.actor.system.skills.briberyExpert.ability = 'int'
      this.actor.system.skills.briberyExpert.label = 'DCC.system.skills.briberyExpert.value'
    }
  }

  /** @override */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'sp-criminal') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.Criminal.ClassLink'))
      })
    }
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-criminal') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Specialist.Criminal',
        'system.class.className': 'criminal',
        'system.details.sheetClass': 'sp-criminal',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.showBackstab': true,
        'system.config.addClassLevelToInitiative': false
      })
    }
    this.setSpecialistSkills()
    return context
  }
}

export default XCCActorSheetSpCriminal
