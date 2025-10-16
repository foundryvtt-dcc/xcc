/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import DCCActor from '/systems/dcc/module/actor.js'
import DiceChain from '/systems/dcc/module/dice-chain.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class DCCMonkeyPatch {
  static patch () {
    // Extend the DCCActorSheet to support 'Rewards' tab and its functionality.

    // Add rewards tab.
    DCCActorSheet.END_TABS.sheet.tabs.unshift({
      id: 'rewards',
      group: 'sheet',
      label: 'XCC.Rewards.RewardsTitle'
    })
    // Add rewards part template.
    DCCActorSheet.PARTS = foundry.utils.mergeObject(DCCActorSheet.PARTS, {
      rewards: {
        id: 'rewards',
        template: globals.templatesPath + 'actor-partial-rewards.html'
      }
    })

    // Define actions for wealth management and sponsorship creation.
    this.increaseWealth = async function (event, target) {
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

    this.decreaseWealth = async function (event, target) {
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

    this.sponsorshipCreate = async function (event, target) {
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
    this.rollFameCheck = async function (event, target) {
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
    this.rollWealthCheck = async function (event, target) {
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
    this.rollGrandstandingCheck = async function (event, target) {
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
      console.log(`Grandstanding Fame: ${fame}, Fame Die: ${fameDie}, Fame Mod: ${fameMod}`)

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
      console.log(roll, crowdDC)

      // roll.terms[0].results[0].result = roll.terms[0].results[0].result - crowdMod
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

    // Add the wealth and sponsorship input actions to the DCCActorSheet
    DCCActorSheet.DEFAULT_OPTIONS = foundry.utils.mergeObject(DCCActorSheet.DEFAULT_OPTIONS, {
      actions: {
        increaseWealth: this.increaseWealth,
        decreaseWealth: this.decreaseWealth,
        sponsorshipCreate: this.sponsorshipCreate,
        rollFameCheck: this.rollFameCheck,
        rollWealthCheck: this.rollWealthCheck,
        rollGrandstandingCheck: this.rollGrandstandingCheck
      }
    })

    // Add parent helper function
    DCCActorSheet.addHooksAndHelpers = function () {}

    DCCActorSheet.prototype.prepareXCCNotes = async function () {
      const context = { relativeTo: this.options.document, secrets: this.options.document.isOwner }
      return await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.details?.xccnotes || '', context)
    }

    // Override the _prepareContext method to include sponsorships in the context.
    const originalPrepareContext = DCCActorSheet.prototype._prepareContext
    DCCActorSheet.prototype._prepareContext = async function (options) {
      const context = await originalPrepareContext.call(this, options)
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

    // Spell check for Blaster class are computed differently.
    const originalComputeSpellCheck = DCCActor.prototype.computeSpellCheck
    DCCActor.prototype.computeSpellCheck = function (item, options = {}) {
      originalComputeSpellCheck.call(this, item, options)
      if (this.system.details.sheetClass === 'blaster') {
        // Custom logic for Blaster class spell checks
        const blasterMod = ensurePlus(this.system.class?.blasterDie || 'd3')
        const abilityMod = ensurePlus(this.system.abilities.per.mod)
        const otherMod = this.system.class.spellCheckOtherMod ? ensurePlus(this.system.class.spellCheckOtherMod) : ''
        this.system.class.spellCheck = ensurePlus(blasterMod + abilityMod + otherMod)

        if (this.system.class.spellCheckOverride) {
          this.system.class.spellCheck = this.system.class.spellCheckOverride
        }
      }
    }

    // Replace Title field with actor field and hide the notes tab if the setting is set
    const originalOnRender = DCCActorSheet.prototype._onRender
    DCCActorSheet.prototype._onRender = function (app, html, data) {
      originalOnRender.call(this, app, html, data)
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
  }
}

export default DCCMonkeyPatch
