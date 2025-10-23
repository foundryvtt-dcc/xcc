/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetJammer extends XCCActorSheet {
  static DEFAULT_OPTIONS = {
    position: {
      height: 650
    },
    actions: {
      rollPerformanceCheck: this.rollPerformanceCheck,
      rollDevastatingAttackDamage: this.rollDevastatingAttackDamage,
      rollLionize: this.rollLionize,
      rollDisrespect: this.rollDisrespect
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
    jammer: {
      id: 'jammer',
      template: globals.templatesPath + 'actor-partial-jammer.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'jammer', group: 'sheet', label: 'XCC.Jammer.ActorSheetJammer' }
      ]
    }
  }

  getJammerACBonus () {
    let bonus = 0

    // Add luck modifier if positive
    const luckMod = this.actor.system?.abilities?.lck?.mod || 0
    if (luckMod > 0) {
      bonus += luckMod
    }

    let isArmorTooHeavy = false
    for (const armorItem of this.actor.itemTypes.armor) {
      if (armorItem.system.equipped && parseInt(armorItem.system.checkPenalty) <= -4) {
        isArmorTooHeavy = true
        break
      }
    }

    // Add current level if chosen weapon is equipped
    if (this.actor.system?.class?.chosenWeaponEquipped && !isArmorTooHeavy) {
      const level = this.actor.system?.details?.level.value || 0
      bonus += level
    }

    return '+' + bonus
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getJammerACBonus', function (actor) {
      return actor.sheet.getJammerACBonus()
    })

    Handlebars.registerHelper('getJammerPerformanceBonus', function (actor) {
      let bonus = 0

      // Add personality modifier
      const perMod = actor.system?.abilities?.per?.mod || 0
      bonus += perMod

      // Add class level
      const level = actor.system?.details?.level?.value || 0
      bonus += level

      // Add luck modifier
      const lckMod = actor.system?.abilities?.lck?.mod || 0
      bonus += lckMod

      return bonus >= 0 ? '+' + bonus : bonus
    })
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'jammer') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Jammer.ClassLink'), { relativeTo: this.actor })
      })
    }

    // Update jammer AC bonus
    await this.actor.update({
      'system.attributes.ac.otherMod': this.getJammerACBonus()
    })

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'jammer') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Jammer',
        'system.class.className': 'jammer',
        'system.details.sheetClass': 'jammer',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }

    return context
  }

  static async rollDevastatingAttackDamage (event, target) {
    event.preventDefault()

    // Get the devastating attack damage formula from the actor
    const damageFormula = this.actor.system.class?.devastatingAttack

    if (!damageFormula || !Roll.validate(damageFormula)) {
      ui.notifications.warn('Invalid devastating attack damage formula')
      return
    }

    // Create the damage roll
    const damageRoll = await new Roll(damageFormula, this.actor.getRollData()).evaluate()

    // Ensure minimum 1 damage
    if (damageRoll.total < 1) {
      damageRoll._total = 1
    }

    // Create the chat message
    const speaker = ChatMessage.getSpeaker({ actor: this.actor })
    const flavor = `${this.actor.name} - Devastating Attack Damage`

    const messageData = {
      user: game.user.id,
      speaker,
      flavor,
      rolls: [damageRoll],
      sound: CONFIG.sounds.dice,
      flags: {
        'dcc.isDamageRoll': true,
        'dcc.isDevastatingAttack': true
      }
    }

    // Send to chat
    await ChatMessage.create(messageData)

    return damageRoll
  }

  static async rollPerformanceCheck (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = XCCActorSheet.fillRollOptions(event)

    // Calculate base bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0
    bonus += this.actor.system?.abilities?.lck?.mod || 0

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Jammer.PerformanceCheck'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Jammer.PerformanceCheck')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Add DCC flags
    const flags = {
      'dcc.isPerformanceCheck': true,
      'dcc.RollType': 'SkillCheck'
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Send to chat using DCC system
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Jammer.PerformanceCheck')}`,
      flags
    })

    return roll
  }

  static async rollLionize (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = XCCActorSheet.fillRollOptions(event)

    // Calculate performance check bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0
    bonus += this.actor.system?.abilities?.lck?.mod || 0

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Jammer.PerformanceCheck'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Jammer.Lionize')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    const lionizeTableName = 'Table 1-10: Jammer Lionization'
    const lionizePackName = 'xcc-core-book.xcc-core-tables'

    await this.displayAdjustableMessage('Lionize', 'XCC.Jammer.LionizeEmote', 'XCC.Jammer.Lionize', lionizeTableName, lionizePackName, roll, { duration: this.actor.system.details.level.value || 1 })

    return roll
  }

  static async rollDisrespect (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = XCCActorSheet.fillRollOptions(event)

    // Calculate performance check bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0
    bonus += this.actor.system?.abilities?.lck?.mod || 0

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Jammer.PerformanceCheck'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Jammer.Disrespect')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Calculate duration: level + PER mod, minimum 1
    const level = this.actor.system?.details?.level?.value || 1
    const perMod = this.actor.system?.abilities?.per?.mod || 0
    const duration = Math.max(1, level + perMod)

    // Calculate disrespect penalty (assuming -1d for now, can be made configurable)
    const disrespectPenalty = this.actor.system.class?.disrespectPenalty || 0

    // Create the disrespect message
    const disrespectMessage = game.i18n.format(
      'XCC.Jammer.DisrespectMessage',
      {
        actorName: this.actor.name,
        rollResult: roll.total,
        rollHTML: roll.toAnchor().outerHTML,
        disrespectPenalty,
        duration
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isDisrespectCheck': true,
      'dcc.RollType': 'DisrespectCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: disrespectMessage,
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Jammer.Disrespect')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }
}

export default XCCActorSheetJammer
