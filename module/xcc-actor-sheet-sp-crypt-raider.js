/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetSpCryptRaider extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollTurnUnholy: this.rollTurnUnholy,
      rollUnholyCritical: this.rollUnholyCritical,
      rollUnholyCriticalBackstab: this.rollUnholyCriticalBackstab
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
    cryptRaider: {
      id: 'sp-crypt-raider',
      template: globals.templatesPath + 'actor-partial-sp-crypt-raider.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'sp-crypt-raider', group: 'sheet', label: 'XCC.Specialist.CryptRaider.ActorSheetCryptRaider' }
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
    // Crypt Raider: Dark knowledge and Detect secret doors skill
    if (this.actor.system.class.className === 'cryptraider') {
      this.actor.system.skills.darkKnowledge = {
        value: this.actor.system.abilities.int.mod,
        label: 'XCC.Specialist.CryptRaider.DarkKnowledge',
        die: 'd24'
      }
      console.log('SETTING Crypt Raider SECRET DOORS')
      this.actor.system.skills.detectSecretDoors = {
        value: this.actor.system.details.level.value,
        ability: 'int',
        label: 'XCC.DetectSecretDoors',
        die: 'd20'
      }
    }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getDarkKnowledge', function (actor) {
      return 'd24' + ensurePlus(actor.system.abilities.int.mod)
    })
    Handlebars.registerHelper('getUnholyCritDie', function (actor) {
      return game.dcc.DiceChain.bumpDie(actor.system.attributes.critical.die, 1)
    })
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'sp-crypt-raider') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Specialist.CryptRaider',
        'system.class.className': 'cryptraider',
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Specialist.CryptRaider.ClassLink')),
        'system.details.sheetClass': 'sp-crypt-raider',
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

  static async rollTurnUnholy (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate Holy Act bonus (Personality + Level)
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0

    // Create terms
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: this.actor.system.class?.turnUndeadDie || 'd20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Specialist.CryptRaider.TurnUnholy'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Specialist.CryptRaider.TurnUnholy')
      },
      options
    )

    // Create and evaluate the roll
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    roll.lowerThreshold = this.actor.system.class.disapproval
    await roll.evaluate()

    // Check for disapproval - if it returns true, we should return early
    if (await this.checkDisapprovalAndHandle(roll)) {
      return
    }

    // Find the turn unholy result
    let resultHTML = game.i18n.localize('XCC.NotFound')
    const turnUnholyTableName = 'Table 4-4: Turn Unholy Result by HD'
    const pack = game.packs.get('xcc-core-book.xcc-core-tables')
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(turnUnholyTableName))
      if (entry.length > 0) {
        const rollTable = await pack.getDocument(entry[0]._id)
        const results = rollTable.getResultsForRoll(roll.total)
        if (results && results.length > 0) {
          resultHTML = results[0].description
        }
      }
    }
    // Table entry found, convert to HTML
    resultHTML = await foundry.applications.ux.TextEditor.enrichHTML(resultHTML)

    // Add DCC flags
    const flags = {
      'dcc.isTurnUnholyCheck': true,
      'dcc.RollType': 'TurnUnholyCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.actor.name} ${game.i18n.localize('XCC.Messenger.TurnUnholyFlavor')} ${roll.toAnchor().outerHTML}:<br>${resultHTML}${game.i18n.localize('XCC.CoreBook.Footnotes.TurnUnholy')}`,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags
    }
    // Create the chat message
    await ChatMessage.create(messageData)
  }

  async checkDisapprovalAndHandle (roll) {
    // Check for disapproval
    const automate = game.settings.get(globals.id, 'automateMessengerDisapproval')
    const naturalRoll = roll.terms[0].results[0].result
    if (automate) {
      if (naturalRoll <= this.actor.system.class.disapproval) {
        // Trigger disapproval and return without checking the result
        await this.showDiapproval(roll)
        await this.actor.applyDisapproval()
        return true // Indicates disapproval triggered, should return early
      } else if (roll.total <= 11 && automate) {
        // Increase disapproval range and continue with the result
        await this.actor.applyDisapproval()
        return false // Continue processing
      }
    }
    return false // No disapproval, continue processing
  }

  async showDiapproval (roll) {
    // Add DCC flags
    const flags = {
      'dcc.isTurnUnholyCheck': true,
      'dcc.RollType': 'Disapproval',
      'dcc.isNoHeader': true
    }

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: game.i18n.format('XCC.Specialist.CryptRaider.DisapprovalFlavor', { actor: this.actor.name, roll: roll.terms[0].results[0].result }),
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags
    }

    // Create the chat message
    await ChatMessage.create(messageData)
  }

  static async rollUnholyCritical (event, target) {
    await XCCActorSheetSpCryptRaider.rollCritDieModified(event, target, this, false)
  }

  static async rollUnholyCriticalBackstab (event, target) {
    await XCCActorSheetSpCryptRaider.rollCritDieModified(event, target, this, true)
  }

  static async rollCritDieModified (event, target, sheet, isBackstab) {
    const options = DCCActorSheet.fillRollOptions(event)
    const oldDie = sheet.actor.system.attributes.critical.die
    const oldTable = sheet.actor.system.attributes.critical.table
    if (isBackstab) {
      sheet.actor.system.attributes.critical.die = game.dcc.DiceChain.bumpDie(oldDie, 1)
    }
    sheet.actor.system.attributes.critical.table = 'III'
    await sheet.actor.rollCritical(options)
    sheet.actor.system.attributes.critical.die = oldDie
    sheet.actor.system.attributes.critical.table = oldTable
  }
}

export default XCCActorSheetSpCryptRaider
