/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetBlaster extends XCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollSpellCheck: this.rollSpellCheck
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
    blaster: {
      id: 'blaster',
      template: globals.templatesPath + 'actor-partial-blaster.html'
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
        { id: 'blaster', group: 'sheet', label: 'XCC.Blaster.ActorSheetBlaster' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'blaster') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Blaster.ClassLink'), { relativeTo: this.actor })
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'blaster') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Blaster',
        'system.class.className': 'blaster',
        'system.details.sheetClass': 'blaster',
        'system.class.spellCheckAbility': 'per',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': true
      })
    }

    return context
  }

  async rollDefaultBlasterSpellCheck (options) {
    if (!options.abilityId) {
      options.abilityId = this.actor.system.class.spellCheckAbility || ''
    }

    // If a spell name is provided attempt to look up an item with that name for the roll
    if (options.spell) {
      const item = this.actor.items.find(i => i.name === options.spell)
      if (item) {
        if (item.type === 'spell') {
          // Roll through the item and return, so we don't also roll a basic spell check
          item.rollBlasterSpellCheck(options.abilityId, options)
          return
        } else {
          return ui.notifications.warn(game.i18n.localize('DCC.SpellCheckNonSpellWarning'))
        }
      } else {
        return ui.notifications.warn(game.i18n.localize('DCC.SpellCheckNoOwnedItemWarning'))
      }
    }

    // Otherwise fall back to a raw dice roll with appropriate flavor
    const ability = this.actor.system.abilities[options.abilityId] || {}
    ability.label = CONFIG.DCC.abilities[options.abilityId]
    const spell = options.spell ? options.spell : game.i18n.localize('DCC.SpellCheck')
    let die = this.actor.system.attributes.actionDice.value || '1d20'
    if (this.actor.system.class.spellCheckOverrideDie) {
      die = this.actor.system.class.spellCheckOverrideDie
    }
    const abilityMod = ensurePlus(ability?.mod || 0) || +0
    let otherMod = ''
    if (this.actor.system.class.spellCheckOtherMod) {
      otherMod = ensurePlus(this.actor.system.class.spellCheckOtherMod)
    }
    let bonus = ''
    if (this.actor.system.class.spellCheckOverride) {
      bonus = this.actor.system.class.spellCheckOverride
    }
    const checkPenalty = ensurePlus(this.actor.system?.attributes?.ac?.checkPenalty || '0')
    const isIdolMagic = this.actor.system.details.sheetClass === 'Cleric'
    const applyCheckPenalty = !isIdolMagic
    options.title = game.i18n.localize('DCC.SpellCheck')

    const blasterDie = this.actor.system.class.blasterDie || 'd3'

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
        dieLabel: game.i18n.localize('DCC.RollModifierDieTerm'),
        modifierLabel: game.i18n.localize('DCC.SpellCheck'),
        formula: bonus
      })
    } else {
      terms.push({
        type: 'Die',
        label: game.i18n.localize('XCC.Blaster.BlasterDie'),
        formula: blasterDie,
        presets: [{ label: blasterDie, formula: blasterDie }]
      })
      terms.push({
        type: 'Compound',
        dieLabel: game.i18n.localize('DCC.RollModifierDieTerm'),
        modifierLabel: game.i18n.localize('DCC.AbilityMod'),
        formula: abilityMod
      })
      if (otherMod) {
        terms.push({
          type: 'Compound',
          dieLabel: game.i18n.localize('DCC.RollModifierDieTerm'),
          modifierLabel: game.i18n.localize('DCC.SpellCheckOtherMod'),
          formula: otherMod
        })
      }
    }
    // Show spellburn
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
    if (checkPenalty !== '+0') {
      terms.push({
        type: 'CheckPenalty',
        formula: checkPenalty,
        label: game.i18n.localize('DCC.CheckPenalty'),
        apply: applyCheckPenalty
      })
    }

    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), options)

    if (roll.dice.length > 0) {
      roll.dice[0].options.dcc = {
        lowerThreshold: this.actor.system.class.disapproval
      }
    }

    let flavor = spell
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

  static async rollSpellCheck (event, target) {
    const options = XCCActorSheet.fillRollOptions(event)
    const dataset = target.parentElement.dataset
    if (dataset.itemId) {
      // Roll through a spell item
      const item = this.actor.items.find(i => i.id === dataset.itemId)
      const ability = dataset.ability || ''
      await item.rollSpellCheck(ability, options)
    } else {
      // Roll a raw spell check for the actor
      await this.rollDefaultBlasterSpellCheck(options)
    }
  }

  // Backup of custom item cast method in case the default one turns out to be insufficient
  /*  async rollItemBlasterSpellCheck(item, options) {
    if (item.type !== 'spell') { return }

    if (item.system.lost && game.settings.get('dcc', 'automateWizardSpellLoss') && item.system.config.castingMode === 'wizard') {
      return ui.notifications.warn(game.i18n.format('DCC.SpellLostWarning', {
        actor: this.actor.name,
        spell: item.name
      }))
    }
    const abilityId = this.actor.system.class.spellCheckAbility || 'per'
    const ability = this.actor.system.abilities[abilityId] || {}
    ability.label = CONFIG.DCC.abilities[abilityId]
    const spell = item.name
    options.title = game.i18n.format('DCC.RollModifierTitleCasting', { spell })
    const die = item.system.spellCheck.die
    console.log("Ability ID:", abilityId, "ability:", ability, "item:", item, "options:", options);
    let bonus = ensurePlus(ability?.mod || 0)
    let blasterDie = ensurePlus(this.actor.system.class.blasterDie || 'd3');

    // Calculate check penalty if relevant
    let checkPenalty
    if (item.system.config.inheritCheckPenalty) {
      checkPenalty = parseInt(this.actor.system.attributes.ac.checkPenalty || '0')
    } else {
      checkPenalty = parseInt(item.system.spellCheck.penalty || '0')
    }

    // Determine the casting mode
    const castingMode = item.system.config.castingMode || 'wizard'

    // Collate terms for the roll
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die
      },
      {
        type: 'Compound',
        label: game.i18n.localize('XCC.Blaster.BlasterDie'),
        formula: blasterDie
      },
      {
        type: 'Compound',
        dieLabel: game.i18n.localize('DCC.RollModifierDieTerm'),
        modifierLabel: game.i18n.localize('DCC.AbilityMod'),
        formula: bonus
      },
      {
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
      },
      {
        type: 'CheckPenalty',
        formula: checkPenalty,
        apply: castingMode === 'wizard' // Idol magic does not incur a checkPenalty
      }
    ]

    // Roll the spell check
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), options)
    await roll.evaluate()

    if (roll.dice.length > 0) {
      roll.dice[0].options.dcc = {
        lowerThreshold: this.actor.system.class.disapproval
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
    await game.dcc.processSpellCheck(this.actor, {
      rollTable: resultsTable,
      roll,
      item: item,
      flavor,
      manifestation: item.system?.manifestation?.displayInChat ? item.system?.manifestation : {},
      mercurial: item.system?.mercurialEffect?.displayInChat ? item.system?.mercurialEffect : {}
    })
  } */
}

export default XCCActorSheetBlaster
