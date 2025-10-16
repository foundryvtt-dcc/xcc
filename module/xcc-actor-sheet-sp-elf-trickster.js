/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetSpElfTrickster extends DCCActorSheet {
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
    elfTrickster: {
      id: 'sp-elf-trickster',
      template: globals.templatesPath + 'actor-partial-sp-elf-trickster.html'
    },
    wizardSpells: {
      id: 'wizardSpells',
      template: 'systems/dcc/templates/actor-partial-wizard-spells.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-elf-trickster', group: 'sheet', label: 'XCC.Specialist.ElfTrickster.ActorSheetElfTrickster' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  setSpecialistSkills () {
    // DCC System had a bug with pickPocket skill, we're setting a custom one for now
    if (this.actor.system.skills.pickPocket) {
      this.actor.system.skills.pickPocket.ability = 'agl'
      this.actor.system.skills.pickPocket.label = 'DCC.system.skills.pickPocket.value'
    }
    // XCC uses int for forge document skill
    if (this.actor.system.skills.forgeDocument) {
      this.actor.system.skills.forgeDocument.ability = 'int'
    }
    // Elf Trickster: Detect secret doors skill
    if (this.actor.system.class.className === 'elftrickster') {
      this.actor.system.skills.detectSecretDoors = {
        value: 4,
        ability: 'int',
        label: 'XCC.DetectSecretDoors',
        die: 'd20'
      }
      this.actor.system.skills.spellCheck = {
        value: this.actor.system.abilities.lck.mod + this.actor.system.details.level.value,
        config: {
          applyCheckPenalty: true
        },
        ability: 'per',
        label: 'DCC.Spell',
        die: 'd20'
      }
    }
  }

  /** @override */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'sp-elf-trickster') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.ElfTrickster.ClassLink'))
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-elf-trickster') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Specialist.ElfTrickster',
        'system.class.className': 'elftrickster',
        'system.details.sheetClass': 'sp-elf-trickster',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.showBackstab': true,
        'system.config.addClassLevelToInitiative': false,
        'system.class.spellCheckAbility': 'per',
        'system.class.spellCheckOtherMod': this.actor.system.abilities.lck.mod,
        'system.config.showSpells': true
      })
    } else {
      await this.actor.update({
        'system.class.spellCheckAbility': 'per',
        'system.class.spellCheckOtherMod': this.actor.system.abilities.lck.mod
      })
    }
    this.setSpecialistSkills()
    return context
  }
}

export default XCCActorSheetSpElfTrickster
