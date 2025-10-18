/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import DiceChain from '/systems/dcc/module/dice-chain.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'
import XCCSpellCheckConfig from './spell-check-config.js'
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
  async increaseWealth (event, target) {
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

  async decreaseWealth (event, target) {
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

  async sponsorshipCreate (event, target) {
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
  async rollFameCheck (event, target) {
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
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Rewards.FameCheck')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  // Define action for rolling a wealth check
  async rollWealthCheck (event, target) {
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
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.Rewards.WealthCheck')}`
    }

    await ChatMessage.create(messageData)

    return roll
  }

  // Define action for rolling grandstanding check.
  async rollGrandstandingCheck (event, target) {
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
      rolls: [roll],
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

  /**
   * Display spell check configuration settings
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @returns {Promise<void>}
   */
  async configureSpellCheck (event, target) {
    event.preventDefault()
    await new XCCSpellCheckConfig({
      document: this.actor,
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2
      }
    }).render(true)
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
      await this.rollItemSpellCheck(item, ability, options) // item.rollSpellCheck(ability, options)
    } else {
      // Roll a raw spell check for the actor
      await this.rollDefaultSpellCheck(options)
    }
  }

  async rollDefaultSpellCheck (options = {}) {
    if (!options.abilityId) {
      options.abilityId = this.actor.system.class.spellCheckAbility || ''
    }

    // raw dice roll with appropriate flavor
    const ability = this.actor.system.abilities[options.abilityId] || {}
    ability.label = CONFIG.DCC.abilities[options.abilityId]
    let die = this.actor.system.attributes.actionDice.value || '1d20'
    if (this.actor.system.class.spellCheckOverrideDie) {
      die = this.actor.system.class.spellCheckOverrideDie
    }
    const bonus = this.actor.system.class.spellCheckOverride ? this.actor.system.class.spellCheckOverride : calculateSpellCheckBonus(this.actor)
    const checkPenalty = ensurePlus(this.actor.system?.attributes?.ac?.checkPenalty || '0')
    options.title = game.i18n.localize('DCC.SpellCheck')

    // Collate terms for the roll
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die,
        presets: this.actor.getActionDice({ includeUntrained: true })
      }
    ]

    if (bonus) {
      terms.push({
        type: 'Compound',
        dieLabel: this.actor.system.details.sheetClass === 'blaster' ? game.i18n.localize('XCC.Blaster.BlasterDie') : game.i18n.localize('DCC.RollModifierDieTerm'),
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
    if (this.actor.system.details.sheetClass !== 'sp-elf-trickster') {
      terms.push({
        type: 'Spellburn',
        formula: '+0',
        str: this.actor.system.abilities.str.value,
        agl: this.actor.system.abilities.agl.value,
        sta: this.actor.system.abilities.sta.value,
        callback: (formula, term) => {
        // Apply the spellburn
          this.actor.update({
            'system.abilities.str.value': term.str,
            'system.abilities.agl.value': term.agl,
            'system.abilities.sta.value': term.sta
          })
        }
      })
    }

    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), options)

    if (roll.dice.length > 0) {
      roll.dice[0].options.dcc = {
        lowerThreshold: this.actor.system.class.disapproval
      }
    }

    let flavor = game.i18n.localize('DCC.SpellCheck')
    if (ability.label) {
      flavor += ` (${game.i18n.localize(ability.label)})`
    }

    // Tell the system to handle the spell check result
    await game.dcc.processSpellCheck(this.actor, {
      rollTable: null,
      roll,
      item: null,
      flavor
    })
  }

  // Copied from DCC item class and modified to hide spellburn for elf tricksters
  async rollItemSpellCheck (item, abilityId = '', options = {}) {
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
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 5) return Math.max(0, result - 2)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 7) return Math.max(0, result - 1)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 13) return result
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 16) return result + 1
    return result + 2
  }

  static getMaxSpellLevel (actor) {
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 3) return 0
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 7) return 1
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 9) return Math.min(2, actor.system.class.maxSpellLevel || 0)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 11) return Math.min(3, actor.system.class.maxSpellLevel || 0)
    if (actor.system.abilities[actor.system.class.spellCheckAbility].value <= 14) return Math.min(4, actor.system.class.maxSpellLevel || 0)
    return Math.min(5, actor.system.class.maxSpellLevel || 0)
  }

  // Add the wealth and sponsorship input actions to the DCCActorSheet
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(DCCActorSheet.DEFAULT_OPTIONS, {
    actions: {
      increaseWealth: XCCActorSheet.prototype.increaseWealth,
      decreaseWealth: XCCActorSheet.prototype.decreaseWealth,
      sponsorshipCreate: XCCActorSheet.prototype.sponsorshipCreate,
      rollFameCheck: XCCActorSheet.prototype.rollFameCheck,
      rollWealthCheck: XCCActorSheet.prototype.rollWealthCheck,
      rollGrandstandingCheck: XCCActorSheet.prototype.rollGrandstandingCheck,
      configureSpellCheck: XCCActorSheet.prototype.configureSpellCheck,
      rollSpellCheck: XCCActorSheet.rollSpellCheck
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
