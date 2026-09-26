/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import DiceChain from '/systems/dcc/module/dice-chain.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'
import { GRANDSTANDED_FIELD } from './xcc-grandstanding.js'
import XCCSpellCheckConfig from './xcc-spell-check-config.js'
import { calculateSpellCheckBonus, signedFormula } from './xcc-utils.js'
import { XCCOutfitsDialog } from './xcc-outfits.js'

// Extends the DCCActorSheet and adds 'XCrawl' tab and its functionality.
export class XCCActorSheet extends DCCActorSheet {
  // Add rewards tab alongside effects and notes from DCC.
  static END_TABS = {
    sheet: {
      tabs:
        [
          { id: 'rewards', group: 'sheet', label: 'XCC.Rewards.RewardsTitle' },
          { id: 'effects', group: 'sheet', label: 'DCC.Effects' },
          { id: 'notes', group: 'sheet', label: 'DCC.Notes' }
        ]
    }
  }

  // Add rewards html template (use inplace: false to avoid mutating DCCActorSheet.PARTS).
  static PARTS = foundry.utils.mergeObject(DCCActorSheet.PARTS, {
    rewards: {
      id: 'rewards',
      template: globals.templatesPath + 'actor-partial-rewards.html'
    }
  }, { inplace: false })

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
    const system = foundry.utils.deepClone(target.dataset)
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

  // Roll a standard DCC weapon attack. The DCC system's own rollWeaponAttack
  // action handler is a private method, so subclass actions that wrap a
  // regular attack call this equivalent helper instead.
  static async rollStandardWeaponAttack (event, target) {
    event.preventDefault()
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const options = DCCActorSheet.fillRollOptions(event)
    Object.assign(options, {
      backstab: target.classList.contains('backstab-button'),
      thrown: target.dataset.thrown === 'true'
    })
    await this.actor.rollWeaponAttack(itemId, options)
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
    if (XCCActorSheet.hasGrandstanded(this.actor)) { return }

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

    // Active Effect contributions - see the rewards schema in xcc.js
    const dieSteps = this.actor.system.rewards?.grandstandingDieSteps || 0
    if (dieSteps) fameDie = DiceChain.bumpDie(fameDie, dieSteps)
    const effectMod = signedFormula(this.actor.system.rewards?.grandstandingMod)

    // Create terms for the DCC roll system. The crowd DC stays last - it is
    // peeled back off the assembled roll below.
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
      }
    ]
    if (effectMod) {
      terms.push({
        type: 'Compound',
        dieLabel: game.i18n.localize('DCC.Bonus'),
        modifierLabel: game.i18n.localize('DCC.Bonus'),
        formula: effectMod
      })
    }
    // Default crowd DC, from the world setting. parseInt guards an emptied
    // number input, which comes back null rather than the registered default.
    const crowdDCDefault = parseInt(game.settings.get(globals.id, 'grandstandingCrowdDC')) || 0
    terms.push({
      type: 'Modifier',
      label: game.i18n.localize('XCC.GrandstandingCrowd'),
      formula: ensurePlus(crowdDCDefault)
    })

    // Roll options for the DCC roll system
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.Grandstanding')
      },
      options
    )

    // Create and evaluate the roll using DCC system
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    // Read the crowd DC off the end rather than by index: a Compound bonus
    // term expands to a variable number of Roll terms.
    const crowdDC = parseInt(roll.terms.at(-2).operator + roll.terms.at(-1).number)
    roll.terms = roll.terms.slice(0, -2)
    await roll.evaluate()

    return XCCActorSheet.finishGrandstanding(this.actor, roll, crowdDC)
  }

  // 20 or better is a showstopper whatever the crowd's DC was. The other half
  // of the test, a natural, is the die's own maximum face - Fame moves the
  // action die up the chain, so it is not a fixed number.
  static GRANDSTANDING_SPECTACULAR_TOTAL = 20

  /**
   * Has this crawler already taken their turn in the spotlight? One check per
   * crawl, win or lose. This is the test that stops the roll - the sheet and
   * HUD can both be showing a stale render, and a macro reaches it too.
   *
   * @param {Actor} actor
   * @returns {Boolean}
   */
  static hasGrandstanded (actor) {
    if (!actor?.system?.rewards?.grandstanded) { return false }
    ui.notifications.warn(game.i18n.format('XCC.GrandstandingAlready', { actorName: actor.name }))
    return true
  }

  /**
   * Score an evaluated Grandstanding roll: post the crowd's reaction, award
   * Fame, and publish the outcome. Shared with the half-elf sheet, which
   * builds different terms but reads the result the same way.
   *
   * @param {Actor} actor      The crawler working the crowd
   * @param {Roll} roll        The evaluated roll, crowd DC already peeled off
   * @param {Number} crowdDC   The DC the roll is measured against
   * @returns {Promise<Roll>}  The roll, so callers can return it on
   */
  static async finishGrandstanding (actor, roll, crowdDC) {
    const success = roll.total >= crowdDC
    const actionDie = roll.dice[0]
    const natural = !!actionDie && (actionDie.values[0] === actionDie.faces)
    // Gated on `success`, so a crowd pitched above 20 can still be left cold.
    const spectacular = success && (natural || roll.total >= XCCActorSheet.GRANDSTANDING_SPECTACULAR_TOTAL)
    // The setting only decides what a showstopper is worth, not what reads as
    // one.
    const bonusFame = spectacular && game.settings.get(globals.id, 'grandstandingBonusFame')
    const fame = success ? (bonusFame ? 2 : 1) : 0

    const result = success
      ? game.i18n.format(spectacular ? 'XCC.GrandstandingSpectacular' : 'XCC.GrandstandingSuccess', { fame })
      : game.i18n.localize('XCC.GrandstandingFailure')

    const flags = {
      'dcc.isGrandstandingCheck': true,
      'dcc.RollType': 'GrandstandingCheck',
      'dcc.isNoHeader': true,
      // Published so other modules can react to the outcome without reading
      // the message text - Crowd Reactions cheers off this.
      'xcc.grandstanding': { success, natural, spectacular, fame, dc: crowdDC, total: roll.total }
    }

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: game.i18n.format('XCC.GrandstandingMessage', {
        actorName: actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        result,
        crowd: crowdDC
      }),
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${actor.name} - ${game.i18n.localize('XCC.Grandstanding')}`
    })

    // The spotlight is spent whether the crowd was won or lost, so this goes in
    // the same update as the Fame rather than behind the success test.
    const update = { [GRANDSTANDED_FIELD]: true }
    if (fame) { update['system.rewards.fame'] = (actor.system.rewards?.fame || 0) + fame }
    await actor.update(update)

    return roll
  }

  // What a character knows about The Games, by the DC they cleared. Ordered
  // low to high; the roll walks it backwards for the best band met.
  static XCRAWL_KNOWLEDGE_TIERS = [5, 10, 15, 20, 25]

  // Define action for rolling an Xcrawl Knowledge check.
  static async rollXcrawlKnowledgeCheck (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('DCC.Modifier'),
        formula: ensurePlus(this.actor.system.abilities.int.mod + this.actor.system.details.level.value)
      }
    ]

    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('XCC.XcrawlKnowledge')
      },
      options
    )

    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    // Best band cleared. Nothing below the first tier is worth knowing.
    const tiers = XCCActorSheet.XCRAWL_KNOWLEDGE_TIERS
    const dc = tiers.filter(tier => roll.total >= tier).pop()
    const result = dc
      ? game.i18n.format('XCC.XcrawlKnowledgeResult', {
        dc,
        knowledge: game.i18n.localize(`XCC.XcrawlKnowledgeDC${dc}`)
      })
      : game.i18n.localize('XCC.XcrawlKnowledgeFailure')

    const knowledgeMessage = game.i18n.format(
      'XCC.XcrawlKnowledgeMessage',
      {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        result
      }
    )

    const flags = {
      'dcc.isXcrawlKnowledgeCheck': true,
      'dcc.RollType': 'XcrawlKnowledgeCheck',
      'dcc.isNoHeader': true
    }

    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: knowledgeMessage,
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.XcrawlKnowledge')}`
    })

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

    // Add spell-specific other bonus if present
    const otherBonus = item.system.spellCheck.otherBonus
    if (otherBonus) {
      terms.push({
        type: 'Modifier',
        label: game.i18n.localize('DCC.SpellOtherBonus'),
        formula: otherBonus
      })
    }

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
          results: newResults.map(r => foundry.utils.deepClone(r)),
          table: rollTable,
          emoteMessage: existingEmoteMessage,
          endText: existingEndText
        })

        this.update({ content: newContent })
      }
    }
  }

  // Add XCC-specific actions (Foundry v13 merges DEFAULT_OPTIONS up the class hierarchy automatically).
  static DEFAULT_OPTIONS = {
    actions: {
      increaseWealth: this.increaseWealth,
      decreaseWealth: this.decreaseWealth,
      sponsorshipCreate: this.sponsorshipCreate,
      rollFameCheck: this.rollFameCheck,
      rollWealthCheck: this.rollWealthCheck,
      rollGrandstandingCheck: this.rollGrandstandingCheck,
      rollXcrawlKnowledgeCheck: this.rollXcrawlKnowledgeCheck,
      configureSpellCheck: this.configureSpellCheck,
      openOutfits: this.openOutfits,
      rollSpellCheck: this.rollSpellCheck,
      rollSpellMisfire: this.rollSpellMisfire
    }
  }

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
        results: tableResults.map(r => foundry.utils.deepClone(r)),
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

    // Add XCC class to XCC character sheet window
    this.parts.tabs.parentElement.parentElement.classList.add('xcc')

    // Replace the title field with the actor's name if it's a XCC sheet
    if (app.actor.system.class.localizationPath) {
      let element = this.parts.character.firstElementChild.querySelector('label[for="system.details.title.value"]')
      element.textContent = game.i18n.localize('XCC.Actor')
      element.htmlFor = 'system.details.casting'

      element = this.parts.character.firstElementChild.querySelector('input[name="system.details.title.value"]')
      element.id = element.name = 'system.details.casting'
      element.value = app.actor.system.details?.casting || 'Movie Star'

      // Patch Xcrawl Classics Logo
      element = this.parts.character.firstElementChild.querySelector('img[src="systems/dcc/styles/images/dccrpg-logo.png"]')
      element.src = globals.imagesPath + 'xcrawl-logo-color-trimmed.png'
      element.style = 'opacity: 1;place-self: center;border: none;filter: var(--system-logo-filter);'

      const levelInput = this.parts.character.firstElementChild.querySelector('input[id="system.details.level.value"]')
      if (levelInput) { levelInput.outerHTML = '<div style="display:grid; grid-template-columns: auto min-content;">' + levelInput.outerHTML + '<i data-action="levelChange" class="fa-solid fa-square-arrow-up rollable" style="margin-left:-14px; font-size:14px; margin-top:1px;"></i></div>' }
    }

    this.#addMojoBox()
  }

  /**
   * Let a hover read a notes or name field that is too narrow for its text.
   *
   * Those columns are ellipsised (`.weapon-list` in xcc.css), so anything past
   * the edge is simply invisible. The width is measured on hover rather than
   * now: it depends on the sheet's layout, which is not settled during render
   * and changes again whenever the window is resized.
   *
   * `title` rather than `data-tooltip` because these fields are readonly or
   * disabled, and Foundry's tooltip manager needs pointer events a disabled
   * control never emits.
   */

  /**
   * Put a Mojo box on the character tab, beside a narrowed Lucky Roll. The
   * wrapper inherits the grid cell Lucky Roll held alone and splits it - see
   * `.xcc-lucky-mojo` in xcc.css.
   *
   * The input is named for the actor flag the Mojo ledger keeps (see
   * module/xcc-mojo.js), so the sheet's own submit-on-change writes it and the
   * tracker picks it up from `updateActor`.
   */
  #addMojoBox () {
    const luckyRoll = this.parts.character?.firstElementChild?.querySelector('.lucky-roll')
    // A re-render rebuilds the part from the template, so the wrapper is gone
    // and has to be rebuilt with it - but bail if this render left it standing.
    if (!luckyRoll || luckyRoll.parentElement.classList.contains('xcc-lucky-mojo')) { return }

    const wrapper = document.createElement('div')
    wrapper.className = 'xcc-lucky-mojo'
    luckyRoll.replaceWith(wrapper)
    wrapper.append(luckyRoll)

    const field = `flags.${globals.id}.mojo`
    const mojo = document.createElement('div')
    mojo.className = 'xcc-mojo'
    mojo.innerHTML = `
      <label for="${field}" class="box-title" title="${game.i18n.localize('XCC.MojoPointsHint')}">${game.i18n.localize('DCC.FleetingLuck')}</label>
      <input type="number" id="${field}" name="${field}" min="0" step="1" data-dtype="Number"
             value="${this.actor.getFlag(globals.id, 'mojo') || 0}">`
    // The base sheet disables its fields for a non-editable render before this
    // runs, so a field added afterwards has to opt in to the same treatment.
    if (!this.isEditable) { mojo.querySelector('input').disabled = true }
    wrapper.append(mojo)
  }

  /**
   * @inheritDoc
   * Relabel the system's Config entry in the header menu. Done here rather than
   * by overriding `DCC.ConfigureSheet` in our language file, since that key
   * labels the same control on every item sheet too.
   */
  _getHeaderControls () {
    const controls = super._getHeaderControls().map(control =>
      control.action === 'configureActor'
        ? { ...control, label: 'XCC.ConfigureSheet' }
        : control)
    // Alternative token artwork - see module/xcc-outfits.js. Owner-only, since
    // every route out of the window writes to the actor.
    if (this.actor?.isOwner) {
      controls.push({ action: 'openOutfits', icon: 'fa-solid fa-shirt', label: 'XCC.Outfits.Title' })
    }
    return controls
  }

  /**
   * Open this character's wardrobe.
   * @this {XCCActorSheet}
   */
  static openOutfits () {
    new XCCOutfitsDialog({ document: this.actor }).render(true)
  }

  /**
   * @inheritDoc
   * Let a right-click stand in for the modifier-click that opens the roll
   * customisation dialog.
   *
   * ApplicationV2 dispatches actions on `auxclick` too, and `{handler, buttons}`
   * picks which buttons reach one - so the roll actions are re-declared for
   * button 2 and the event is given an own `ctrlKey` of `true`. The handlers
   * read modifiers straight off the event, so shadowing the getter makes the
   * two gestures indistinguishable downstream.
   *
   * Only `roll*` actions are widened: otherwise a right-click on a delete
   * control would delete the item.
   */
  _initializeApplicationOptions (options) {
    const initialized = super._initializeApplicationOptions(options)
    const actions = {}
    for (const [action, definition] of Object.entries(initialized.actions ?? {})) {
      const handler = typeof definition === 'object' ? definition.handler : definition
      if (!action.startsWith('roll') || typeof handler !== 'function') {
        actions[action] = definition
        continue
      }
      const buttons = (typeof definition === 'object' ? definition.buttons : null) ?? [0]
      actions[action] = {
        buttons: buttons.includes(2) ? buttons : [...buttons, 2],
        handler: function (event, target) {
          if (event?.button === 2) {
            Object.defineProperty(event, 'ctrlKey', { value: true, configurable: true })
          }
          return handler.call(this, event, target)
        }
      }
    }
    initialized.actions = actions
    return initialized
  }

  /**
   * @inheritDoc
   * Drop the Notes tab when the setting hides it - the field lives on the
   * Xcrawl tab instead.
   *
   * Pruned from the config rather than hidden after rendering: the responsive
   * tab strip builds its ellipsis menu from the anchors captured at setup, so
   * a `display: none` anchor stayed reachable there on a narrow sheet.
   */
  _getTabsConfig (group) {
    const config = super._getTabsConfig(group)
    if (group !== 'sheet' || !config) return config
    // Same gate the post-render version used: XCC class sheets only.
    if (!this.actor?.system?.class?.localizationPath) return config
    if (!game.settings.get(globals.id, 'hideNotesTab')) return config

    config.tabs = config.tabs.filter(tab => tab.id !== 'notes')
    // The system settles the active tab before handing the config back, so a
    // sheet last left on Notes has already been pointed at a tab that is about
    // to disappear. Re-check it here or that sheet opens showing nothing.
    const tabIds = config.tabs.map(tab => tab.id)
    if (!tabIds.includes(this.tabGroups[group])) {
      this.tabGroups[group] = tabIds.includes(config.initial) ? config.initial : tabIds[0]
    }
    return config
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
