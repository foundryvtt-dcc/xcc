/* eslint-disable import/no-absolute-path */
/* global CONFIG, ChatMessage, foundry, game, Handlebars, Hooks */
import XCCActorSheet from './xcc-actor-sheet.js'
import DiceChain from '/systems/dcc/module/dice-chain.js'
import { globals } from './settings.js'
import { getFameModifier } from './xcc-utils.js'

/**
 * The Dungeon Hottie, from XCC Insider #1: a celebrity in the arena for three
 * levels, who then reinvents themselves as a blaster, brawler or specialist.
 *
 * Attractiveness and the Luck bonus live in an Active Effect on the actor
 * rather than on this sheet, because the rules keep them through Reinvention -
 * switching the character to another class sheet must not take them away.
 */

const CLASS_ID = 'dungeon-hottie'
const TRAINED_WEAPONS = ['crossbow', 'dagger', 'longsword', 'shortbow', 'short sword', 'sling', 'spear']

// Marks the effects and weapon overrides this sheet manages, so it never
// touches ones the player made by hand.
const EFFECT_FLAG = 'hottieEffect'
const DEED_FLAG = 'hottieDeed'

/** 'Short sword', 'short sword' and 'Dagger (Ranged)' all compare as one type. */
const weaponKey = name => String(name ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '')
const signed = n => (n < 0 ? `${n}` : `+${n}`)
const toNumber = value => {
  const n = parseInt(value)
  return Number.isFinite(n) ? n : 0
}

class XCCActorSheetDungeonHottie extends XCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 670
    },
    actions: {
      rollAllure: this.rollAllure,
      rollPersuade: this.rollPersuade,
      toggleNotInTheFace: this.toggleNotInTheFace
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
    dungeonHottie: {
      id: 'dungeon-hottie',
      template: globals.templatesPath + 'actor-partial-dungeon-hottie.html'
    },
    wizardSpells: {
      id: 'wizardSpells',
      template: globals.templatesPath + 'actor-partial-spells.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'dungeon-hottie', group: 'sheet', label: 'XCC.DungeonHottie.ActorSheetDungeonHottie' },
        { id: 'wizardSpells', group: 'sheet', label: 'DCC.WizardSpells' }
      ]
    }
  }

  /**
   * Values for the `{tokens}` in this class's Benefits and Restrictions. Those
   * entries are enriched once for the whole class, so anything that depends on
   * the character is left as a token and filled in here - see the
   * `getEnrichedArray` helper in xcc.js.
   *
   * @param {Actor} actor
   * @returns {Record<string, string>}
   */
  static classTokens (actor) {
    const level = Math.min(3, Math.max(1, toNumber(actor?.system?.details?.level?.value)))
    return {
      nitfBonus: String(toNumber(actor?.system?.class?.notInTheFace)),
      nitfLimit: game.i18n.localize(`XCC.DungeonHottie.NitfLimit${level}`),
      // Only an Arcane Spell hottie has a blaster die to read, so for anyone
      // else this resolves to nothing and its entry drops out of the list.
      blasterDieNote: actor?.system?.class?.oneMove === 'arcane'
        ? game.i18n.localize('XCC.DungeonHottie.BlasterDieNote')
        : ''
    }
  }

  /**
   * One of the effects this sheet manages.
   * @param {Actor} actor
   * @param {'starQuality'|'notInTheFace'} kind
   * @returns {ActiveEffect|undefined}
   */
  static getEffect (actor, kind) {
    return actor?.effects?.find(effect => effect.getFlag(globals.id, EFFECT_FLAG) === kind)
  }

  /** Backstab is off with an armor check penalty worse than -2. */
  static isBackstabBlocked (actor) {
    return toNumber(actor?.system?.attributes?.ac?.checkPenalty) < -2
  }

  /**
   * Everything Attractiveness and Luck contribute, as effect changes.
   *
   * The Personality half of Attractiveness is not here: it applies to the
   * class's own Persuade roll - see `rollPersuade`.
   *
   * @param {Actor} actor
   * @returns {object[]}
   */
  static starQualityChanges (actor) {
    // Written as a number rather than an @-reference: the rules cap
    // Attractiveness at +3 after Reinvention, and DCC substitutes references
    // without doing arithmetic on them. Re-written whenever the level changes.
    const capped = Math.min(3, Math.max(0, toNumber(actor?.system?.details?.level?.value)))
    const level = String(capped)
    // Signed, so it stays a formula fragment rather than a bare number. DCC's
    // own custom-change handler calls `.match` on the value of every custom
    // change whose target holds a string, and a number there throws on every
    // actor prepare. A signed fragment also appends cleanly to whatever
    // another effect has already contributed.
    const grandstanding = signed(capped)
    const luck = '@system.abilities.lck.mod'
    return [
      { key: 'system.attributes.init.otherMod', type: 'add', value: level },
      // Custom: XCC's applyActiveEffect listener appends it to the roll formula.
      { key: 'system.rewards.grandstandingMod', type: 'custom', value: grandstanding },
      { key: 'system.saves.frt.otherBonus', type: 'add', value: luck },
      { key: 'system.saves.ref.otherBonus', type: 'add', value: luck },
      { key: 'system.saves.wil.otherBonus', type: 'add', value: luck }
    ]
  }

  /**
   * The Allure check: action die + Personality + CL + the Fame modifier, which
   * past 60 Fame steps up the die instead of adding to the total.
   * @param {Actor} actor
   * @returns {{die: string, bonus: number}}
   */
  static getAllure (actor) {
    const { mod, dieSteps } = getFameModifier(toNumber(actor?.system?.rewards?.fame))
    const die = dieSteps ? DiceChain.bumpDie('1d20', dieSteps) : '1d20'
    const bonus = toNumber(actor?.system?.abilities?.per?.mod) + toNumber(actor?.system?.details?.level?.value) + mod
    return { die, bonus }
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('isHottieDefending', actor => {
      const effect = this.getEffect(actor, 'notInTheFace')
      return !!effect && !effect.disabled
    })
    Handlebars.registerHelper('hottieBackstabBlocked', actor => this.isBackstabBlocked(actor))
    Handlebars.registerHelper('hottieDeedWeapons', () => TRAINED_WEAPONS)
    Handlebars.registerHelper('getHottiePersuadeBonus', actor => signed(
      toNumber(actor?.system?.abilities?.per?.mod) + toNumber(actor?.system?.details?.level?.value)))
    Handlebars.registerHelper('getHottieAllureBonus', actor => {
      const { die, bonus } = this.getAllure(actor)
      return die === '1d20' ? signed(bonus) : `${die}${signed(bonus)}`
    })

    // Not In The Face is spent defending for one round, so it clears when an
    // encounter starts and at the top of every round after it. Only the active
    // GM writes, so one client makes the change however many have the sheet up.
    const clearDefending = async (combat) => {
      if (game.users.activeGM !== game.user) return
      for (const combatant of combat?.combatants ?? []) {
        const effect = this.getEffect(combatant.actor, 'notInTheFace')
        if (effect && !effect.disabled) await effect.update({ disabled: true })
      }
    }
    Hooks.on('combatStart', clearDefending)
    Hooks.on('combatRound', clearDefending)

    // Repair actors carrying the earlier numeric value, which throws in DCC's
    // custom-effect handler on every prepare until it is rewritten. One pass,
    // on the active GM's client only.
    Hooks.once('ready', async () => {
      if (game.users.activeGM !== game.user) return
      let repaired = 0
      for (const actor of game.actors) {
        if (await this.repairStarQuality(actor)) repaired++
      }
      if (repaired) console.log(`XCC | Star Quality rewritten on ${repaired} actor(s)`)
    })

    // On a level change: Attractiveness is a written number, so it has to be
    // rewritten, and Too Cute to Die comes back.
    Hooks.on('updateActor', async (actor, changes, options, userId) => {
      if (userId !== game.user.id) return
      if (foundry.utils.getProperty(changes, 'system.details.level.value') === undefined) return
      if (actor.system.details?.sheetClass !== CLASS_ID) return
      await this.syncStarQuality(actor)
      if (actor.system.class?.tooCuteUsed) await actor.update({ 'system.class.tooCuteUsed': false })
    })
  }

  /** @inheritDoc */
  async _prepareContext (options) {
    if (this.actor.isOwner) await this.#syncClassState()

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== CLASS_ID) {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.DungeonHottie',
        'system.class.className': 'dungeonhottie',
        'system.details.sheetClass': CLASS_ID,
        'system.class.spellCheckAbility': 'per',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'flat',
        // Attractiveness adds CL to initiative through the Star Quality
        // effect instead, so it outlives this sheet.
        'system.config.addClassLevelToInitiative': false
      })
    }

    return context
  }

  /**
   * @inheritDoc
   * The Spells tab only for an Arcane Spell hottie.
   */
  _getTabsConfig (group) {
    const config = super._getTabsConfig(group)
    if (group !== 'sheet' || !config || this.actor?.system?.class?.oneMove === 'arcane') return config
    config.tabs = config.tabs.filter(tab => tab.id !== 'wizardSpells')
    const tabIds = config.tabs.map(tab => tab.id)
    if (!tabIds.includes(this.tabGroups[group])) {
      this.tabGroups[group] = tabIds.includes(config.initial) ? config.initial : tabIds[0]
    }
    return config
  }

  /**
   * Bring the actor in line with the class: the One Move's switches, the
   * managed effects, and the deed weapon. Each write happens only when the
   * value actually differs, so the re-render it causes settles immediately.
   */
  async #syncClassState () {
    const actor = this.actor
    const oneMove = actor.system.class?.oneMove || ''

    const showSpells = oneMove === 'arcane'
    const showBackstab = oneMove === 'sneaking' && !XCCActorSheetDungeonHottie.isBackstabBlocked(actor)
    const config = {}
    if (actor.system.config?.showSpells !== showSpells) config['system.config.showSpells'] = showSpells
    if (actor.system.config?.showBackstab !== showBackstab) config['system.config.showBackstab'] = showBackstab
    if (Object.keys(config).length) await actor.update(config)

    await this.#syncEffects()
    await this.#syncDeedWeapon()
  }

  /**
   * Create the two managed effects if they are missing, and keep Star
   * Quality's change list current.
   *
   * Changes go in `system.changes`, v14's own shape - a top-level `changes`
   * array still works but only through a deprecated migration.
   *
   * Values are @-references to full document paths - DCC resolves them
   * against the actor itself, not its roll data - so they follow the level
   * and Luck without the sheet having to be open.
   */
  async #syncEffects () {
    await XCCActorSheetDungeonHottie.syncStarQuality(this.actor)

    const create = []
    if (!XCCActorSheetDungeonHottie.getEffect(this.actor, 'notInTheFace')) {
      create.push({
        name: game.i18n.localize('XCC.DungeonHottie.NotInTheFaceEffect'),
        img: 'icons/svg/shield.svg',
        origin: this.actor.uuid,
        // Off until the hottie spends a round defending.
        disabled: true,
        system: {
          changes: [
            { key: 'system.attributes.ac.otherMod', type: 'add', value: '@system.class.notInTheFace' }
          ]
        },
        flags: { [globals.id]: { [EFFECT_FLAG]: 'notInTheFace' } }
      })
    }

    if (create.length) await this.actor.createEmbeddedDocuments('ActiveEffect', create)
  }

  /**
   * Create Star Quality if it is missing, or bring its changes up to date.
   *
   * Static so the level-up listener can reach an actor whose sheet is closed -
   * and, after Reinvention, is no longer this sheet at all.
   *
   * @param {Actor} actor
   * @returns {Promise}
   */
  static async syncStarQuality (actor) {
    const changes = this.starQualityChanges(actor)
    const star = this.getEffect(actor, 'starQuality')

    if (!star) {
      return actor.createEmbeddedDocuments('ActiveEffect', [{
        name: game.i18n.localize('XCC.DungeonHottie.StarQualityEffect'),
        img: globals.imagesPath + 'game-icons-net/crowned-heart.svg',
        origin: actor.uuid,
        disabled: false,
        system: { changes },
        flags: { [globals.id]: { [EFFECT_FLAG]: 'starQuality' } }
      }])
    }

    const current = (star.system?.changes ?? []).map(change => ({
      key: change.key, type: change.type, value: change.value
    }))
    if (JSON.stringify(current) !== JSON.stringify(changes)) await star.update({ 'system.changes': changes })
  }

  /**
   * Rewrite a Star Quality effect that was stored with a number on its custom
   * change.
   *
   * DCC's own handler for custom changes calls `.match` on the value of every
   * one whose target holds a string, so a number there throws on every actor
   * prepare - at world load, before any sheet has had a chance to correct it.
   *
   * @param {Actor} actor
   * @returns {Promise<boolean>}   Whether it needed rewriting
   */
  static async repairStarQuality (actor) {
    const star = this.getEffect(actor, 'starQuality')
    const stale = (star?.system?.changes ?? []).some(change =>
      change.type === 'custom' && typeof change.value !== 'string')
    if (!stale) return false
    await this.syncStarQuality(actor)
    return true
  }

  /**
   * Put the deed die on the chosen weapon, and only that one.
   *
   * DCC detects a deed from the weapon's own to-hit (`+d3+2`), which the
   * weapon's attack bonus override sets - so the chosen weapon gets DCC's own
   * Mighty Deed handling while every other attack keeps the flat class bonus.
   * The damage override carries the deed die too, so a deed adds to damage
   * the way a brawler's does.
   *
   * DCC finds the rolled deed die in the damage formula by text, and keeps its
   * leading 1 whenever the attack bonus starts with +1 (rolls-weapon-mixin), so
   * the formula has to spell it the same way or the deed never reaches damage.
   *
   * A weapon with an override the player set by hand is left alone.
   *
   * @param {Actor} actor
   * @returns {object[]}   Weapon updates; empty when everything already matches
   */
  static deedWeaponUpdates (actor) {
    const system = actor.system
    const die = String(system.class?.deedDie || '').trim().replace(/^\+?1?d/, 'd')
    const chosen = weaponKey(system.class?.deedWeapon)
    const active = system.class?.oneMove === 'deed' && !!chosen && /^d\d+$/.test(die)
    const token = String(system.details?.attackBonus ?? '').startsWith('+1') ? `1${die}` : die
    const base = toNumber(system.details?.attackBonus)

    const updates = []
    for (const weapon of actor.itemTypes.weapon) {
      const ours = !!weapon.getFlag(globals.id, DEED_FLAG)
      const config = weapon.system.config ?? {}

      if (active && weaponKey(weapon.name) === chosen) {
        if (!ours && (config.attackBonusOverride || config.damageOverride)) continue
        const range = weapon.system.melee ? 'melee' : 'missile'
        const toHitMod = toNumber(system.details?.attackHitBonus?.[range]?.value) - base +
          toNumber(weapon.system.attackBonusWeapon) + toNumber(weapon.system.attackBonusLucky)
        const damageMod = toNumber(system.details?.attackDamageBonus?.[range]?.value) +
          toNumber(weapon.system.damageWeaponBonus)
        const weaponDie = weapon.system.damageWeapon || ''
        let damage = `${weapon.system.doubleIfMounted ? `(${weaponDie})*2` : weaponDie}+${token}${signed(damageMod)}`
        if (weapon.system.subdual) damage += '[subdual]'
        const attack = `+${token}${signed(toHitMod)}`

        if (!ours || config.attackBonusOverride !== attack || config.damageOverride !== damage) {
          updates.push({
            _id: weapon.id,
            'system.config.attackBonusOverride': attack,
            'system.config.damageOverride': damage,
            [`flags.${globals.id}.${DEED_FLAG}`]: true
          })
        }
      } else if (ours) {
        updates.push({
          _id: weapon.id,
          'system.config.attackBonusOverride': '',
          'system.config.damageOverride': '',
          [`flags.${globals.id}.${DEED_FLAG}`]: false
        })
      }
    }

    return updates
  }

  /** Apply {@link deedWeaponUpdates} to this sheet's actor. */
  async #syncDeedWeapon () {
    const updates = XCCActorSheetDungeonHottie.deedWeaponUpdates(this.actor)
    if (updates.length) await this.actor.updateEmbeddedDocuments('Item', updates)
  }

  /**
   * Persuade: the Personality check Attractiveness applies to - action die +
   * Personality + CL. Its own roll rather than a bonus on the system's
   * Personality check, so it is clear at the table which rolls it covers.
   */
  static async rollPersuade (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = XCCActorSheet.fillRollOptions(event)
    const actor = this.actor
    const label = game.i18n.localize('XCC.DungeonHottie.Persuade')

    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: actor.system.attributes.actionDice.value || '1d20'
      },
      {
        type: 'Modifier',
        label: game.i18n.localize(CONFIG.DCC.abilities.per),
        formula: signed(toNumber(actor.system.abilities.per.mod))
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.DungeonHottie.Attractiveness'),
        formula: signed(toNumber(actor.system.details.level.value))
      }
    ]

    const roll = await game.dcc.DCCRoll.createRoll(terms, actor.getRollData(), Object.assign({ title: label }, options))
    await roll.evaluate()

    const flags = { 'dcc.isPersuadeCheck': true, 'dcc.RollType': 'SkillCheck' }
    game.dcc.FleetingLuck.updateFlags(flags, roll)
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${actor.name} - ${label}`,
      flags
    })

    return roll
  }

  static async rollAllure (event, target) {
    event.preventDefault()

    // Get roll options from the DCC system (handles CTRL-click dialog)
    const options = XCCActorSheet.fillRollOptions(event)
    const { die, bonus } = XCCActorSheetDungeonHottie.getAllure(this.actor)

    const terms = [
      {
        type: 'Die',
        label: game.i18n.localize('DCC.ActionDie'),
        formula: die
      },
      {
        type: 'Modifier',
        label: game.i18n.localize('XCC.DungeonHottie.Allure'),
        formula: signed(bonus)
      }
    ]

    const rollOptions = Object.assign({ title: game.i18n.localize('XCC.DungeonHottie.Allure') }, options)
    const roll = await game.dcc.DCCRoll.createRoll(terms, this.actor.getRollData(), rollOptions)
    await roll.evaluate()

    const flags = {
      'dcc.isAllureCheck': true,
      'dcc.RollType': 'AllureCheck',
      'dcc.isNoHeader': true
    }
    game.dcc.FleetingLuck.updateFlags(flags, roll)

    const duration = Math.max(1, toNumber(this.actor.system.details.level.value))
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: game.i18n.format('XCC.DungeonHottie.AllureMessage', {
        actorName: this.actor.name,
        rollHTML: roll.toAnchor().outerHTML,
        rollResult: roll.total,
        duration
      }),
      sound: CONFIG.sounds.dice,
      flags,
      flavor: `${this.actor.name} - ${game.i18n.localize('XCC.DungeonHottie.Allure')}`
    })

    return roll
  }

  /** Switch the Not In The Face AC bonus on or off. */
  static async toggleNotInTheFace (event, target) {
    if (!XCCActorSheetDungeonHottie.getEffect(this.actor, 'notInTheFace')) await this.#syncEffects()
    const effect = XCCActorSheetDungeonHottie.getEffect(this.actor, 'notInTheFace')
    if (effect) await effect.update({ disabled: !effect.disabled })
  }
}

export default XCCActorSheetDungeonHottie
