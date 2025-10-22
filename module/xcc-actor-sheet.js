/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import DiceChain from '/systems/dcc/module/dice-chain.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'
import XCCSpellCheckConfig from './xcc-spell-check-config.js'
import { calculateSpellCheckBonus } from './xcc-utils.js'

// Extends the DCCActorSheet and adds 'XCrawl' tab and its functionality.
export class XCCActorSheet extends DCCActorSheet {
  // Add rewards tab.
  static END_TABS = {
    sheet: {
      tabs:
        [
          { id: 'rewards', group: 'sheet', label: 'XCC.Rewards.RewardsTitle' },
          { id: 'notes', group: 'sheet', label: 'DCC.Notes' }
        ]
    }
  }

  // Add rewards html template.
  static PARTS = foundry.utils.mergeObject(DCCActorSheet.PARTS, {
    rewards: {
      id: 'rewards',
      template: globals.templatesPath + 'actor-partial-rewards.html'
    }
  })

  // Define actions for wealth management and sponsorship creation.
  static async increaseWealth (event, target) {
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const item = this.actor.items?.get(itemId)
    if (!item) {
      const currentWealth = this.actor.system.rewards?.baseWealth || 11
      await this.actor.update({
        'system.rewards.baseWealth': currentWealth + 1
      })
    } else {
      const wealth = item.system.rewards?.wealth || 0
      item.update({ 'system.rewards.wealth': wealth + 1 })
    }
  }

  static async decreaseWealth (event, target) {
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const item = this.actor.items?.get(itemId)
    if (!item) {
      const currentWealth = this.actor.system.rewards?.baseWealth || 11
      await this.actor.update({
        'system.rewards.baseWealth': Math.max(0, currentWealth - 1)
      })
    } else {
      const wealth = item.system.rewards?.wealth || 0
      item.update({ 'system.rewards.wealth': wealth - 1 })
    }
  }

  static async sponsorshipCreate (event, target) {
    const type = 'xcc-core-book.sponsorship'
    // Grab any data associated with this control.
    const system = foundry.utils.duplicate(target.dataset)
    // Initialize a default name.
    const name = game.i18n.localize('XCC.Rewards.NewOffer')
    system.rewards = {
      benefit: game.i18n.localize('XCC.Rewards.NewBenefit'),
      wealth: 1
    }

    const itemData = {
      name,
      img: globals.imagesPath + 'game-icons-net/money-stack.svg',
      type,
      system
    }
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system.type

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments('Item', [itemData])
  }

  // Define action for rolling a fame check
  static async rollFameCheck (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)
    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('XCC.Rewards.PercentileDie'),
        formula: '1d100'
      }]
    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Rewards.FameCheck')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()
    const fame = this.actor.system?.rewards?.fame || 0
    // Determine the result key based on the roll outcome
    let resultKey = 'XCC.Rewards.FameCheckFailure'
    if (roll.total <= fame - 30) {
      resultKey = 'XCC.Rewards.FameCheckBigSuccess'
    } else if (roll.total <= fame - 10) {
      resultKey = 'XCC.Rewards.FameCheckNormalSuccess'
    } else if (roll.total <= fame) {
      resultKey = 'XCC.Rewards.FameCheckSmallSuccess'
    }

    // Create the grandstanding message
    const fameMessage = game.i18n.format(
      'XCC.Rewards.FameCheckMessage',
      {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        result: game.i18n.localize(resultKey),
        fame
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isFameCheck': true,
      'dcc.RollType': 'FameCheck',
      'dcc.isNoHeader': true
    }

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: fameMessage,
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Rewards.FameCheck')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  // Define action for rolling a wealth check
  static async rollWealthCheck (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)
    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('XCC.Rewards.PercentileDie'),
        formula: '1d100'
      }]
    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Rewards.WealthCheck')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()
    const wealth = this.actor.system?.rewards?.totalWealth || 0
    // Determine the result key based on the roll outcome
    let resultKey = 'XCC.Rewards.WealthCheckFailure'
    if (roll.total <= wealth - 30) {
      resultKey = 'XCC.Rewards.WealthCheckBigSuccess'
    } else if (roll.total <= wealth - 10) {
      resultKey = 'XCC.Rewards.WealthCheckNormalSuccess'
    } else if (roll.total <= wealth) {
      resultKey = 'XCC.Rewards.WealthCheckSmallSuccess'
    }

    // Create the wealth message
    const wealthMessage = game.i18n.format(
      'XCC.Rewards.WealthCheckMessage',
      {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        result: game.i18n.localize(resultKey),
        wealth
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isWealthCheck': true,
      'dcc.RollType': 'WealthCheck',
      'dcc.isNoHeader': true
    }

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: wealthMessage,
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Rewards.WealthCheck')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  // Define action for rolling grandstanding check.
  static async rollGrandstandingCheck (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    // Get fame modifier
    const fame = this.actor.system?.rewards?.fame || 0
    let fameMod = 0
    let fameDie = (this.actor.system.details.sheetClass === 'sp-crypt-raider') ? '1d16' : '1d20'
    if (fame >= 81) {
      fameDie = DiceChain.bumpDie(fameDie, 2)
    } else if (fame >= 61) {
      fameDie = DiceChain.bumpDie(fameDie, 1)
    } else if (fame >= 41) {
      fameMod = 2
    } else if (fame >= 21) {
      fameMod = 1
    }

    // Create terms for the DCC roll system
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: fameDie
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('DCC.Modifier'),
        formula: ensurePlus(this.actor.system.abilities.per.mod + this.actor.system.details.level.value + fameMod)
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.GrandstandingCrowd'),
        formula: '+14'
      }
    ]

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Grandstanding')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    const crowdDC = parseInt(roll.terms[3].operator + roll.terms[4].number)
    roll.terms = roll.terms.slice(0, 3)
    await roll.evaluate()
    // Create the grandstanding message
    const grandstandingMessage = game.i18n.format(
      'XCC.GrandstandingMessage',
      {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        result: roll.total >= crowdDC ? game.i18n.localize('XCC.GrandstandingSuccess') : game.i18n.localize('XCC.GrandstandingFailure'),
        crowd: crowdDC
      }
    )

    // Add DCC flags
    const flags = {
      'dcc.isGrandstandingCheck': true,
      'dcc.RollType': 'GrandstandingCheck',
      'dcc.isNoHeader': true
    }

    // Create message data
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: grandstandingMessage,
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Grandstanding')}`
    }

    await ChatMessage.create(messageData)

    // If we succeeded, increase fame by 1
    if (roll.total >= crowdDC) {
      this.actor.update({ 'system.rewards.fame': (this.actor.system.rewards?.fame || 0) + 1 })
    }

    return roll
  }

  static async configureSpellCheck (event, target) {
    event.preventDefault()
    await new XCCSpellCheckConfig({
      document: this.actor,
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2
      }
    }).render(true)
  }

  static async rollSpellMisfire (event, target) {
    const options = DCCActorSheet.fillRollOptions(event)
    const dataset = target.parentElement.dataset
    if (dataset.itemId) {
      // Roll through a spell item
      const item = this.actor.items.find(i => i.id === dataset.itemId)
      if (item.type !== 'spell') { return }

      const actor = item.actor
      if (!actor) { return }

      const misfirePackName = game.settings.get('dcc', 'spellSideEffectsCompendium') || 'xcc-core-book.xcc-core-spell-side-effect-tables'
      const misfireTableName = `${item.name} Misfire`
      const pack = game.packs.get(misfirePackName)
      // Lookup the misfire table if available
      let misfireResult = null
      if (pack) {
        const entry = pack.index.find((entity) => entity.name === misfireTableName)
        if (entry) {
          const table = await pack.getDocument(entry._id)
          const terms = [
            {
              type: 'Die',
              formula: table.formula
            }
          ]
          let roll = await game.dcc.DCCRoll.createRoll(terms, {}, options)
          misfireResult = await table.draw({ roll })
          // Local Lookup
          if (!misfireResult) {
            const table = game.tables.getName(misfireTableName)
            if (table) {
              misfireResult = await table.draw({ roll })
            }
          }
          // Grab the result from the table if present
          if (misfireResult) {
            roll = misfireResult.roll
          } else {
            // Fall back to displaying just the roll
            await roll.evaluate()
            roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor }),
              flavor: game.i18n.localize('XCC.MisfireRoll'),
              flags: {
                'dcc.RollType': 'Misfire'
              }
            })
          }
        } else {
          console.warn(game.i18n.localize('DCC.SpellSideEffectsCompendiumNotFoundWarning'))
        }
      }
    }
  }

  static async rollSpellCheck (event, target) {
    await this.actor.update({
      'system.class.spellCheck': calculateSpellCheckBonus(this.actor)
    })
    const options = DCCActorSheet.fillRollOptions(event)
    const dataset = target.parentElement.dataset
    if (dataset.itemId) {
      // Roll through a spell item
      const item = this.actor.items.find(i => i.id === dataset.itemId)
      const ability = dataset.ability || ''
      await XCCActorSheet.rollItemSpellCheck(item, ability, options) // item.rollSpellCheck(ability, options)
    } else {
      // Roll a raw spell check for the actor
      await XCCActorSheet.rollDefaultSpellCheck(this.actor, options)
    }
  }

  static async rollDefaultSpellCheck (actor, options = {}) {
    if (!options.abilityId) {
      options.abilityId = actor.system.class.spellCheckAbility || ''
    }

    // raw dice roll with appropriate flavor
    const ability = actor.system.abilities[options.abilityId] || {}
    ability.label = CONFIG.DCC.abilities[options.abilityId]
    let die = actor.system.attributes.actionDice.value || '1d20'
    if (actor.system.class.spellCheckOverrideDie) {
      die = actor.system.class.spellCheckOverrideDie
    }
    const bonus = actor.system.class.spellCheckOverride ? actor.system.class.spellCheckOverride : calculateSpellCheckBonus(actor)
    const checkPenalty = ensurePlus(actor.system?.attributes?.ac?.checkPenalty || '0')
    options.title = game.i18n.localize('DCC.SpellCheck')

    // Collate terms for the roll
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die,
        presets: actor.getActionDice({ includeUntrained: true })
      }
    ]

    if (bonus) {
      terms.push({
        type: 'Compound',
        dieLabel: actor.system.details.sheetClass === 'blaster' ? game.i18n.localize('XCC.Blaster.BlasterDie') : game.i18n.localize('DCC.RollModifierDieTerm'),
        modifierLabel: game.i18n.localize('DCC.SpellCheck'),
        formula: bonus
      })
    }
    // Check penalty
    if (checkPenalty !== '+0') {
      terms.push({
        type: 'CheckPenalty',
        formula: checkPenalty,
        label: game.i18n.localize('DCC.CheckPenalty'),
        apply: true
      })
    }
    // Show spellburn if not elf trickster
    if (actor.system.details.sheetClass !== 'sp-elf-trickster') {
      terms.push({
        type: 'Spellburn',
        formula: '+0',
        str: actor.system.abilities.str.value,
        agl: actor.system.abilities.agl.value,
        sta: actor.system.abilities.sta.value,
        callback: (formula, term) => {
          // Apply the spellburn
          actor.update({
            'system.abilities.str.value': term.str,
            'system.abilities.agl.value': term.agl,
            'system.abilities.sta.value': term.sta
          })
        }
      })
    }

    const roll = await game.dcc.DCCRoll.createRoll(terms, actor.getRollData(), options)

    if (roll.dice.length > 0) {
      roll.dice[0].options.dcc = {
        lowerThreshold: actor.system.class.disapproval
      }
    }

    let flavor = game.i18n.localize('DCC.SpellCheck')
    if (ability.label) {
      flavor += ` (${game.i18n.localize(ability.label)})`
    }

    // Tell the system to handle the spell check result
    await game.dcc.processSpellCheck(actor, {
      rollTable: null,
      roll,
      item: null,
      flavor
    })
  }

  // Copied from DCC item class and modified to hide spellburn for elf tricksters
  static async rollItemSpellCheck (item, abilityId = '', options = {}) {
    if (item.type !== 'spell') { return }
    const actor = item.actor || item.parent

    if (item.system.lost) {
      return ui.notifications.warn(game.i18n.format('DCC.SpellLostWarning', {
        actor: actor.name,
        spell: item.name
      }))
    }

    const ability = actor.system.abilities[abilityId] || {}
    ability.label = CONFIG.DCC.abilities[abilityId]
    const spell = item.name
    options.title = game.i18n.format('DCC.RollModifierTitleCasting', { spell })
    const die = item.system.spellCheck.die
    let bonus = item.system.spellCheck.value.toString()

    // Consolidate the spell check value so that the modifier dialog is not too wide
    // Unless people are using variables, in which case the DCC roll parser needs to deal with those
    if (bonus.includes('@')) {
      bonus = Roll.safeEval(bonus)
    }

    // Calculate check penalty if relevant
    let checkPenalty
    if (item.system.config.inheritCheckPenalty) {
      checkPenalty = parseInt(actor.system.attributes.ac.checkPenalty || '0')
    } else {
      checkPenalty = parseInt(item.system.spellCheck.penalty || '0')
    }

    // Collate terms for the roll
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die
      },
      {
        type: 'Compound',
        dieLabel: actor.system.details.sheetClass === 'blaster' ? game.i18n.localize('XCC.Blaster.BlasterDie') : game.i18n.localize('DCC.RollModifierDieTerm'),
        modifierLabel: game.i18n.localize('DCC.SpellCheck'),
        formula: bonus
      },
      {
        type: 'CheckPenalty',
        formula: checkPenalty,
        apply: true
      }
    ]

    // Elf Tricksters cannot spellburn
    if (actor.system.details.sheetClass !== 'sp-elf-trickster') {
      terms.push({
        type: 'Spellburn',
        formula: '+0',
        str: actor.system.abilities.str.value,
        agl: actor.system.abilities.agl.value,
        sta: actor.system.abilities.sta.value,
        callback: (formula, term) => {
          // Apply the spellburn
          actor.update({
            'system.abilities.str.value': term.str,
            'system.abilities.agl.value': term.agl,
            'system.abilities.sta.value': term.sta
          })
        }
      })
    }

    // Roll the spell check
    const roll = await game.dcc.DCCRoll.createRoll(terms, actor.getRollData(), options)
    await roll.evaluate()

    if (roll.dice.length > 0) {
      roll.dice[0].options.dcc = {
        lowerThreshold: actor.system.class.disapproval
      }
    }

    // Lookup the appropriate table
    const resultsRef = item.system.results
    if (!resultsRef.table) {
      return ui.notifications.warn(game.i18n.localize('DCC.NoSpellResultsTableWarning'))
    }
    const predicate = t => t.name === resultsRef.table || t._id === resultsRef.table.replace('RollTable.', '')
    let resultsTable
    // If a collection is specified then check the appropriate pack for the spell
    if (resultsRef.collection) {
      const pack = game.packs.get(resultsRef.collection)
      if (pack) {
        const entry = pack.index.find(predicate)
        resultsTable = await pack.getDocument(entry._id)
      }
    }
    // Otherwise fall back to searching the world
    if (!resultsTable) {
      resultsTable = game.tables.contents.find(predicate)
    }

    let flavor = spell
    if (ability.label) {
      flavor += ` (${game.i18n.localize(ability.label)})`
    }

    // Tell the system to handle the spell check result
    await game.dcc.processSpellCheck(actor, {
      rollTable: resultsTable,
      roll,
      item,
      flavor,
      manifestation: item.system?.manifestation?.displayInChat ? item.system?.manifestation : {},
      mercurial: item.system?.mercurialEffect?.displayInChat ? item.system?.mercurialEffect : {}
    })
  }

  static getKnownSpellsCount (actor) {
    const result = actor.system.class.knownSpells || 0
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 3) return 0
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 5) return Math.max(1, parseInt(result) - 2)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 7) return Math.max(1, parseInt(result) - 1)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 13) return result
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 16) return parseInt(result) + 1
    return parseInt(result) + 2
  }

  static getMaxSpellLevel (actor) {
    const result = actor.system.class.maxSpellLevel || 0
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 3) return 0
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 7) return 1
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 9) return Math.min(2, parseInt(result))
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 11) return Math.min(3, parseInt(result))
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 14) return Math.min(4, parseInt(result))
    return Math.min(5, parseInt(result))
  }

  static getLocalizedSpellCheckNotes (actor) {
    if (actor.system.details.sheetClass === 'sp-elf-trickster') {
      return game.i18n.localize('XCC.Specialist.ElfTrickster.SpellCheckNotes')
    } else { return game.i18n.localize('XCC.SpellCheckNotes') }
  }

  static async _onNextTableResult (event) {
    XCCActorSheet._adjustTableResult.bind(this)(event, +1)
  }

  static async _onPreviousTableResult (event) {
    XCCActorSheet._adjustTableResult.bind(this)(event, -1)
  }

  static async _adjustTableResult (event, direction) {
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
        const adjustableContainer = event.target.closest('.xcc-adjustable')
        const existingEmoteElement = adjustableContainer.querySelector('.table-result-emote')
        const existingEmoteMessage = existingEmoteElement ? existingEmoteElement.innerHTML : null
        const existingEndElement = adjustableContainer.querySelector('.end-text')
        const existingEndText = existingEndElement ? existingEndElement.innerHTML : null

        const newContent = await foundry.applications.handlebars.renderTemplate(globals.templatesPath + 'chat-card-table-result.html', {
          results: newResults.map(r => foundry.utils.duplicate(r)),
          table: rollTable,
          emoteMessage: existingEmoteMessage,
          endText: existingEndText
        })

        this.update({ content: newContent })
      }
    }
  }

  // Add the wealth and sponsorship input actions to the DCCActorSheet
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(DCCActorSheet.DEFAULT_OPTIONS, {
    actions: {
      increaseWealth: this.increaseWealth,
      decreaseWealth: this.decreaseWealth,
      sponsorshipCreate: this.sponsorshipCreate,
      rollFameCheck: this.rollFameCheck,
      rollWealthCheck: this.rollWealthCheck,
      rollGrandstandingCheck: this.rollGrandstandingCheck,
      configureSpellCheck: this.configureSpellCheck,
      rollSpellCheck: this.rollSpellCheck,
      rollSpellMisfire: this.rollSpellMisfire
    }
  })

  // Add parent helper function
  static addHooksAndHelpers () {
    Handlebars.registerHelper('getMaxSpellLevel', (actor) => {
      return XCCActorSheet.getMaxSpellLevel(actor)
    })
    Handlebars.registerHelper('getKnownSpellsCount', (actor) => {
      return XCCActorSheet.getKnownSpellsCount(actor)
    })
    Handlebars.registerHelper('getLocalizedSpellCheckNotes', (actor) => {
      return XCCActorSheet.getLocalizedSpellCheckNotes(actor)
    })

    // Handle adjustable arrows in chat message
    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      // Only GMs can use the arrow buttons to change rolled table result
      if (!game.user.isGM) {
        return
      }
      // Add event delegation for the arrows
      const table = html.querySelector('.xcc-adjustable')
      if (table) {
        table.addEventListener('click', (event) => {
          if (event.target.classList.contains('table-result-shift-up')) {
            XCCActorSheet._onNextTableResult.call(message, event)
          } else if (event.target.classList.contains('table-result-shift-down')) {
            XCCActorSheet._onPreviousTableResult.call(message, event)
          }
        })
      }
    })
  }

  async displayAdjustableMessage (id, emoteKey, nameKey, tableName, packName, roll, variables = {}, endKey = '') {
    // Add DCC flags
    const flags = {
      'dcc.isNoHeader': true,
      'dcc.RollType': `${id}Check`
    }
    flags[`dcc.is${id}Check`] = true

    // Update with fleeting luck flags
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    let rolledResult = ''
    let rollTable = null
    let tableResults = []

    const pack = game.packs.get(packName)
    if (pack) {
      const entry = pack.index.filter((entity) => entity.name.startsWith(tableName))
      if (entry.length > 0) {
        rollTable = await pack.getDocument(entry[0]._id)
        const results = rollTable.getResultsForRoll(roll.total)
        if (results && results.length > 0) {
          tableResults = results
          rolledResult = results[0].description
        }
      }
    }
    if (rolledResult && tableResults.length > 0) {
      await foundry.applications.ux.TextEditor.enrichHTML(rolledResult)

      variables = foundry.utils.mergeObject(variables, {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        rollTotal: roll.total
      })

      const emoteMessage = game.i18n.format(emoteKey, variables)

      // Create message data
      const messageData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        sound: CONFIG.sounds.dice,
        flags,
        flavor: `${game.i18n.localize(nameKey)}`
      }

      const messageContent = await foundry.applications.handlebars.renderTemplate(globals.templatesPath + 'chat-card-table-result.html', {
        results: tableResults.map(r => foundry.utils.duplicate(r)),
        table: rollTable,
        actorName: this.actor.name,
        endText: endKey ? game.i18n.format(endKey, variables) : '',
        emoteMessage
      })
      messageData.content = messageContent
      await ChatMessage.create(messageData)
    }
  }

  async prepareXCCNotes () {
    const context = { relativeTo: this.options.document, secrets: this.options.document.isOwner }
    return await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.details?.xccnotes || '', context)
  }

  // Override the _prepareContext method to include sponsorships in the context.
  async _prepareContext (options) {
    const context = await super._prepareContext(options)
    const sponsorships = []
    const inventory = this.options.document.items
    for (const i of inventory) {
      if (i.type === 'xcc-core-book.sponsorship') {
        if (!i.img) {
          i.img = globals.imagesPath + 'game-icons-net/money-stack.svg'
        }
        sponsorships.push(i)
      }
    }
    foundry.utils.mergeObject(context, ...[{ sponsorships }, { notesXCC: await this.prepareXCCNotes() }])
    return context
  }

  // Replace Title field with actor field and hide the notes tab if the setting is set
  _onRender (app, html, data) {
    super._onRender(app, html, data)
    // Replace the title field with the actor's name if it's a XCC sheet
    if (app.actor.system.class.localizationPath) {
      let element = this.parts.character.firstElementChild.querySelector('label[for="system.details.title.value"]')
      element.textContent = game.i18n.localize('XCC.Actor')
      element.for = 'system.details.casting'

      element = this.parts.character.firstElementChild.querySelector('input[name="system.details.title.value"]')
      element.id = element.name = 'system.details.casting'
      element.value = app.actor.system.details?.casting || 'Movie Star'

      // Patch Xcrawl Classics Logo
      element = this.parts.character.firstElementChild.querySelector('img[src="systems/dcc/styles/images/dccrpg-logo.png"]')
      element.src = globals.imagesPath + 'xcrawl-logo-color-trimmed.png'
      element.style = 'opacity: 1;place-self: center;border: none;filter: var(--system-logo-filter);'

      if (game.settings.get(globals.id, 'hideNotesTab')) {
        // Hide the notes tab
        const notesTab = this.element.querySelector('a[data-tab="notes"]')
        if (notesTab) {
          notesTab.style.display = 'none'
        }
      }
      const levelInput = this.parts.character.firstElementChild.querySelector('input[id="system.details.level.value"]')
      if (levelInput) { levelInput.outerHTML = '<div style="display:grid; grid-template-columns: auto min-content;">' + levelInput.outerHTML + '<i data-action="levelChange" class="fa-solid fa-square-arrow-up rollable" style="margin-left:-14px; font-size:14px; margin-top:1px;"></i></div>' }
    }
  }

  _configureRenderParts (options) {
    const parts = super._configureRenderParts(options)

    // Override default spells tab
    if (this.options.document?.system?.config?.showSpells && !this.constructor.CLASS_PARTS?.wizardSpells) {
      parts.wizardSpells = {
        id: 'wizardSpells',
        template: globals.templatesPath + 'actor-partial-spells.html'
      }
    }

    return parts
  }
}

export default XCCActorSheet
