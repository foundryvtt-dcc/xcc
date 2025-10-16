/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetMessenger extends DCCActorSheet {
  static DEFAULT_OPTIONS = {
    position: {
      height: 650
    },
    actions: {
      rollHolyAct: this.rollHolyAct,
      rollLayOnHands: this.rollLayOnHands,
      rollBless: this.rollBless,
      rollTurnUnholy: this.rollTurnUnholy,
      rollSummonWeapon: this.rollSummonWeapon,
      rollFreeAttack: this.rollFreeAttack,
      rollFreeAttackWithScourge: this.rollFreeAttackWithScourge,
      rollWeaponAttackWithScourge: this.rollWeaponAttackWithScourge,
      rollDivineAid: this.rollDivineAid
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
    messenger: {
      id: 'messenger',
      template: globals.templatesPath + 'actor-partial-messenger.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'messenger', group: 'sheet', label: 'XCC.Messenger.ActorSheetMessenger' }
      ]
    }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getMessengerHolyActBonus', function (actor, luckModified = false) {
      let bonus = 0

      // Add personality modifier
      const perMod = actor.system?.abilities?.per?.mod || 0
      bonus += perMod

      // Add luck modifier if applicable
      if (luckModified) {
        const luckMod = actor.system?.abilities?.lck?.mod || 0
        bonus += luckMod
      }

      // Add class level
      const level = actor.system?.details?.level?.value || 0
      bonus += level

      return bonus >= 0 ? '+' + bonus : bonus
    })
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'messenger') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Messenger.ClassLink'), { relativeTo: this.actor })
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'messenger') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Messenger',
        'system.class.className': 'messenger',
        'system.details.sheetClass': 'messenger',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false,
        'system.config.showBackstab': false
      })
    }

    return context
  }

  getFreeAttackToHit () {
    const lck = this.actor.system.abilities.lck.mod || 0
    const str = this.actor.system.abilities.str.mod || 0
    const ab = parseInt(this.actor.system.details.attackBonus) || 0
    return ensurePlus(ab + str + lck)
  }

  getFreeAttackDamage () {
    const formula = this.actor.system.class.freeAttackDamage
    return formula
  }

  async checkDisapprovalAndHandle (roll) {
    // Check for disapproval
    const automate = game.settings.get(globals.id, 'automateMessengerDisapproval')
    const naturalRoll = roll.terms[0].results[0].result
    if (automate) {
      if (naturalRoll <= this.actor.system.class.disapproval) {
        // Trigger disapproval and return without checking the result
        await this.showDiapproval(roll)
        await this.actor.rollDisapproval(naturalRoll)
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
      content: game.i18n.format('XCC.Messenger.DisapprovalFlavor', {
        actor: this.actor.name,
        roll: roll.terms[0].results[0].result
      }),
      rolls: [roll],
      sound: null,
      flags
    }

    // Create the chat message
    await ChatMessage.create(messageData)
  }

  static async rollHolyAct (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate holy act bonus (Personality + Level)
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
        label: game.i18n.localize('XCC.Messenger.HolyAct'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.HolyAct')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Check for disapproval - if it returns true, we should return early
    if (await this.checkDisapprovalAndHandle(roll)) {
      return
    }

    // Add DCC flags
    const flags = {
      'dcc.isHolyActCheck': true,
      'dcc.RollType': 'HolyActCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Send to chat using DCC system
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Messenger.HolyAct')}`,
      flags
    })

    return roll
  }

  static async rollDivineAid (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate holy act bonus (Personality + Level)
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
        label: game.i18n.localize('XCC.Messenger.DivineAid'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.DivineAid')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Check for disapproval - if it returns true, we should return early
    if (await this.checkDisapprovalAndHandle(roll, 'Divine Aid')) {
      // Apply disapproval increase of 10 after rolling Divine Aid
      await this.actor.applyDisapproval(10)
      return
    }

    // Find the divine aid result
    let resultHTML = game.i18n.localize('XCC.NotFound')
    const divineAidTableName = 'Table 10-2: Divine Aid Check DCs'
    const pack = game.packs.get('xcc-core-book.xcc-core-tables')
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(divineAidTableName))
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

    // Roll d10 for Deity Requests table
    const deityRequestRoll = await new Roll('1d10').evaluate()
    let deityRequestHTML = game.i18n.localize('XCC.NotFound')
    const deityRequestTableName = 'Table 10-1: Deity Requests'
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(deityRequestTableName))
      if (entry.length > 0) {
        const rollTable = await pack.getDocument(entry[0]._id)
        const results = rollTable.getResultsForRoll(deityRequestRoll.total)
        if (results && results.length > 0) {
          deityRequestHTML = results[0].description
        }
      }
    }
    // Deity request table entry found, convert to HTML
    await foundry.applications.ux.TextEditor.enrichHTML(deityRequestHTML)

    // Add DCC flags
    const flags = {
      'dcc.isDivineAidCheck': true,
      'dcc.RollType': 'DivineAidCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${game.i18n.format('XCC.Messenger.DivineAidFlavor', {
        roll: roll.toAnchor().outerHTML,
        actor: this.actor.name
      })} ${resultHTML}${game.i18n.localize('XCC.Messenger.DeityRequest')}`,
      rolls: [roll, deityRequestRoll],
      sound: CONFIG.sounds.dice,
      flags
    }

    // Apply disapproval increase of 10 after rolling Divine Aid
    await this.actor.applyDisapproval(10)

    // Create the chat message
    await ChatMessage.create(messageData)
    return roll
  }

  static async rollLayOnHands (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Calculate holy act bonus (Personality + Level)
    let bonus = this.actor.system?.abilities?.per?.mod || 0
    bonus += this.actor.system?.details?.level?.value || 0
    bonus += this.actor.system?.abilities?.lck?.mod || 0 // Add any specific lay on hands bonus

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Messenger.LayOnHands'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.LayOnHands')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Check for disapproval - if it returns true, we should return early
    if (await this.checkDisapprovalAndHandle(roll)) {
      return
    }

    let layOnHandsResult = ''
    let tableResult = 'No table result found'
    let rollTable = null

    const layOnHandsTableName = 'Table 1-12: Lay on Hands'
    const messengerPackName = 'xcc-core-book.xcc-core-tables'
    console.log(`Looking for pack: ${messengerPackName}`)
    const pack = game.packs.get(messengerPackName)
    if (pack) {
      console.log(`Found pack: ${messengerPackName}`)
      const entry = pack.index.filter((entity) => entity.name.startsWith(layOnHandsTableName))
      if (entry.length > 0) {
        console.log(`Found lay on hands table: ${layOnHandsTableName}`)
        rollTable = await pack.getDocument(entry[0]._id)
        const results = rollTable.getResultsForRoll(roll.total)
        if (results && results.length > 0) {
          layOnHandsResult = results[0].description + game.i18n.localize('XCC.Messenger.LayOnHandsAlternate')
          console.log(`Lay on hands result found: ${layOnHandsResult}`)
        }
      }
    }

    if (layOnHandsResult) {
      const tableText = await foundry.applications.ux.TextEditor.enrichHTML(layOnHandsResult)
      tableResult = tableText
    }

    // Add DCC flags
    const flags = {
      'dcc.isLayOnHandsCheck': true,
      'dcc.RollType': 'LayOnHandsCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.actor.name} ${game.i18n.localize('XCC.Messenger.LayOnHandsFlavor')} ${roll.toAnchor().outerHTML}: ${tableResult}`,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Messenger.LayOnHands')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  static async rollBless (event, target) {
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
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Messenger.Blessing'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.Blessing')
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

    // Find the bless result
    let resultHTML = game.i18n.localize('XCC.NotFound')
    const blessingTableName = 'Table 1-13: Blessing'
    const pack = game.packs.get('xcc-core-book.xcc-core-tables')
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(blessingTableName))
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
      'dcc.isBlessingCheck': true,
      'dcc.RollType': 'BlessingCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.actor.name} ${game.i18n.localize('XCC.Messenger.BlessFlavor')} ${roll.toAnchor().outerHTML}:<br>${resultHTML}`,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags
    }
    // Create the chat message
    await ChatMessage.create(messageData)
  }

  static async rollSummonWeapon (event, target) {
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
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Messenger.SummonWeapon'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.SummonWeapon')
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

    // Find the summon weapon result
    let resultHTML = game.i18n.localize('XCC.NotFound')
    const summonWeaponTableName = 'Table X: Summon Weapon'
    const pack = game.packs.get('xcc-core-book.xcc-core-tables')
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(summonWeaponTableName))
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
      'dcc.isSummonWeaponCheck': true,
      'dcc.RollType': 'SummonWeaponCheck',
      'dcc.isNoHeader': true
    }

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.actor.name} ${game.i18n.localize('XCC.Messenger.SummonWeaponFlavor')} ${roll.toAnchor().outerHTML}:<br>${resultHTML}`,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags
    }
    // Create the chat message
    await ChatMessage.create(messageData)
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
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.Messenger.TurnUnholy'),
        formula: bonus >= 0 ? `+${bonus}` : `${bonus}`
      }
    ]

    // Roll options
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Messenger.TurnUnholy')
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

  static async rollWeaponAttackWithScourge (event, target) {
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const weapon = this.actor.items.find(i => i.id === itemId)
    if (weapon) {
      const scourgeAmount = this.actor.system.class.scourge || 0
      const evilCritRange = this.actor.system.class.critEvilRange || 20
      const oldDamage = weapon.system.damage
      const oldCrit = weapon.system.critRange
      // Adjust crit range
      weapon.system.critRange = Math.min(evilCritRange, weapon.system.critRange)
      // Add scourge damage to the formula
      weapon.system.damage = weapon.system.damage ? `${weapon.system.damage}+${scourgeAmount}` : `${scourgeAmount}`
      // Add hook to restore original weapon data
      Hooks.once('dcc.rollWeaponAttack', async (rolls, messageData) => {
        if (weapon && messageData.system.weaponId === weapon.id) {
          weapon.system.damage = oldDamage
          weapon.system.critRange = oldCrit
        }
      })
      // Call the original roll weapon attack action
      await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
    } else { console.warn(`Weapon not found: ${itemId}`) }
  }

  // Prepare and roll a fake weapon with modified toHit, damage and crit rolls
  static async rollFreeAttackWithScourge (event, target) {
    // Make a temporary fake weapon
    const fakeId = DCCActorSheet.findDataset(target, 'itemId') || ''
    const weapon = {
      key: fakeId,
      value: {
        name: game.i18n.localize('XCC.Messenger.FreeAttack').toLowerCase(),
        system: {
          actionDie: '1d14',
          damage: this.getFreeAttackDamage() + ensurePlus(this.actor.system.class.scourge || 0),
          critRange: this.actor.system.class.critEvilRange || 20,
          toHit: this.getFreeAttackToHit()
        },
        id: fakeId,
        _id: fakeId
      }
    }
    // Add the fake weapon to the actor's items
    this.actor.items.set(weapon.key, weapon.value, { modifySource: false })
    // Pass the fake weapon
    await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
    // Remove the fake weapon from items after we're done
    this.actor.items.delete(weapon.id, { modifySource: false })
  }

  static async rollFreeAttack (event, target) {
    // Make a temporary fake weapon
    const fakeId = DCCActorSheet.findDataset(target, 'itemId') || ''
    const weapon = {
      key: fakeId,
      value: {
        name: game.i18n.localize('XCC.Messenger.FreeAttack').toLowerCase(),
        system: {
          actionDie: '1d14',
          damage: this.getFreeAttackDamage(),
          critRange: this.actor.system.class.critEvilRange || 20,
          toHit: this.getFreeAttackToHit()
        },
        id: fakeId,
        _id: fakeId
      }
    }
    // Add the fake weapon to the actor's items
    this.actor.items.set(weapon.key, weapon.value, { modifySource: false })
    // Pass the fake weapon
    await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
    // Remove the fake weapon from items after we're done
    this.actor.items.delete(weapon.id, { modifySource: false })
  }

  _onRender (context, options) {
    // Add another rollable div to each attack-buttons section
    const attackButtonsElements = this.parts.equipment.querySelectorAll('.attack-buttons')
    attackButtonsElements.forEach(attackButtons => {
      const newRollableDiv = document.createElement('div')
      newRollableDiv.className = 'rollable scourge-button icon-filter'
      newRollableDiv.setAttribute('data-action', 'rollWeaponAttackWithScourge')
      newRollableDiv.setAttribute('data-drag', 'false')
      newRollableDiv.setAttribute('title', game.i18n.localize('XCC.Messenger.ScourgeTip'))
      newRollableDiv.setAttribute('draggable', 'false')
      newRollableDiv.innerHTML = '&nbsp;'
      attackButtons.appendChild(newRollableDiv)
    })

    // Add the Divine Strike weapon to the equipment section
    const weaponListHeader = this.parts.equipment.querySelector('.weapon-list-header')
    if (weaponListHeader) {
      weaponListHeader.outerHTML += `
        <li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.messenger.divineStrike">
            <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
            <img class="icon-filter" src="` + globals.imagesPath + `game-icons-net/zeus-sword.svg" title="${game.i18n.localize('XCC.Messenger.FreeAttack')}" alt="${game.i18n.localize('XCC.Messenger.FreeAttack')}" width="22" height="22">
            <div class="attack-buttons">
                <div class="rollable free-attack-button icon-filter" data-action="rollFreeAttack" data-drag="false" title="${game.i18n.localize('DCC.Roll')}" draggable="false">&nbsp;</div>
                <div class="rollable scourge-button icon-filter" data-action="rollFreeAttackWithScourge" data-drag="false" title="${game.i18n.localize('XCC.Messenger.ScourgeTip')}" draggable="false">&nbsp;</div>
            </div>
            <input class="weapon-name" type="text" value="${game.i18n.localize('XCC.Messenger.FreeAttack')}" readonly="">
            <input class="disabled" type="text" value="${this.getFreeAttackToHit()}" readonly="">
            <div><input class="weapon-damage compound-damage-left" type="text" value="${this.getFreeAttackDamage()}" name="system.class.freeAttackDamage" data-dtype="String"><input type="text" class="disabled compound-damage-right" value="${ensurePlus(this.actor.system.abilities.str.mod)}" disabled=""></div>
            <input class="weapon-notes disabled" type="text" value="${game.i18n.localize('XCC.Messenger.FreeAttackNotes')}" readonly="">
            <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
            <div class="disabled">-</div>
        </li>`
    }

    super._onRender(context, options)
  }
}

export default XCCActorSheetMessenger
