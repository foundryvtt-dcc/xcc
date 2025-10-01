import DCCActorSheet from '../../../../../../../systems/dcc/module/actor-sheet.js'
import {
  ensurePlus,
  getCritTableResult,
  getFumbleTableResult
} from '../../../../../../../systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetHalfElf extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollSavingThrow: this.rollSavingThrow,
      rollWeaponAttack: this.rollWeaponAttack
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
    halfelf: {
      id: 'half-elf',
      template: globals.templatesPath + 'actor-partial-half-elf.html'
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
        { id: 'half-elf', group: 'sheet', label: 'XCC.HalfElf.ActorSheetHalfElf' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  static addHooksAndHelpers () {
    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      if (message.speakerActor?.system?.details?.sheetClass !== 'half-elf') return
      if ((message.system?.skillId || '') === 'acrobatics') {
        // Dodge message
        const reflex = data.speakerActor?.system?.saves.ref.value || 0
        let enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeFailure')
        if ((message.rolls[0]?.total || 0) >= 20) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeAll')
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeMultiple')
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          enemies = game.i18n.localize('XCC.Specialist.Acrobat.DodgeSingle')
        }
        // Withdraw message
        let withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawFailure')
        if ((message.rolls[0]?.total || 0) >= 20) {
          withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawMultiple')
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          withdraw = game.i18n.localize('XCC.Specialist.Acrobat.WithdrawSingle')
        }
        // Fall damage mitigation
        let fall = '0'
        if ((message.rolls[0]?.total || 0) >= 30) {
          fall = '5d6'
        } else if ((message.rolls[0]?.total || 0) >= 25) {
          fall = '4d6'
        } else if ((message.rolls[0]?.total || 0) >= 20) {
          fall = '3d6'
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          fall = '2d6'
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          fall = '1d6'
        }
        html.innerHTML += '<div class=\'message-content\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.AcrobaticsMessage', {
          enemies,
          reflex,
          withdraw,
          fall
        }) + '</div>'
      } else if ((message.system?.skillId || '') === 'poleVault') {
        // Pole vault message
        let height = 0
        let dc = 0
        if ((message.rolls[0]?.total || 0) >= 25) {
          height = 20
          dc = 25
        } else if ((message.rolls[0]?.total || 0) >= 20) {
          height = 15
          dc = 20
        } else if ((message.rolls[0]?.total || 0) >= 15) {
          height = 10
          dc = 15
        } else if ((message.rolls[0]?.total || 0) >= 10) {
          height = 5
          dc = 10
        }
        html.innerHTML += '<div class=\'message-content\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.PoleVaultMessage', {
          height,
          dc
        }) + '</div>'
      } else if ((message.system?.skillId || '') === 'tightropeWalk') {
        // Tightrope walk message
        html.innerHTML += '<div class=\'message-content tightrope\'><br/>' + game.i18n.format('XCC.Specialist.Acrobat.TightRopeMessage') + '</div>'
      }
    })
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
    // Acrobat: Acrobatics
    if (this.actor.system.skills.acrobatics) {
      this.actor.system.skills.acrobatics.ability = 'agl'
      this.actor.system.skills.acrobatics.label = 'DCC.system.skills.acrobatics.value'
    }
    // Half-Elf spellcheck skill
    if (this.actor.system.skills.spellCheck) {
      this.actor.system.skills.spellCheck = {
        value: this.actor.system.details.level.value,
        config: {
          applyCheckPenalty: true
        },
        ability: 'per',
        label: 'DCC.Spell',
        die: 'd20'
      }
    }
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'half-elf') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.HalfElf',
        'system.class.className': 'xcc.halfelf',
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.HalfElf.ClassLink')),
        'system.details.sheetClass': 'half-elf',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.class.spellCheckAbility': 'per',
        'system.config.showSpells': true,
        'system.config.showBackstab': true
      })
    }
    this.setSpecialistSkills()

    return context
  }

  static async rollDowngradedToHit (weapon, options, actor) {
    // Apply armor check penalty to backstab attacks;
    const toHit = weapon.system?.toHit.replaceAll('@ab', actor.system.details.attackBonus) + ensurePlus(actor.system?.attributes?.ac?.checkPenalty || '0')
    const actorActionDice = actor.getActionDice({ includeUntrained: true })[0].formula

    const die = weapon.system?.actionDie || actorActionDice

    let critRange = parseInt(weapon.system?.critRange || actor.system.details.critRange || 20)

    /* If we don't have a valid formula, bail out here */
    if (!Roll.validate(toHit)) {
      return {
        rolled: false,
        formula: toHit
      }
    }

    // Collate terms for the roll
    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die,
        presets: actor.getActionDice({ includeUntrained: true })
      },
      {
        type: 'Compound',
        modifierLabel: game.i18n.localize('DCC.ToHit'),
        formula: toHit
      }
    ]

    // Add backstab bonus if required
    terms.push({
      type: 'Modifier',
      label: game.i18n.localize('DCC.Backstab'),
      presets: [],
      formula: parseInt(actor.system?.class?.backstab || '+0')
    })

    // Allow modules to modify the terms before the roll is created
    const proceed = Hooks.call('dcc.modifyAttackRollTerms', terms, actor, weapon, options)
    if (!proceed) return // Cancel the attack roll if any listener returns false

    /* Roll the Attack */
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('DCC.ToHit')
      },
      options
    )
    const attackRoll = await game.dcc.DCCRoll.createRoll(terms, Object.assign({ critical: critRange }, actor.getRollData()), rollOptions)
    await attackRoll.evaluate()

    // Adjust crit range if the die size was adjusted
    const strictCrits = game.settings.get('dcc', 'strictCriticalHits')
    if (strictCrits) {
      // Extract die sizes from the original and adjusted formulas
      const originalDieMatch = die.match(/(\d+)d(\d+)/)
      const adjustedDieMatch = attackRoll.formula.match(/(\d+)d(\d+)/)
      if (originalDieMatch && adjustedDieMatch) {
        const originalDieSize = parseInt(originalDieMatch[2])
        const adjustedDieSize = parseInt(adjustedDieMatch[2])
        if (originalDieSize !== adjustedDieSize) {
          // Use proportional crit range calculation
          critRange = game.dcc.DiceChain.calculateProportionalCritRange(critRange, originalDieSize, adjustedDieSize)
        }
      }
    } else {
      // Use the original logic (expand crit range)
      critRange += parseInt(game.dcc.DiceChain.calculateCritAdjustment(die, attackRoll.formula))
    }

    const d20RollResult = attackRoll.dice[0].total
    attackRoll.dice[0].options.dcc = {
      upperThreshold: critRange
    }

    /* Check for crit or fumble */
    const fumble = (d20RollResult === 1)
    const naturalCrit = d20RollResult >= critRange
    const crit = !fumble

    return {
      d20RollResult,
      crit,
      formula: game.dcc.DCCRoll.cleanFormula(attackRoll.terms),
      fumble,
      hitsAc: attackRoll.total,
      naturalCrit,
      roll: attackRoll,
      rolled: true,
      weaponDamageFormula: weapon.damage
    }
  }

  static async rollWeaponAttack (event, target) {
    const itemId = DCCActorSheet.findDataset(target, 'itemId')
    const weapon = this.actor.items.find(i => i.id === itemId)
    if (weapon) {
      // Half-Elf applies armor penalty to backstab attacks and reduces the crit die by 2
      if (target.classList.contains('backstab-button')) {
        await XCCActorSheetHalfElf.rollDowngradedBackstab(event, weapon, this.actor)
      } else {
        // Call the original roll weapon attack action
        await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
      }
    } else { console.warn(`Weapon not found: ${itemId} `) }
  }

  static async rollDowngradedBackstab (event, weapon, actor) {
    event.preventDefault()
    const options = DCCActorSheet.fillRollOptions(event)

    const automateDamageFumblesCrits = game.settings.get('dcc', 'automateDamageFumblesCrits')
    const rollMode = game.settings.get('core', 'rollMode')

    // If weapon is not found, give up and show a warning
    if (!weapon) {
      return ui.notifications.warn(game.i18n.format('DCC.WeaponNotFound', { id: weapon.id }))
    }

    // Warn if weapon is not equipped
    if (!weapon.system?.equipped && game.settings.get('dcc', 'checkWeaponEquipment')) return ui.notifications.warn(game.i18n.localize('DCC.WeaponWarningUnequipped'))

    // Accumulate all rolls for sending to the chat message
    const rolls = []

    // Attack roll
    options.targets = game.user.targets // Add targets set to options
    const attackRollResult = await XCCActorSheetHalfElf.rollDowngradedToHit(weapon, options, actor)

    if (!attackRollResult) return // <-- if the attack roll is cancelled, return

    if (attackRollResult.naturalCrit) {
      options.naturalCrit = true
    }
    foundry.utils.mergeObject(attackRollResult.roll.options, { 'dcc.isAttackRoll': true })
    const attackRollHTML = await attackRollResult.roll.render()
    rolls.push(attackRollResult.roll)

    // Damage roll
    let damageRollFormula = weapon.system.damage
    if (weapon.system?.backstabDamage) {
      if (!weapon.system?.damageWeapon || weapon.system.damageWeapon.trim() === '') {
        // No weapon damage component to replace, use backstab damage directly
        damageRollFormula = weapon.system.backstabDamage
      } else {
        // Replace the weapon damage component with backstab damage
        damageRollFormula = damageRollFormula.replace(weapon.system.damageWeapon, weapon.system.backstabDamage)
      }
    }
    let damageRoll, damageInlineRoll, damagePrompt
    if (automateDamageFumblesCrits) {
      const flavorMatch = damageRollFormula.match(/\[(.*)]/)
      let flavor = ''
      if (flavorMatch) {
        flavor = flavorMatch[1]
        damageRollFormula = damageRollFormula.replace(/\[.*]/, '')
      }
      damageRoll = game.dcc.DCCRoll.createRoll([
        {
          type: 'Compound',
          dieLabel: game.i18n.localize('DCC.Damage'),
          flavor,
          formula: damageRollFormula
        }
      ])
      await damageRoll.evaluate()
      foundry.utils.mergeObject(damageRoll.options, { 'dcc.isDamageRoll': true })
      if (damageRoll.total < 1) {
        damageRoll._total = 1
      }
      rolls.push(damageRoll)
      damageInlineRoll = damageRoll.toAnchor({
        classes: ['damage-applyable', 'inline-dsn-hidden'],
        dataset: { damage: damageRoll.total }
      }).outerHTML
      damagePrompt = game.i18n.localize('DCC.Damage')
    } else {
      if (damageRollFormula.includes('-')) {
        damageRollFormula = `max(${damageRollFormula}, 1)`
      }
      damageInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`[[/r ${damageRollFormula} # Damage]]`)
      damagePrompt = game.i18n.localize('DCC.RollDamage')
    }

    // Crit roll
    let critRollFormula = ''
    let critInlineRoll = ''
    let critPrompt = game.i18n.localize('DCC.RollCritical')
    let critRoll
    let critTableName = weapon.system?.critTable || actor.system.attributes.critical?.table || ''
    let critText = ''
    const luckMod = ensurePlus(actor.system.abilities.lck.mod)
    if (attackRollResult.crit) {
      critRollFormula = `${weapon.system?.critDie || actor.system.attributes.critical?.die || '1d10'}`
      // Backstab criticals are reduced by 2 die steps unless it's a natural crit
      if (!attackRollResult.naturalCrit) { critRollFormula = game.dcc.DiceChain.bumpDie(critRollFormula, -2) }
      critRollFormula += luckMod
      const criticalText = game.i18n.localize('DCC.Critical')
      const critTableText = game.i18n.localize('DCC.CritTable')
      critInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`[[/r ${critRollFormula} # ${criticalText} (${critTableText} ${critTableName})]] (${critTableText} ${critTableName})`)
      if (automateDamageFumblesCrits) {
        critPrompt = game.i18n.localize('DCC.Critical')
        critRoll = game.dcc.DCCRoll.createRoll([
          {
            type: 'Compound',
            dieLabel: game.i18n.localize('DCC.Critical'),
            formula: critRollFormula
          }
        ])
        await critRoll.evaluate()
        foundry.utils.mergeObject(critRoll.options, { 'dcc.isCritRoll': true })
        rolls.push(critRoll)
        const critResult = await getCritTableResult(critRoll, `Crit Table ${critTableName}`)
        if (critResult) {
          critTableName = critResult?.parent?.link.replace(/\{.*}/, `{${critTableName}}`)
          critText = await foundry.applications.ux.TextEditor.enrichHTML(critResult.description)
          critText = `: <br>${critText}`
        }
        const critResultPrompt = game.i18n.localize('DCC.CritResult')
        const critRollAnchor = critRoll.toAnchor({
          classes: ['inline-dsn-hidden'],
          dataset: { damage: critRoll.total }
        }).outerHTML
        critInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`${critResultPrompt} ${critRollAnchor} (${critTableText} ${critTableName})${critText}`)
      }
    }

    // Fumble roll
    let fumbleRollFormula = ''
    let fumbleInlineRoll = ''
    let fumblePrompt = ''
    let fumbleTableName = 'Table 4-2: Fumbles'
    let fumbleText = ''
    let fumbleRoll
    const inverseLuckMod = ensurePlus((parseInt(actor.system.abilities.lck.mod) * -1).toString())
    if (attackRollResult.fumble) {
      fumbleRollFormula = `${actor.system.attributes.fumble.die}${inverseLuckMod}`
      fumbleInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`[[/r ${fumbleRollFormula} # Fumble (${fumbleTableName})]] (${fumbleTableName})`)
      fumblePrompt = game.i18n.localize('DCC.RollFumble')
      if (automateDamageFumblesCrits) {
        fumblePrompt = game.i18n.localize('DCC.Fumble')
        fumbleRoll = game.dcc.DCCRoll.createRoll([
          {
            type: 'Compound',
            dieLabel: game.i18n.localize('DCC.Fumble'),
            formula: fumbleRollFormula
          }
        ])
        await fumbleRoll.evaluate()
        foundry.utils.mergeObject(fumbleRoll.options, { 'dcc.isFumbleRoll': true })
        rolls.push(fumbleRoll)
        const fumbleResult = await getFumbleTableResult(fumbleRoll)
        if (fumbleResult) {
          fumbleTableName = `${fumbleResult?.parent?.link}:<br>`.replace('Fumble Table ', '').replace('Crit/', '')
          fumbleText = await foundry.applications.ux.TextEditor.enrichHTML(fumbleResult.description)
        }
        const onPrep = game.i18n.localize('DCC.on')
        const fumbleRollAnchor = fumbleRoll.toAnchor({
          classes: ['inline-dsn-hidden'],
          dataset: { damage: fumbleRoll.total }
        }).outerHTML
        fumbleInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`${fumbleRollAnchor} ${onPrep} ${fumbleTableName} ${fumbleText}`)
      }
    }

    const flags = {
      'dcc.isToHit': true,
      'dcc.isBackstab': true,
      'dcc.isFumble': attackRollResult.fumble,
      'dcc.isCrit': attackRollResult.crit,
      'dcc.isNaturalCrit': attackRollResult.naturalCrit,
      'dcc.isMelee': weapon.system?.melee
    }
    game.dcc.FleetingLuck.updateFlags(flags, attackRollResult.roll)

    // Speaker object for the chat cards
    const speaker = ChatMessage.getSpeaker({ actor: this })

    const messageData = {
      user: game.user.id,
      speaker,
      flavor: game.i18n.format('DCC.BackstabRoll', { weapon: weapon.name }),
      flags,
      rolls,
      system: {
        actorId: actor.id,
        attackRollHTML,
        damageInlineRoll,
        damagePrompt,
        damageRoll,
        damageRollFormula,
        critInlineRoll,
        critPrompt,
        critRoll,
        critRollFormula,
        critTableName,
        critDieOverride: weapon.system?.config?.critDieOverride,
        critTableOverride: weapon.system?.config?.critTableOverride,
        fumbleInlineRoll,
        fumblePrompt,
        fumbleRoll,
        fumbleRollFormula,
        fumbleTableName,
        hitsAc: attackRollResult.hitsAc,
        targets: game.user.targets,
        weaponId: weapon.id,
        weaponName: weapon.name
      }
    }
    // Allow modules to modify the chat message data before the message is created
    await Hooks.callAll('dcc.rollWeaponAttack', rolls, messageData)

    messageData.content = await foundry.applications.handlebars.renderTemplate('systems/dcc/templates/chat-card-attack-result.html', { message: messageData })

    // Output the results
    ChatMessage.applyRollMode(messageData, rollMode)
    ChatMessage.create(messageData)
  }

  static async rollSavingThrow (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = DCCActorSheet.fillRollOptions(event)

    const save = target.parentElement.dataset.save
    if (this.actor.system.class.saveBonus <= 0) { await this.actor.rollSavingThrow(save, options) } else {
      const oldRef = this.actor.system.saves.ref.value
      const oldFrt = this.actor.system.saves.frt.value
      const oldWil = this.actor.system.saves.wil.value
      if (!this.actor.system.saves.ref.override) { this.actor.system.saves.ref.value += this.actor.system.class.saveBonus }
      if (!this.actor.system.saves.frt.override) { this.actor.system.saves.frt.value += this.actor.system.class.saveBonus }
      if (!this.actor.system.saves.wil.override) { this.actor.system.saves.wil.value += this.actor.system.class.saveBonus }
      await this.actor.rollSavingThrow(save, options)
      this.actor.system.saves.ref.value = oldRef
      this.actor.system.saves.frt.value = oldFrt
      this.actor.system.saves.wil.value = oldWil
    }
  }

  _onRender (context, options) {
    if (this.actor.system.class.saveBonus && this.actor.system.class.saveBonus > 0) {
      let element
      if (!this.actor.system.saves.ref.override) {
        element = this.parts.character.firstElementChild.querySelector('input[id="system.saves.ref.value"]')
        element.value = ensurePlus(parseInt(this.actor.system.saves.ref.value) + parseInt(this.actor.system.class.saveBonus))
      }
      if (!this.actor.system.saves.frt.override) {
        element = this.parts.character.firstElementChild.querySelector('input[id="system.saves.frt.value"]')
        element.value = ensurePlus(parseInt(this.actor.system.saves.frt.value) + parseInt(this.actor.system.class.saveBonus))
      }
      if (!this.actor.system.saves.wil.override) {
        element = this.parts.character.firstElementChild.querySelector('input[id="system.saves.wil.value"]')
        element.value = ensurePlus(parseInt(this.actor.system.saves.wil.value) + parseInt(this.actor.system.class.saveBonus))
      }
    }
    super._onRender(context, options)
  }
}

export default XCCActorSheetHalfElf
