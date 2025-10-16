/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { globals } from './settings.js'

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
      template: globals.templatesPath + 'actor-partial-sp-acrobat.html'
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

  setSpecialistSkills () {
    // DCC System had a bug with pickPocket skill, we're setting a custom one for now
    if (this.actor.system.skills.pickPocket) {
      this.actor.system.skills.pickPocket.ability = 'agl'
      this.actor.system.skills.pickPocket.config = { applyCheckPenalty: true }
      this.actor.system.skills.pickPocket.label = 'DCC.system.skills.pickPocket.value'
    }
    // XCC uses int for forge document skill
    if (this.actor.system.skills.forgeDocument) {
      this.actor.system.skills.forgeDocument.ability = 'int'
    }
    // Acrobat: Acrobatics
    if (this.actor.system.skills.acrobatics) {
      this.actor.system.skills.acrobatics.ability = 'agl'
      this.actor.system.skills.acrobatics.config = { applyCheckPenalty: true }
      this.actor.system.skills.acrobatics.label = 'DCC.system.skills.acrobatics.value'
    }
    // Acrobat: Tightrope walk
    if (this.actor.system.skills.tightropeWalk) {
      this.actor.system.skills.tightropeWalk.ability = 'agl'
      this.actor.system.skills.tightropeWalk.config = { applyCheckPenalty: true }
      this.actor.system.skills.tightropeWalk.label = 'DCC.system.skills.tightropeWalk.value'
    }
    // Acrobat: Leap skill
    if (this.actor.system.skills.leap) {
      this.actor.system.skills.leap.ability = 'str'
      this.actor.system.skills.leap.config = { applyCheckPenalty: true }
      this.actor.system.skills.leap.label = 'DCC.system.skills.leap.value'
    }
    // Acrobat: Pole vault skill
    if (this.actor.system.skills.poleVault) {
      this.actor.system.skills.poleVault.ability = 'str'
      this.actor.system.skills.poleVault.config = { applyCheckPenalty: true }
      this.actor.system.skills.poleVault.label = 'DCC.system.skills.poleVault.value'
    }
  }

  static addHooksAndHelpers () {
    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      if (message.speakerActor?.system?.details?.sheetClass !== 'sp-acrobat') return
      if ((message.system?.skillId || '') === 'acrobatics') {
        // Dodge message
        const reflex = data.speakerActor?.system?.saves.ref.value || 0
        let enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeFailure')
        if ((message.rolls[0]?.total || 0) >= 20) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeAll')
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeMultiple')
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeSingle')
        }
        // Withdraw message
        let withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawFailure')
        if ((message.rolls[0]?.total || 0) >= 20) {
          withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawMultiple')
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawSingle')
        }
        // Fall damage mitigation
        let fall = '0'
        if ((message.rolls[0]?.total || 0) >= 30) {
          fall = '5d6'
        } else if ((message.rolls[0]?.total || 0) >= 25) {
          fall = '4d6'
        } else if ((message.rolls[0]?.total || 0) >= 20) {
          fall = '3d6'
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          fall = '2d6'
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          fall = '1d6'
        }
        html.innerHTML += '<div class=\'message-content\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.AcrobaticsMessage', {
          enemies,
          reflex,
          withdraw,
          fall
        }) + '</div>'
      } else if ((message.system?.skillId || '') === 'poleVault') {
        // Pole vault message
        let height = 0
        let dc = 0
        if ((message.rolls[0]?.total || 0) >= 25) {
          height = 20
          dc = 25
        } else if ((message.rolls[0]?.total || 0) >= 20) {
          height = 15
          dc = 20
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          height = 10
          dc = 15
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          height = 5
          dc = 10
        }
        html.innerHTML += '<div class=\'message-content\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.PoleVaultMessage', {
          height,
          dc
        }) + '</div>'
      } else if ((message.system?.skillId || '') === 'tightropeWalk') {
        // Tightrope walk message
        html.innerHTML += '<div class=\'message-content tightrope\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.TightRopeMessage') + '</div>'
      }
    })
  }

  /** @override */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'sp-acrobat') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.Acrobat.ClassLink'))
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-acrobat') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Specialist.Acrobat',
        'system.class.className': 'acrobat',
        'system.details.sheetClass': 'sp-acrobat',
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

export default XCCActorSheetSpAcrobat
