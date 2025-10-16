/* eslint-disable import/no-absolute-path */
import DCCActorSheet from '/systems/dcc/module/actor-sheet.js'
import { ensurePlus, getCritTableResult } from '/systems/dcc/module/utilities.js'
import * as chat from '/systems/dcc/module/chat.js'
import { globals } from './settings.js'

class XCCActorSheetAthlete extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollAbilityCheck: this.rollAbilityCheck,
      rollGrapple: this.rollGrappleAttack
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'athlete', group: 'sheet', label: 'XCC.Athlete.ActorSheetAthlete' }
      ],
      initial: 'character'
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
    athlete: {
      id: 'athlete',
      template: globals.templatesPath + 'actor-partial-athlete.html'
    }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getGrappleToHit', function (actor) {
      if (!actor.system.class?.trainingDie) return actor.system.abilities.str.mod
      if (actor.system.abilities.str.mod < 0) { return '+' + actor.system.class.trainingDie + actor.system.abilities.str.mod } else if (actor.system.abilities.str.mod > 0) { return '+' + actor.system.class.trainingDie + '+' + actor.system.abilities.str.mod } else { return '+' + actor.system.class.trainingDie }
    })

    Handlebars.registerHelper('getGrappleDamage', function (actor) {
      if (!actor.system.class?.trainingDie) return 'd4' + ensurePlus(actor.system.abilities.str.mod)
      if (actor.system.abilities.str.mod < 0) { return 'd4+' + actor.system.class.trainingDie + actor.system.abilities.str.mod } else if (actor.system.abilities.str.mod > 0) { return 'd4+' + actor.system.class.trainingDie + '+' + actor.system.abilities.str.mod } else { return 'd4+' + actor.system.class.trainingDie }
    })

    Hooks.on('renderChatMessageHTML', (message, html, data) => {
      if (message.getFlag('dcc', 'isGrapple')) {
        if (game.user.isGM) {
          message.setFlag('core', 'canPopout', true)
        }

        // Add data-item-id for modules that want to use it
        const itemId = message.getFlag('dcc', 'ItemId')
        if (itemId !== undefined) {
          const messageContent = html.querySelector('.message-content')
          if (messageContent) {
            messageContent.setAttribute('data-item-id', itemId)
          }
        }

        let emoteRolls = false
        try {
          emoteRolls = game.settings.get('dcc', 'emoteRolls')
        } catch {
          if (message.getFlag('dcc', 'emoteRoll') === true) {
            emoteRolls = true
          }
        }

        if (emoteRolls === true) {
          if (game.user.isGM) {
            message.setFlag('dcc', 'emoteRoll', true)
          }
          XCCActorSheetAthlete.emoteGrappleRoll(message, html)
        }
        chat.lookupCriticalRoll(message, html)
      }
    })
  }

  /** @override */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'athlete') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Athlete.ClassLink'), { relativeTo: this.actor })
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'athlete') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Athlete',
        'system.class.className': 'athlete',
        'system.details.sheetClass': 'athlete',
        'system.config.showSkills': false,
        'system.config.showSpells': false
      })
    }

    let isArmorTooHeavy = false
    for (const armorItem of this.actor.itemTypes.armor) {
      if (armorItem.system.equipped && parseInt(armorItem.system.checkPenalty) <= -4) {
        isArmorTooHeavy = true
        break
      }
    }
    this.actor.system.class.armorTooHeavy = isArmorTooHeavy
    if (!isArmorTooHeavy) {
      this.actor.update({
        'system.attributes.ac.otherMod': this.actor.system.class?.scramble || 0,
        'system.attributes.speed.base': this.actor.system.class?.speed || 30
      })
    } else {
      this.actor.update({
        'system.attributes.ac.otherMod': 0,
        'system.attributes.speed.base': 30
      })
    }
    return context
  }

  getGrappleToHit () {
    if (!this.actor.system.class?.trainingDie) return this.actor.system.abilities.str.mod

    if (this.actor.system.abilities.str.mod < 0) { return '+' + this.actor.system.class.trainingDie + this.actor.system.abilities.str.mod } else if (this.actor.system.abilities.str.mod > 0) { return '+' + this.actor.system.class.trainingDie + '+' + this.actor.system.abilities.str.mod } else { return '+' + this.actor.system.class.trainingDie }
  }

  getGrappleDamage () {
    if (!this.actor.system.class?.trainingDie) return 'd4' + ensurePlus(this.actor.system.abilities.str.mod)
    if (this.actor.system.abilities.str.mod < 0) { return 'd4+' + this.actor.system.class.trainingDie + this.actor.system.abilities.str.mod } else if (this.actor.system.abilities.str.mod > 0) { return 'd4+' + this.actor.system.class.trainingDie + '+' + this.actor.system.abilities.str.mod } else { return 'd4+' + this.actor.system.class.trainingDie }
  }

  _onRender (context, options) {
    // Set tooltips for ability boxes
    this.parts.character.firstElementChild.querySelector('div#str.ability-box').firstElementChild.title = game.i18n.localize('XCC.Athlete.RollStrengthCheckHint')
    this.parts.character.firstElementChild.querySelector('div#agl.ability-box').firstElementChild.title = game.i18n.localize('XCC.Athlete.RollAgilityCheckHint')
    this.parts.character.firstElementChild.querySelector('div#sta.ability-box').firstElementChild.title = game.i18n.localize('XCC.Athlete.RollStaminaCheckHint')
    if (game.settings.get(globals.id, 'includeGrappleInWeapons')) {
      // Add the Grapple item to the equipment section
      this.parts.equipment.querySelector('.weapon-list-header').outerHTML +=
        `<li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.athlete.grapple">
            <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
            <img class="icon-filter" src="` + globals.imagesPath + `game-icons-net/grab.svg" title="Grapple" alt="Grapple" width="22" height="22">
            <div class="attack-buttons">
                <div class="rollable weapon-button icon-filter" data-action="rollGrapple" data-drag="false" title="Roll" draggable="false">&nbsp;</div>
            </div>
            <input class="weapon-name" type="text" value="` + game.i18n.localize('XCC.Athlete.Grapple') + `" readonly="">
            <input class="disabled" type="text" value="` + this.getGrappleToHit() + `" readonly="">
            <input class="weapon-damage disabled" style="width: auto;" type="text" value="` + this.getGrappleDamage() + `" readonly="">
            <input class="weapon-notes disabled" type="text" value="` + game.i18n.localize('XCC.Athlete.GrappleNotes') + `" readonly="">
            <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
            <div class="disabled">-</div>
        </li>`
    }
    super._onRender(context, options)
  }

  static rollAbilityCheck (event, target) {
    const options = DCCActorSheet.fillRollOptions(event)
    const ability = target.parentElement.dataset.ability

    // Luck checks are roll under unless the user explicitly clicks the modifier
    const rollUnder = (ability === 'lck') && (target.htmlFor !== 'system.abilities.lck.mod')
    Object.assign(options, {
      rollUnder
    })

    if (ability === 'str' || ability === 'agl' || ability === 'sta') {
      const abilityRef = this.actor.system.abilities[ability]

      // Temporarily modify the ability and its modifier
      const oldMod = CONFIG.DCC.abilityModifiers[abilityRef.value]
      const oldLabel = CONFIG.DCC.abilities[ability]
      // If the actor has a positive luck modifier, apply it to Strength, Agility, or Stamina checks
      if (this.actor.system.abilities.lck.mod > 0) {
        CONFIG.DCC.abilities[ability] = 'XCC.Athlete.' + ability
        CONFIG.DCC.abilityModifiers[abilityRef.value] = oldMod + this.actor.system.abilities.lck.mod
      }

      // If the user is holding shift, add the training die to the action dice
      const oldDie = this.actor.system.attributes.actionDice.value
      if (event.shiftKey) {
        this.actor.system.attributes.actionDice.value += '+' + (this.actor.system.class?.trainingDie || 0)
      }

      // Roll the ability check
      this.actor.rollAbilityCheck(ability, options)

      // Restore the original values after the roll
      if (this.actor.system.abilities.lck.mod > 0) {
        CONFIG.DCC.abilityModifiers[abilityRef.value] = oldMod
        CONFIG.DCC.abilities[ability] = oldLabel
        abilityRef.mod = oldMod
        abilityRef.label = oldLabel
      }
      if (event.shiftKey) {
        this.actor.system.attributes.actionDice.value = oldDie
      }
    } else {
      this.actor.rollAbilityCheck(ability, options)
    }
  }

  static async rollGrappleAttack (event, target) {
    event.preventDefault()
    const options = DCCActorSheet.fillRollOptions(event)
    Object.assign(options, {
      backstab: target.classList.contains('backstab-button')
    })

    const automateDamageFumblesCrits = game.settings.get('dcc', 'automateDamageFumblesCrits')
    const rollMode = game.settings.get('core', 'rollMode')

    // Accumulate all rolls for sending to the chat message
    const rolls = []

    // Attack roll
    options.targets = game.user.targets

    /* Grab the To Hit modifier */
    let toHit = ensurePlus(this.actor.system.class?.trainingDie || 0)
    toHit += ensurePlus(this.actor.system.abilities.str.mod)
    const die = this.actor.system.attributes.actionDice.value

    let critRange = parseInt(this.actor.system.class?.grappleCritRange || 20)

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
        presets: [{ label: die, formula: die }]
      },
      {
        type: 'Compound',
        dieLabel: game.i18n.localize('XCC.Athlete.TrainingDie'),
        modifierLabel: game.i18n.localize('DCC.ToHit'),
        formula: toHit
      }
    ]
    /* Roll the Attack */
    const rollOptions = Object.assign(
      {
        title: game.i18n.localize('DCC.ToHit')
      },
      options
    )
    const attackRoll = await game.dcc.DCCRoll.createRoll(terms, Object.assign({ critical: critRange }, this.actor.getRollData()), rollOptions)
    await attackRoll.evaluate()

    // Adjust crit range if the die size was adjusted
    critRange += parseInt(game.dcc.DiceChain.calculateCritAdjustment(die, attackRoll.formula))

    const d20RollResult = attackRoll.dice[0].total
    attackRoll.dice[0].options.dcc = {
      upperThreshold: critRange
    }
    let deedDieRoll
    let deedDieRollResult = ''
    let deedDieFormula = ''
    let deedSucceed = false
    if (attackRoll.dice.length > 1) {
      attackRoll.dice[1].options.dcc = {
        lowerThreshold: 2,
        upperThreshold: 3
      }
      // Create a proper Roll object for the deed die
      deedDieFormula = attackRoll.dice[1].formula
      deedDieRoll = Roll.fromTerms([attackRoll.dice[1]])
      deedDieRoll._total = attackRoll.dice[1].total
      deedDieRoll._evaluated = true
      deedDieRollResult = attackRoll.dice[1].total
      deedSucceed = deedDieRollResult > 2
    }
    /* Check for crit or fumble */
    const fumble = (d20RollResult === 1)
    const naturalCrit = (d20RollResult >= critRange)
    const crit = (naturalCrit) && !(this.actor.system.class.armorTooHeavy)

    const attackRollResult = {
      d20RollResult,
      deedDieFormula,
      deedDieRollResult,
      deedDieRoll,
      deedSucceed,
      crit,
      formula: game.dcc.DCCRoll.cleanFormula(attackRoll.terms),
      fumble,
      hitsAc: attackRoll.total,
      naturalCrit,
      roll: attackRoll,
      rolled: true,
      weaponDamageFormula: this.getGrappleDamage()
    }

    if (attackRollResult.naturalCrit) {
      options.naturalCrit = true
    }
    foundry.utils.mergeObject(attackRollResult.roll.options, { 'dcc.isAttackRoll': true, 'dcc.isGrappleRoll': true })
    const attackRollHTML = await attackRollResult.roll.render()
    rolls.push(attackRollResult.roll)

    // Damage roll
    let damageRollFormula = attackRollResult.weaponDamageFormula
    if (attackRollResult.deedDieRollResult) {
      const rawDeedFormula = this.actor.system.class.trainingDie // e.g. "d4"
      const deedBonusStringComponent = ensurePlus(rawDeedFormula) // e.g. "+d4", this is what's in the damage formula from warrior bonus
      const deedNumericResult = attackRollResult.deedDieRollResult.toString() // e.g. "4"
      // Determine sign from how deed was added to formula, then append numeric result
      const replacementDeedValueString = (deedBonusStringComponent.startsWith('-') ? '-' : '+') + deedNumericResult // e.g. "+4"
      damageRollFormula = damageRollFormula.replace(deedBonusStringComponent, replacementDeedValueString)
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

    // Deed roll result
    const deedRollSuccess = deedDieRollResult > 2

    // Crit roll
    let critRollFormula = ''
    let critInlineRoll = ''
    let critPrompt = game.i18n.localize('DCC.RollCritical')
    let critRoll
    let critTableName = 'AG: Athlete Grapple'
    let critText = ''
    const luckMod = ensurePlus(this.actor.system.abilities.lck.mod)
    if (attackRollResult.crit) {
      critRollFormula = `${this.actor.system.class.grappleCritDie}${luckMod}`
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
        const critRollAnchor = critRoll.toAnchor({ classes: ['inline-dsn-hidden'], dataset: { damage: critRoll.total } }).outerHTML
        critInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`${critResultPrompt} ${critRollAnchor} (${critTableText} ${critTableName})${critText}`)
      }
    }

    const flags = {
      'dcc.isToHit': true,
      'dcc.isBackstab': false,
      'dcc.isFumble': false,
      'dcc.isCrit': attackRollResult.crit,
      'dcc.isNaturalCrit': attackRollResult.naturalCrit,
      'dcc.isMelee': true,
      'dcc.isArmorTooHeavy': this.actor.system.class.armorTooHeavy,
      'dcc.isGrapple': true,
      'dcc.isNoHeader': true
    }
    game.dcc.FleetingLuck.updateFlags(flags, attackRollResult.roll)

    // Speaker object for the chat cards
    const speaker = ChatMessage.getSpeaker({ actor: this.actor })

    const messageData = {
      user: game.user.id,
      speaker,
      flavor: game.i18n.format('DCC.AttackRoll', 'xcc.athlete.grapple'),
      flags,
      rolls,
      system: {
        actorId: this.actor.id,
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
        deedDieFormula,
        deedDieRoll,
        deedDieRollResult,
        deedRollSuccess,
        hitsAc: attackRollResult.hitsAc,
        targets: game.user.targets,
        weaponId: 'xcc.athlete.grapple',
        weaponName: 'xcc.athlete.grapple',
        armorTooHeavy: this.actor.system.class.armorTooHeavy
      }
    }
    await Hooks.callAll('dcc.rollWeaponAttack', rolls, messageData)

    messageData.content = await foundry.applications.handlebars.renderTemplate('systems/dcc/templates/chat-card-attack-result.html', { message: messageData })
    // Output the results
    ChatMessage.applyRollMode(messageData, rollMode)
    ChatMessage.create(messageData)
  }

  static emoteGrappleRoll (message, html) {
    if (!message.rolls || !message.isContentVisible) return

    let deedRollHTML = ''
    if (message.system.deedDieRollResult) {
      const critical = message.system.deedSucceed ? ' critical' : ''
      let iconClass = 'fa-dice-d20'
      if (message.system?.deedDieFormula.includes('d4')) {
        iconClass = 'fa-dice-d4'
      } else if (message.system?.deedDieFormula.includes('d3') || message.system?.deedDieFormula.includes('d5') || message.system?.deedDieFormula.includes('d6')) {
        iconClass = 'fa-dice-d6'
      } else if (message.system?.deedDieFormula.includes('d7') || message.system?.deedDieFormula.includes('d8')) {
        iconClass = 'fa-dice-d8'
      } else if (message.system?.deedDieFormula.includes('d10')) {
        iconClass = 'fa-dice-d10'
      } else if (message.system?.deedDieFormula.includes('d12') || message.system?.deedDieFormula.includes('d14') || message.system?.deedDieFormula.includes('d16')) {
        iconClass = 'fa-dice-d12'
      }

      let deedDieHTML
      if (message.system.deedDieRoll) {
        // If we have the full roll object, create a proper inline roll
        deedDieHTML = `<a class="inline-roll inline-result${critical}" data-roll="${encodeURIComponent(JSON.stringify(message.system.deedDieRoll))}" title="${message.system?.deedDieFormula}"><i class="fas ${iconClass}"></i>${message.system.deedDieRollResult}</a>`
      } else {
        // Fallback to non-clickable display if roll data is missing
        deedDieHTML = `<span class="inline-roll${critical}" title="${message.system?.deedDieFormula}"><i class="fas ${iconClass}"></i>${message.system.deedDieRollResult}</span>`
      }
      deedRollHTML = game.i18n.format('XCC.Athlete.GrappleRollTrainingEmoteSegment', { deed: deedDieHTML })
      if (message.system.deedRollSuccess) {
        deedRollHTML += game.i18n.format('XCC.Athlete.GrappleRollTrainingSuccess')
      }
    }

    let crit = message.getFlag('dcc', 'isArmorTooHeavy') ? game.i18n.format('XCC.Athlete.ArmorWarning') : ''
    if (message.getFlag('dcc', 'isCrit')) {
      crit = `<p class="emote-alert critical">${message.system.critPrompt}!</p> ${message.system.critInlineRoll}`
    }
    const fumble = ''

    const damageInlineRoll = message.system.damageInlineRoll.replaceAll('@ab', message.system.deedDieRollResult)

    const attackEmote = game.i18n.format('XCC.GrappleRollEmote', {
      actionName: 'attacks',
      actorName: message.alias,
      weaponName: 'grapple',
      rollHTML: message.rolls[0].toAnchor().outerHTML,
      deedRollHTML,
      damageRollHTML: damageInlineRoll,
      crit,
      fumble,
      rollResult: message.rolls[0].total,
      rollResult2: message.rolls[0].total - 4,
      rollResult3: message.rolls[0].total - 8,
      rollResult4: message.rolls[0].total - 12
    })
    const messageContent = html.querySelector('.message-content')
    if (messageContent) {
      messageContent.innerHTML = attackEmote
    }
  }
}
export default XCCActorSheetAthlete
