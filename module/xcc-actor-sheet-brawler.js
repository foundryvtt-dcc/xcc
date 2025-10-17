/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import { ensurePlus, getCritTableResult, getFumbleTableResult, getNPCFumbleTableResult, getFumbleTableNameFromCritTableName } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetBrawler extends XCCActorSheet {
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollUnarmedAttack: this.rollUnarmedAttack
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
    brawler: {
      id: 'brawler',
      template: globals.templatesPath + 'actor-partial-brawler.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'brawler', group: 'sheet', label: 'XCC.Brawler.ActorSheetBrawler' }
      ]
    }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getBrawlerToHit', function (actor) {
      const lck = String(actor.system.abilities.lck.mod)[0] === '-' ? '' : actor.system.abilities.lck.mod || ''
      const str = actor.system.abilities.str.mod || ''
      const ab = actor.system.details.attackBonus || ''
      return ab + ensurePlus(str + lck)
    })

    Handlebars.registerHelper('getBrawlerDamage', function (actor) {
      const lck = String(actor.system.abilities.lck.mod)[0] === '-' ? '' : actor.system.abilities.lck.mod || ''
      const str = actor.system.abilities.str.mod || ''
      const die = actor.system.class.unarmedDamage || ''
      return die + ensurePlus(str + lck)
    })

    Handlebars.registerHelper('positiveOrZero', function (value) {
      // If the value starts with '-', return '+0', otherwise return the original value
      const stringValue = String(value)
      return stringValue.startsWith('-') ? '+0' : stringValue
    })
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    // Update class link before default prepareContext to ensure it is correct
    if (this.actor.system.details.sheetClass !== 'brawler') {
      await this.actor.update({
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Brawler.ClassLink'), { relativeTo: this.actor })
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'brawler') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Brawler',
        'system.class.className': 'brawler',
        'system.details.sheetClass': 'brawler',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }

    return context
  }

  getBrawlerToHit () {
    const lck = String(this.actor.system.abilities.lck.mod)[0] === '-' ? '' : this.actor.system.abilities.lck.mod || ''
    const str = this.actor.system.abilities.str.mod || ''
    const ab = this.actor.system.details.attackBonus || ''
    return ab + ensurePlus(str + lck)
  }

  getBrawlerDamage () {
    const lck = String(this.actor.system.abilities.lck.mod)[0] === '-' ? '' : this.actor.system.abilities.lck.mod || ''
    const str = this.actor.system.abilities.str.mod || ''
    const die = this.actor.system.class.unarmedDamage || ''
    const ab = this.actor.system.details.attackBonus || ''
    return die + ensurePlus(ab) + ensurePlus(str + lck)
  }

  static async rollUnarmedAttack (event, target) {
    event.preventDefault()
    const options = XCCActorSheet.fillRollOptions(event)
    const type = XCCActorSheet.findDataset(target, 'itemId')

    const automateDamageFumblesCrits = game.settings.get('dcc', 'automateDamageFumblesCrits')
    const rollMode = game.settings.get('core', 'rollMode')
    // Accumulate all rolls for sending to the chat message
    const rolls = []
    // Attack roll
    options.targets = game.user.targets
    let critRange = 20
    let die = 'd14'
    if (type === 'xcc.brawler.unarmedRegular') {
      die = 'd16'
      critRange = 16
    }
    const toHit = this.getBrawlerToHit()
    /* If we don't have a valid formula, bail out here */
    if (!Roll.validate(toHit)) {
      console.log('Unarmed attack formula is invalid: ' + toHit)
      return {
        rolled: false,
        formula: toHit
      }
    }
    console.log('Rolling unarmed attack with formula: ' + toHit)
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
        dieLabel: game.i18n.localize('DCC.DeedDie'),
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

    const actionDieRollResult = attackRoll.dice[0].total
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
    const fumble = (actionDieRollResult === 1)
    const naturalCrit = (actionDieRollResult >= critRange)
    const crit = (naturalCrit) && !(this.actor.system.class.armorTooHeavy)

    const attackRollResult = {
      actionDieRollResult,
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
      weaponDamageFormula: ensurePlus(this.getBrawlerDamage())
    }

    if (attackRollResult.naturalCrit) {
      options.naturalCrit = true
    }
    foundry.utils.mergeObject(attackRollResult.roll.options, { 'dcc.isAttackRoll': true, 'dcc.isUnarmedRoll': true })
    const attackRollHTML = await attackRollResult.roll.render()
    rolls.push(attackRollResult.roll)

    // Damage roll
    let damageRollFormula = attackRollResult.weaponDamageFormula
    if (attackRollResult.deedDieRollResult) {
      const rawDeedFormula = this.actor.system.details.attackBonus // e.g. "d4"
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
    let critTableName = this.actor.system.attributes.critical?.table || ''
    let critText = ''
    const luckMod = ensurePlus(this.actor.system.abilities.lck.mod)
    if (attackRollResult.crit) {
      critRollFormula = `${this.actor.system.attributes.critical?.die || 'd4'}${luckMod}`
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

    // Fumble roll
    let fumbleRollFormula = ''
    let fumbleInlineRoll = ''
    let fumblePrompt = ''
    let useNPCFumbles = true // even if core compendium isn't installed, still show correct fumble table in flavor text
    try {
      useNPCFumbles = game.settings.get('dcc-core-book', 'registerNPCFumbleTables') || true
    } catch {
      // warn to console log
      console.warn('DCC | Error reading "registerNPCFumbleTables" setting from "dcc-core-book" module. Defaulting useNPCFumbles to true.')
    }
    let fumbleTableName = (this.actor.isPC || !useNPCFumbles) ? 'Table 4-2: Fumbles' : getFumbleTableNameFromCritTableName(critTableName)

    let fumbleText = ''
    let fumbleRoll
    const inverseLuckMod = ensurePlus((parseInt(this.actor.system.abilities.lck.mod) * -1).toString())
    if (attackRollResult.fumble) {
      fumbleRollFormula = `${this.actor.system.attributes.fumble.die}${inverseLuckMod}`
      if (this.actor.isNPC && useNPCFumbles) {
        fumbleRollFormula = '1d10'
      }
      fumbleInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`[[/r ${fumbleRollFormula} # Fumble (${fumbleTableName})]] (${fumbleTableName})`)
      if (type === 'xcc.brawler.unarmedRegular') { fumblePrompt = game.i18n.localize('XCC.RollFumbleTwoWeapons') } else { fumblePrompt = game.i18n.localize('DCC.RollFumble') }
      if (automateDamageFumblesCrits) {
        if (type === 'xcc.brawler.unarmedRegular') { fumblePrompt = game.i18n.localize('XCC.FumbleTwoWeapons') } else { fumblePrompt = game.i18n.localize('DCC.Fumble') }
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
        let fumbleResult
        if (this.actor.isPC || !useNPCFumbles) {
          fumbleResult = await getFumbleTableResult(fumbleRoll)
        } else {
          fumbleTableName = getFumbleTableNameFromCritTableName(critTableName)
          fumbleResult = await getNPCFumbleTableResult(fumbleRoll, fumbleTableName)
        }
        if (fumbleResult) {
          fumbleTableName = `${fumbleResult?.parent?.link}:<br>`.replace('Fumble Table ', '').replace('Crit/', '')
          fumbleText = await foundry.applications.ux.TextEditor.enrichHTML(fumbleResult.description)
        }
        const onPrep = game.i18n.localize('DCC.on')
        const fumbleRollAnchor = fumbleRoll.toAnchor({ classes: ['inline-dsn-hidden'], dataset: { damage: fumbleRoll.total } }).outerHTML
        fumbleInlineRoll = await foundry.applications.ux.TextEditor.enrichHTML(`${fumbleRollAnchor} ${onPrep} ${fumbleTableName} ${fumbleText}`)
      }
    }

    const flags = {
      'dcc.isToHit': true,
      'dcc.isBackstab': false,
      'dcc.isFumble': attackRollResult.fumble,
      'dcc.isCrit': attackRollResult.crit,
      'dcc.isNaturalCrit': attackRollResult.naturalCrit,
      'dcc.isMelee': true,
      'dcc.isUnarmed': true
    }
    game.dcc.FleetingLuck.updateFlags(flags, attackRollResult.roll)

    // Speaker object for the chat cards
    const speaker = ChatMessage.getSpeaker({ actor: this.actor })

    const messageData = {
      user: game.user.id,
      speaker,
      flavor: game.i18n.format('DCC.AttackRoll', game.i18n.localize('XCC.Brawler.UnarmedAttack').toLowerCase()),
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
        fumbleInlineRoll,
        fumblePrompt,
        fumbleRoll,
        fumbleRollFormula,
        fumbleTableName,
        hitsAc: attackRollResult.hitsAc,
        targets: game.user.targets,
        weaponId: type,
        weaponName: game.i18n.localize('XCC.Brawler.UnarmedAttack').toLowerCase()
      }
    }
    await Hooks.callAll('dcc.rollWeaponAttack', rolls, messageData)

    messageData.content = await foundry.applications.handlebars.renderTemplate('systems/dcc/templates/chat-card-attack-result.html', { message: messageData })
    // Output the results
    ChatMessage.applyRollMode(messageData, rollMode)
    ChatMessage.create(messageData)
  }

  _onRender (context, options) {
    if (game.settings.get(globals.id, 'includeUnarmedInWeapons')) {
      // Add the Grapple item to the equipment section
      this.parts.equipment.querySelector('.weapon-list-header').outerHTML +=
        `<li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.brawler.unarmedRegular">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <img class="icon-filter" src="` + globals.imagesPath + 'game-icons-net/rock.svg" title="' + game.i18n.localize('XCC.Brawler.UnarmedRegularShort') + '" alt="' + game.i18n.localize('XCC.Brawler.UnarmedRegularShort') + `" width="22" height="22">
              <div class="attack-buttons">
                  <div class="rollable two-attack-button icon-filter" data-action="rollUnarmedAttack" data-drag="false" title="Roll" draggable="false">&nbsp;</div>
              </div>
              <input class="weapon-name" type="text" value="` + game.i18n.localize('XCC.Brawler.UnarmedRegularShort') + `" readonly="">
              <input class="disabled" type="text" value="` + this.getBrawlerToHit() + `" readonly="">
              <input class="weapon-damage disabled" style="width: auto;" type="text" value="` + this.getBrawlerDamage() + `" readonly="">
              <input class="weapon-notes disabled" type="text" value="` + game.i18n.localize('XCC.Brawler.UnarmedRegularNote') + `" readonly="">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <div class="disabled">-</div>
          </li>
          <li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.brawler.unarmedFree">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <img class="icon-filter" src="` + globals.imagesPath + 'game-icons-net/rock.svg" title="' + game.i18n.localize('XCC.Brawler.UnarmedFreeShort') + '" alt="' + game.i18n.localize('XCC.Brawler.UnarmedFreeShort') + `" width="22" height="22">
              <div class="attack-buttons">
                  <div class="rollable free-attack-button icon-filter" data-action="rollUnarmedAttack" data-drag="false" title="Roll" draggable="false">&nbsp;</div>
              </div>
              <input class="weapon-name" type="text" value="` + game.i18n.localize('XCC.Brawler.UnarmedFreeShort') + `" readonly="">
              <input class="disabled" type="text" value="` + this.getBrawlerToHit() + `" readonly="">
              <input class="weapon-damage disabled" style="width: auto;" type="text" value="` + this.getBrawlerDamage() + `" readonly="">
              <input class="weapon-notes disabled" type="text" value="` + game.i18n.localize('XCC.Brawler.UnarmedFreeNote') + `" readonly="">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <div class="disabled">-</div>
          </li>`
    }
    super._onRender(context, options)
  }
}
export default XCCActorSheetBrawler
