import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";

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
        //Acrobat: Acrobatics
        if (this.actor.system.skills.acrobatics) {
            this.actor.system.skills.acrobatics.ability = 'agl';
            this.actor.system.skills.acrobatics.label = 'DCC.system.skills.acrobatics.value';
        }
        //Acrobat: Tightrope walk
        if (this.actor.system.skills.tightropeWalk) {
            this.actor.system.skills.tightropeWalk.ability = 'agl';
            this.actor.system.skills.tightropeWalk.label = 'DCC.system.skills.tightropeWalk.value';
        }
        //Acrobat: Leap skill
        if (this.actor.system.skills.leap) {
            this.actor.system.skills.leap.ability = 'str';
            this.actor.system.skills.leap.label = 'DCC.system.skills.leap.value';
        }
        //Acrobat: Pole vault skill
        if (this.actor.system.skills.poleVault) {
            this.actor.system.skills.poleVault.ability = 'str';
            this.actor.system.skills.poleVault.label = 'DCC.system.skills.poleVault.value';
        }
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
    this.setSpecialistSkills();
    return context
  }
}

export default XCCActorSheetSpAcrobat;