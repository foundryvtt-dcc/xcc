/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { globals } from './settings.js'

class XCCActorSheetJammer extends DCCActorSheet {
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

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getJammerACBonus', function (actor) {
      let bonus = 0

      // Add luck modifier if positive
      const luckMod = actor.system?.abilities?.lck?.mod || 0
      if (luckMod > 0) {
        bonus += luckMod
      }

      // Add current level if chosen weapon is equipped
      if (actor.system?.class?.chosenWeaponEquipped) {
        const level = actor.system?.details?.level.value || 0
        bonus += level
      }

      return '+' + bonus
    })

    Handlebars.registerHelper('getJammerPerformanceBonus', function (actor) {
      let bonus = 0

      // Add personality modifier
      const perMod = actor.system?.abilities?.per?.mod || 0
      bonus += perMod

      // Add class level
      const level = actor.system?.details?.level?.value || 0
      bonus += level

      return bonus >= 0 ? '+' + bonus : bonus
    })

    // Handle special grapple chat message
    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      // Only for GMs to avoid shenanigans
      if (!game.user.isGM) {
        console.log('Not GM, skipping')
        return
      }

      // Check if it's a lionize check
      if (message.getFlag('dcc', 'isLionizeCheck')) {
        // Add event delegation for the arrows
        const lionizeTable = html.querySelector('.xcc-lionize')
        if (lionizeTable) {
          console.log('Found lionize table, adding event listeners')
          lionizeTable.addEventListener('click', (event) => {
            if (event.target.classList.contains('lionize-shift-up')) {
              XCCActorSheetJammer._onNextLionizeResult.call(message, event)
            } else if (event.target.classList.contains('lionize-shift-down')) {
              XCCActorSheetJammer._onPreviousLionizeResult.call(message, event)
            }
          })
        }
      }
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
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate base bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0

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
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate performance check bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0

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

    let lionizeResult = ''
    let rollTable = null
    let tableResults = []

    const lionizeTableName = 'Table 1-10: Jammer Lionization'
    const lionizePackName = 'xcc-core-book.xcc-core-tables'
    const pack = game.packs.get(lionizePackName)
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(lionizeTableName))
      if (entry.length > 0) {
        rollTable = await pack.getDocument(entry[0]._id)
        const results = rollTable.getResultsForRoll(roll.total)
        if (results && results.length > 0) {
          tableResults = results
          lionizeResult = results[0].description
        }
      }
    }

    if (lionizeResult) {
      await foundry.applications.ux.TextEditor.enrichHTML(lionizeResult)
    }
    // Add DCC flags
    const flags = {
      'dcc.isNoHeader': true,
      'dcc.isLionizeCheck': true,
      'dcc.RollType': 'LionizeCheck'
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Jammer.Lionize')}`
    }

    let messageContent = ''

    // If we have table results, use the lionize template
    if (rollTable && tableResults.length > 0) {
      const emoteMessage = game.i18n.format(
        'XCC.Jammer.LionizeEmote',
        {
          actorName: this.actor.name,
          rollHTML: roll.toAnchor().outerHTML
        }
      )

      const lionizeDuration = game.i18n.format(
        'XCC.Jammer.LionizeDuration',
        {
          duration: this.actor.system.details.level.value || 1
        }
      )

      messageContent = await foundry.applications.handlebars.renderTemplate(globals.templatesPath + 'chat-card-lionize-result.html', {
        results: tableResults.map(r => foundry.utils.duplicate(r)),
        table: rollTable,
        actorName: this.actor.name,
        emoteMessage,
        durationText: lionizeDuration
      })
    }

    messageData.content = messageContent
    await ChatMessage.create(messageData)
    return roll
  }

  static async rollDisrespect (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate performance check bonus
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0

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
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Jammer.Disrespect')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  /**
   * Event handler for adjusting a lionize result down
   * @param {Object} event      The originating click event
   */
  static async _onPreviousLionizeResult (event) {
    XCCActorSheetJammer._adjustLionizeResult.bind(this)(event, -1)
  }

  /**
   * Event handler for adjusting a lionize result up
   * @param {Object} event      The originating click event
   */
  static async _onNextLionizeResult (event) {
    XCCActorSheetJammer._adjustLionizeResult.bind(this)(event, +1)
  }

  /**
   * Adjust a Lionize check result by moving the result up or down
   * @param {Object} event      The originating click event
   * @param {Object} direction  Adjust up (+1) or down (-1)
   */
  static async _adjustLionizeResult (event, direction) {
    // Pull out the relevant data from the existing HTML
    const tableId = event.target.parentElement.parentElement.parentElement.parentElement.getAttribute('data-table-id')
    const tableCompendium = event.target.parentElement.parentElement.parentElement.parentElement.getAttribute('data-table-compendium')
    const resultId = event.target.parentElement.parentElement.getAttribute('data-result-id')

    // Lookup the appropriate table
    let rollTable
    if (tableCompendium) {
      const pack = game.packs.get(tableCompendium)
      if (pack) {
        const entry = pack.index.get(tableId)
        rollTable = await pack.getDocument(entry._id)
      }
    }
    if (!rollTable) {
      rollTable = game.tables.get(tableId)
    }

    if (rollTable) {
      // Find the next result up or down, if available
      const entry = rollTable.results.get(resultId)
      const newResultRoll = (direction > 0) ? (entry.range[1]) + 1 : (entry.range[0] - 1)
      const newResults = rollTable.getResultsForRoll(newResultRoll)

      if (newResults && newResults.length > 0) {
        // Extract the existing emote message from the current HTML to preserve it
        const lionizeContainer = event.target.closest('.xcc-lionize')
        const existingEmoteElement = lionizeContainer.querySelector('.lionize-emote')
        const existingEmoteMessage = existingEmoteElement ? existingEmoteElement.innerHTML : null

        // Extract the existing duration values from the data attributes to preserve them
        const existingDurationText = lionizeContainer.getAttribute('data-duration-text')

        const newContent = await foundry.applications.handlebars.renderTemplate(globals.templatesPath + 'chat-card-lionize-result.html', {
          results: newResults.map(r => foundry.utils.duplicate(r)),
          rollHTML: rollTable.displayRoll ? await this.rolls[0].render() : null,
          table: rollTable,
          emoteMessage: existingEmoteMessage,
          durationText: existingDurationText
        })

        this.update({ content: newContent })
      }
    }
  }
}

export default XCCActorSheetJammer
