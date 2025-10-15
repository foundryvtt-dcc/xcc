/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetGnome extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollDrawAgro: this.rollDrawAgro,
      rollTeamMascotDie: this.rollTeamMascotDie
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
      template: globals.templatesPath + 'actor-partial-gnome.html'
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
        { id: 'gnome', group: 'sheet', label: 'XCC.Gnome.ActorSheetGnome' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  getDrawAgroBonus () {
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0
    if (this.actor.system.abilities.lck.mod > 0) bonus += this.actor.system.abilities.lck.mod
    return bonus
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getDrawAgroBonus', (actor) => {
      let bonus = actor.system?.abilities?.per?.mod || 0
      bonus += actor.system?.details?.level?.value || 0
      if (actor.system.abilities.lck.mod > 0) bonus += actor.system.abilities.lck.mod
      return bonus
    })
  }

  /** @override */
  async _prepareContext (options) {
    // Set base speed
    if (this.actor.system.details.sheetClass !== 'gnome') {
      await this.actor.update({
        'system.attributes.speed.base': 25,
        'system.attributes.speed.value': 25
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'gnome') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Gnome',
        'system.class.className': 'xcc.gnome',
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Gnome.ClassLink')),
        'system.details.sheetClass': 'gnome',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.class.spellCheckAbility': 'per',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': true
      })
    }

    this.actor.system.skills.spellCheck = {
      value: this.actor.system.details.level.value,
      config: {
        applyCheckPenalty: true
      },
      ability: 'per',
      label: 'DCC.Spell',
      die: 'd20'
    }

    return context
  }

  static async rollTeamMascotDie (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.system.class.teamMascotDie'),
        formula: this.actor.system.class.teamMascotDie || '1d3'
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('DCC.system.class.teamMascotDie')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Create the luck die message
    const teamMascotDieMessage = game.i18n.format(
      'XCC.Gnome.TeamMascotDieMessage',
      {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck
    game.dcc.FleetingLuck.updateFlags(flags, roll)
    game.dcc.FleetingLuck.give(game.user.id, roll.total)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: teamMascotDieMessage,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('DCC.system.class.teamMascotDie')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  static async rollDrawAgro (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate draw aggro check bonus
    const bonus = this.getDrawAgroBonus()

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Gnome.DrawAgro'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Gnome.DrawAgro')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Create the disrespect message
    const disrespectMessage = game.i18n.format(
      'XCC.Gnome.DrawAgroMessage',
      {
        actorName: this.actor.name,
        rollResult: roll.total,
        rollHTML: roll.toAnchor().outerHTML,
        penalty: this.actor.system.details.level.value >= 5 ? '-2d' : '-1d'
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isDrawAgroCheck': true,
      'dcc.RollType': 'DrawAgroCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: disrespectMessage,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Gnome.DrawAgro')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }
}
export default XCCActorSheetGnome
