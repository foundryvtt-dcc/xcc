/* eslint-disable import/no-absolute-path */
/* global CONFIG, document, foundry, game, getComputedStyle, Hooks */
import XCCActorSheetAthlete from './xcc-actor-sheet-athlete.js'
import XCCActorSheetBlaster from './xcc-actor-sheet-blaster.js'
import XCCActorSheetBrawler from './xcc-actor-sheet-brawler.js'
import XCCActorSheetJammer from './xcc-actor-sheet-jammer.js'
import XCCActorSheetMessenger from './xcc-actor-sheet-messenger.js'
import XCCActorSheetDungeonHottie from './xcc-actor-sheet-dungeon-hottie.js'
import XCCActorSheetSpAcrobat from './xcc-actor-sheet-sp-acrobat.js'
import XCCActorSheetSpCommando from './xcc-actor-sheet-sp-commando.js'
import XCCActorSheetSpCriminal from './xcc-actor-sheet-sp-criminal.js'
import XCCActorSheetSpCryptRaider from './xcc-actor-sheet-sp-crypt-raider.js'
import XCCActorSheetSpScout from './xcc-actor-sheet-sp-scout.js'
import XCCActorSheetSpDwarfMechanic from './xcc-actor-sheet-sp-dwarf-mechanic.js'
import XCCActorSheetSpElfTrickster from './xcc-actor-sheet-sp-elf-trickster.js'
import XCCActorSheetSpHalfOrcSlayer from './xcc-actor-sheet-sp-half-orc-slayer.js'
import XCCActorSheetSpHalflingRogue from './xcc-actor-sheet-sp-halfling-rogue.js'
import XCCActorSheetHalfOrc from './xcc-actor-sheet-half-orc.js'
import XCCActorSheetHalfElf from './xcc-actor-sheet-half-elf.js'
import XCCActorSheetGnome from './xcc-actor-sheet-gnome.js'
import XCCActorSheetDwarf from './xcc-actor-sheet-dwarf.js'
import XCCActorSheetGeneric from './xcc-actor-sheet-generic.js'
import XCCActorParser from './xcc-parser.js'
import XCC from '../config.js'

import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { calculateSpellCheckBonus, signedFormula } from './xcc-utils.js'
import { globals, registerModuleSettings } from './settings.js'
import { checkReleaseNotes } from './xcc-release-notes.js'
import { registerI18nOverrides } from './xcc-i18n.js'
import { installMojo } from './xcc-mojo.js'
import { addGrandstandingSidebarTools, registerGrandstandingHooks } from './xcc-grandstanding.js'
import { addLuckOverviewSidebarTool, registerLuckOverviewHooks } from './xcc-luck-overview.js'
import { registerDeedDieDialogHooks } from './xcc-deed-die-dialog.js'
import { registerTokenHudHooks } from './xcc-token-hud.js'
import { defineStatusEffects, registerColorMarkerHooks } from './xcc-status-effects.js'
import { registerOutfitHooks } from './xcc-outfits.js'
import { registerSkillDCHooks } from './xcc-skill-dcs.js'

const { SchemaField, StringField, NumberField, BooleanField, HTMLField } = foundry.data.fields

/** `{token}` placeholders a class sheet can fill in its own rules text. */
const TOKEN = /\{(\w+)\}/g

/**
 * Override `system.class.spellCheck` with XCC's class-specific bonus
 * (blaster-die, sp-elf-trickster luck mod, etc.) after DCC's default
 * computation has run. DCC handles the `spellCheckOverride` case
 * itself, so we only step in for the fallback path.
 *
 * Replaces the `XCCActor` subclass + global
 * `CONFIG.Actor.documentClass` replacement retired 2026-05-18 — DCC
 * shipped the `dcc.afterComputeSpellCheck` extension hook for exactly
 * this use case. See dcc/docs/dev/EXTENSION_API.md.
 */
Hooks.on('dcc.afterComputeSpellCheck', (actor) => {
  if (!actor.system.class.spellCheckOverride) {
    actor.system.class.spellCheck = calculateSpellCheckBonus(actor)
  }
})

/**
 * Let an Active Effect append a roll formula to `system.rewards.grandstandingMod`.
 *
 * DCC replaces core's `applyActiveEffects` wholesale (see
 * `dcc/module/actor/active-effects-mixin.mjs`) and its `add` handler drops a
 * change carrying a die, since `Number('+1d3')` is NaN. The `applyActiveEffect`
 * hook fired for `custom` changes is its one extension point, so formula
 * fragments come in through here. Concatenating is what makes them stack:
 * '+2' and '+1d3' compose into '+2+1d3'.
 */
Hooks.on('applyActiveEffect', (actor, change, current, value) => {
  if (change.key !== 'system.rewards.grandstandingMod') return
  const addition = signedFormula(value)
  if (!addition) return
  foundry.utils.setProperty(actor, change.key, `${signedFormula(current)}${addition}`)
})

/* -------------------------------------------- */
/*  Schema Extensions                           */
/* -------------------------------------------- */
/**
 * Extend the DCC base actor schema with XCC-specific fields.
 * This hook runs during DCC system initialization, before module init.
 */
Hooks.on('dcc.defineBaseActorSchema', (schema) => {
  // Add sheetClass to details - used to track which XCC class sheet is active
  schema.details.fields.sheetClass = new StringField({ initial: '' })
  // The XCC sheet repurposes DCC's Title input as the actor's casting, so the
  // value needs somewhere of its own to live - an undeclared field is dropped
  // on validation and the input silently reverts to its placeholder
  schema.details.fields.casting = new StringField({ initial: '' })
})

/**
 * Extend the DCC Player schema with XCC-specific class and reward fields.
 * This hook runs during DCC system initialization, before module init.
 */
Hooks.on('dcc.definePlayerSchema', (schema) => {
  // XCC class-specific fields
  schema.class.fields.localizationPath = new StringField({ initial: '' })
  schema.class.fields.classLink = new StringField({ initial: '' })

  // Athlete fields
  schema.class.fields.trainingDie = new StringField({ initial: '' })
  schema.class.fields.scramble = new NumberField({ initial: 0, integer: true })
  schema.class.fields.speed = new NumberField({ initial: 30, integer: true })
  schema.class.fields.grappleCritRange = new NumberField({ initial: 20, integer: true })
  schema.class.fields.grappleCritDie = new StringField({ initial: 'd4' })
  schema.class.fields.athleticDurability = new StringField({ initial: '' })

  // Brawler fields
  schema.class.fields.unarmedDamage = new StringField({ initial: '' })
  schema.class.fields.toughness = new StringField({ initial: '' })

  // Blaster fields
  schema.class.fields.blasterDie = new StringField({ initial: '' })

  // Jammer fields
  schema.class.fields.teamMascotDie = new StringField({ initial: '' })
  schema.class.fields.devastatingAttack = new StringField({ initial: '' })
  schema.class.fields.disrespectPenalty = new StringField({ initial: '' })
  schema.class.fields.chosenWeapon = new StringField({ initial: '' })
  schema.class.fields.chosenWeaponEquipped = new BooleanField({ initial: false })
  schema.class.fields.performanceSpecialties = new StringField({ initial: '' })

  // Messenger fields
  schema.class.fields.turnUndeadDie = new StringField({ initial: '' })
  schema.class.fields.scourge = new StringField({ initial: '' })
  schema.class.fields.favoredWeapon = new StringField({ initial: '' })
  schema.class.fields.freeAttackDamage = new StringField({ initial: '' })

  // Dungeon Hottie fields (XCC Insider #1). The level data fills
  // notInTheFace, entourage and deedDie; the rest are the player's choices.
  schema.class.fields.oneMove = new StringField({ initial: '' })
  schema.class.fields.notInTheFace = new StringField({ initial: '' })
  schema.class.fields.entourage = new NumberField({ initial: 0, integer: true })
  schema.class.fields.entourageMembers = new StringField({ initial: '' })
  schema.class.fields.deedDie = new StringField({ initial: '' })
  schema.class.fields.deedWeapon = new StringField({ initial: '' })
  schema.class.fields.tooCuteUsed = new BooleanField({ initial: false })

  // Dwarf fields - written by the shield bash config dialog
  schema.class.fields.shieldBashBonus = new StringField({ initial: '' })
  schema.class.fields.shieldBashDamage = new StringField({ initial: '' })
  schema.class.fields.shieldBashOverrideDie = new StringField({ initial: '' })

  // DCC's wizard/elf mixin declares `spellCheckDieOverride`, but every read -
  // ours and the system's - uses `spellCheckOverrideDie`, which nothing
  // declares. Declared here so the dialog's override survives validation.
  schema.class.fields.spellCheckOverrideDie = new StringField({ initial: '' })

  // Half-Orc fields
  schema.class.fields.wildCritRange = new NumberField({ initial: 20, integer: true })

  // Half-Elf fields
  schema.class.fields.charismaDie = new StringField({ initial: '' })
  schema.class.fields.saveBonus = new StringField({ initial: '' })

  // Criminal specialist fields
  schema.class.fields.currentTurf = new StringField({ initial: '' })
  schema.class.fields.currentContacts = new StringField({ initial: '' })
  schema.class.fields.currentDisguise = new StringField({ initial: '' })

  // The skills only XCC's sheets use; DCC declares its own from the class mixin
  // registry. Shaped like DCC's thief skills - Active Effects target
  // `otherMod`, never the editable `value`.
  const xccSkill = (label, ability) => new SchemaField({
    label: new StringField({ initial: label }),
    ability: new StringField({ initial: ability }),
    value: new StringField({ initial: '0' }),
    otherMod: new NumberField({ initial: 0, integer: true })
  })
  schema.skills.fields.acrobatics = xccSkill('DCC.system.skills.acrobatics.value', 'agl')
  schema.skills.fields.poleVault = xccSkill('DCC.system.skills.poleVault.value', 'str')
  schema.skills.fields.tightropeWalk = xccSkill('DCC.system.skills.tightropeWalk.value', 'agl')
  schema.skills.fields.leap = xccSkill('DCC.system.skills.leap.value', 'str')
  schema.skills.fields.dangerSense = xccSkill('DCC.system.skills.dangerSense.value', '')
  schema.skills.fields.criminalConnections = xccSkill('DCC.system.skills.criminalConnections.value', 'per')
  schema.skills.fields.briberyExpert = xccSkill('DCC.system.skills.briberyExpert.value', 'int')

  // Rewards tab notes box. HTMLField to match DCC's `details.notes.value` -
  // the sheet runs the stored text through `TextEditor.enrichHTML`.
  schema.details.fields.xccnotes = new HTMLField({ initial: '' })

  // XCC Rewards system (Fame & Wealth)
  //
  // Both `grandstanding*` fields exist purely as Active Effect targets; nothing
  // on the sheet edits them.
  //
  //   grandstandingMod       formula appended to the check ('+2', '+1d3'), fed
  //                          to DCC's Compound term verbatim. Text rather than
  //                          a number so it can carry a die - written by a
  //                          `custom` change, see the listener above.
  //   grandstandingDieSteps  dice-chain shift of the action die, d20 -> d24
  schema.rewards = new SchemaField({
    fame: new NumberField({ initial: 0, integer: true }),
    baseWealth: new NumberField({ initial: 0, integer: true }),
    totalWealth: new NumberField({ initial: 0, integer: true }),
    contacts: new StringField({ initial: '' }),
    grandstandingMod: new StringField({ initial: '' }),
    grandstandingDieSteps: new NumberField({ initial: 0, integer: true }),
    // One turn in the spotlight per crawl. Set by the roll itself, win or
    // lose, and cleared for the whole roster from the DCC Tools sidebar.
    grandstanded: new BooleanField({ initial: false })
  })
})

/**
 * DCC Tools sidebar tab (DCC issue #833). The core tool is gated on
 * `dcc.enableFleetingLuck`, but Mojo is always on here, so re-seed it
 * unconditionally. Registered at import time so the sidebar's first render
 * (during `Game#initializeUI`) already includes it.
 *
 * The tab itself is rebranded for XCrawl in the `init` hook below (tab-strip
 * icon in styles/xcc.css, "XCC Tools" title in module/xcc-i18n.js).
 */
registerI18nOverrides()

Hooks.on('dcc.getSidebarTools', (tools) => {
  tools.fleetingLuck = {
    label: 'DCC.FleetingLuck',
    icon: 'fas fa-star',
    onClick: () => game.dcc.FleetingLuck.show(),
    help: `${globals.userGuideUrl}Mojo/`
  }
  addLuckOverviewSidebarTool(tools)
  addGrandstandingSidebarTools(tools)
})

const { loadTemplates } = foundry.applications.handlebars

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
async function enrichClass (classKey, isGnome = false) {
  CONFIG[classKey] = { enrichedArrays: {} }
  CONFIG[classKey].enrichedArrays = {
    Benefits: await enrichArrayHTML(classKey, 'Benefits', isGnome),
    Restrictions: await enrichArrayHTML(classKey, 'Restrictions', isGnome),
    Mojo: await enrichArrayHTML(classKey, 'Mojo', isGnome),
    WeaponTraining: await enrichArrayHTML(classKey, 'WeaponTraining', isGnome)
  }
}

async function enrichArrayHTML (classKey, name, isGnome) {
  const key = classKey + '.' + name
  const entries = game.i18n.localize(key)
  console.log('Localizing key:', key, '->', entries)
  // Split the key to navigate the nested structure
  const parts = entries.split('.')
  let current = game.i18n.translations
  // Navigate through the nested object
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    }
  }
  const list = Array.from(current)

  // enrichHTML
  for (let i = 0; i < list.length; i++) {
    list[i] = await foundry.applications.ux.TextEditor.enrichHTML(list[i])
  }

  if (name === 'Mojo') {
    const extraEntries = game.i18n.localize('XCC.MojoDefault')
    const extraParts = extraEntries.split('.')
    current = game.i18n.translations
    // Navigate through the nested object
    for (const part of extraParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      }
    }
    const extraList = Array.from(current)
    // Skip the first mojo entry for gnome
    if (isGnome) {
      extraList.shift()
    }
    for (let i = 0; i < extraList.length; i++) {
      list.push(await foundry.applications.ux.TextEditor.enrichHTML(extraList[i]))
    }
  }
  return list
}

Hooks.once('init', async function () {
  console.log('XCC | Initializing XCrawl Classics System')
  CONFIG.XCC = XCC

  // Rebrand the DCC Tools sidebar tab for XCrawl. The system registered the
  // tab in its own init hook (which runs before module init hooks), so its
  // Sidebar.TABS entry exists here; swap the DCC wordmark tab-strip icon
  // class for our "X" (styled in styles/xcc.css). Guarded so older DCC
  // versions without the sidebar tab are a no-op.
  const dccSidebarTab = foundry.applications.sidebar.Sidebar.TABS.dcc
  if (dccSidebarTab) {
    dccSidebarTab.icon = 'xcc-sidebar-icon'
  }

  // At init rather than `dcc.ready`: the updateActor/updateItem hooks and the
  // `debugItem` helper read `isDebug` unguarded, and an update during the boot
  // window threw "xcc.isDebug is not a registered game setting".
  await registerModuleSettings()

  // Puts XCrawl in the system's "Ruleset Variant" setting, whose choices are
  // built from this registry. Called optionally - `registerVariant` is absent
  // on the oldest DCC release this module supports. The class list is
  // declarative metadata; nothing is enforced against it.
  game.dcc.registerVariant?.({
    id: 'xcc',
    label: 'XCC.VariantXCC',
    classes: [
      'athlete', 'blaster', 'brawler', 'jammer', 'messenger', 'dungeon-hottie',
      'dwarf', 'gnome', 'half-elf', 'half-orc',
      'acrobat', 'commando', 'criminal', 'crypt-raider', 'dwarf-mechanic',
      'elf-trickster', 'half-orc-slayer', 'halfling-rogue', 'scout'
    ]
  })

  // Register ActorSheets and their Helper functions
  game.dcc.registerActorSheet('Player', XCCActorSheetAthlete, {
    scope: 'xcc',
    label: 'XCC.Athlete.DropdownLabel'
  })
  XCCActorSheetAthlete.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetBlaster, {
    scope: 'xcc',
    label: 'XCC.Blaster.DropdownLabel'
  })
  XCCActorSheetBlaster.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetBrawler, {
    scope: 'xcc',
    label: 'XCC.Brawler.DropdownLabel'
  })
  XCCActorSheetBrawler.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetJammer, {
    scope: 'xcc',
    label: 'XCC.Jammer.DropdownLabel'
  })
  XCCActorSheetJammer.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetMessenger, {
    scope: 'xcc',
    label: 'XCC.Messenger.DropdownLabel'
  })
  XCCActorSheetMessenger.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetDungeonHottie, {
    scope: 'xcc',
    label: 'XCC.DungeonHottie.DropdownLabel'
  })
  XCCActorSheetDungeonHottie.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpAcrobat, {
    scope: 'xcc',
    label: 'XCC.Specialist.Acrobat.DropdownLabel'
  })
  XCCActorSheetSpAcrobat.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpCommando, {
    scope: 'xcc',
    label: 'XCC.Specialist.Commando.DropdownLabel'
  })
  XCCActorSheetSpCommando.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpCriminal, {
    scope: 'xcc',
    label: 'XCC.Specialist.Criminal.DropdownLabel'
  })
  XCCActorSheetSpCriminal.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpCryptRaider, {
    scope: 'xcc',
    label: 'XCC.Specialist.CryptRaider.DropdownLabel'
  })
  XCCActorSheetSpCryptRaider.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpScout, {
    scope: 'xcc',
    label: 'XCC.Specialist.Scout.DropdownLabel'
  })
  XCCActorSheetSpScout.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpDwarfMechanic, {
    scope: 'xcc',
    label: 'XCC.Specialist.DwarfMechanic.DropdownLabel'
  })
  XCCActorSheetSpDwarfMechanic.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpElfTrickster, {
    scope: 'xcc',
    label: 'XCC.Specialist.ElfTrickster.DropdownLabel'
  })
  XCCActorSheetSpElfTrickster.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpHalfOrcSlayer, {
    scope: 'xcc',
    label: 'XCC.Specialist.HalfOrcSlayer.DropdownLabel'
  })
  XCCActorSheetSpHalfOrcSlayer.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetSpHalflingRogue, {
    scope: 'xcc',
    label: 'XCC.Specialist.HalflingRogue.DropdownLabel'
  })
  XCCActorSheetSpHalflingRogue.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetHalfOrc, {
    scope: 'xcc',
    label: 'XCC.HalfOrc.DropdownLabel'
  })
  XCCActorSheetHalfOrc.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetHalfElf, {
    scope: 'xcc',
    label: 'XCC.HalfElf.DropdownLabel'
  })
  XCCActorSheetHalfElf.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetDwarf, {
    scope: 'xcc',
    label: 'XCC.Dwarf.DropdownLabel'
  })
  XCCActorSheetDwarf.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetGnome, {
    scope: 'xcc',
    label: 'XCC.Gnome.DropdownLabel'
  })
  XCCActorSheetGnome.addHooksAndHelpers()

  game.dcc.registerActorSheet('Player', XCCActorSheetGeneric, {
    scope: 'xcc',
    label: 'XCC.GenericSheet.DropdownLabel'
  })
  XCCActorSheetGeneric.addHooksAndHelpers()

  // Register partial templates
  loadTemplates([globals.templatesPath + 'actor-partial-common.html'])

  // Register enrich helper
  Handlebars.registerHelper('getEnrichedArray', function (actor, name) {
    const list = CONFIG[actor.system.class.localizationPath]?.enrichedArrays[name] || []
    // The entries are enriched once per class, so anything that depends on the
    // character is left as a {token} for its sheet to fill in here - see
    // `classTokens` on the Dungeon Hottie sheet.
    const tokens = actor.sheet?.constructor?.classTokens?.(actor)
    if (!tokens) return list
    return list
      .map(entry => entry.replace(TOKEN, (match, key) => tokens[key] ?? match))
      // An entry that is nothing but a token drops out when the token comes
      // back empty - that is how a rule tied to one build stays hidden for
      // the others.
      .filter(entry => entry.trim())
  })

  // Register debug helper
  Handlebars.registerHelper('debugItem', function (item) {
    if (game.settings.get(globals.id, 'isDebug')) {
      console.log('Debugging item:', item)
    }
  })

  // Register rewards helpers
  Handlebars.registerHelper('updateRewards', function (actor, sponsorships) {
    // Non-XCC class
    if (sponsorships === undefined) return
    // XCC class
    if (actor.system?.rewards?.fame === undefined || actor.system.rewards.baseWealth === undefined ||
      actor.system.rewards.totalWealth === undefined) {
      actor.update({
        'system.rewards.fame': 0,
        'system.rewards.totalWealth': 11,
        'system.rewards.baseWealth': 11
      })
    } else {
      let wealth = actor.system.rewards.baseWealth
      sponsorships.forEach(element => {
        wealth += element.system.rewards?.wealth || 0
      })
      actor.update({
        'system.rewards.totalWealth': wealth
      })
    }
  })

  Handlebars.registerHelper('getWealthRank', function (actor) {
    const totalWealth = actor.system?.rewards?.totalWealth || 0

    if (totalWealth >= 100) {
      return 'XCC.Rewards.WealthTable.100+.Title'
    } else if (totalWealth >= 96) {
      return 'XCC.Rewards.WealthTable.96-99.Title'
    } else if (totalWealth >= 91) {
      return 'XCC.Rewards.WealthTable.91-95.Title'
    } else if (totalWealth >= 71) {
      return 'XCC.Rewards.WealthTable.71-90.Title'
    } else if (totalWealth >= 51) {
      return 'XCC.Rewards.WealthTable.51-70.Title'
    } else if (totalWealth >= 21) {
      return 'XCC.Rewards.WealthTable.21-50.Title'
    } else if (totalWealth >= 11) {
      return 'XCC.Rewards.WealthTable.11-20.Title'
    } else {
      return 'XCC.Rewards.WealthTable.1-10.Title'
    }
  })

  Handlebars.registerHelper('getWealthMeaning', function (actor) {
    const totalWealth = actor.system?.rewards?.totalWealth || 0

    if (totalWealth >= 100) {
      return 'XCC.Rewards.WealthTable.100+.Meaning'
    } else if (totalWealth >= 96) {
      return 'XCC.Rewards.WealthTable.96-99.Meaning'
    } else if (totalWealth >= 91) {
      return 'XCC.Rewards.WealthTable.91-95.Meaning'
    } else if (totalWealth >= 71) {
      return 'XCC.Rewards.WealthTable.71-90.Meaning'
    } else if (totalWealth >= 51) {
      return 'XCC.Rewards.WealthTable.51-70.Meaning'
    } else if (totalWealth >= 21) {
      return 'XCC.Rewards.WealthTable.21-50.Meaning'
    } else if (totalWealth >= 11) {
      return 'XCC.Rewards.WealthTable.11-20.Meaning'
    } else {
      return 'XCC.Rewards.WealthTable.1-10.Meaning'
    }
  })

  Handlebars.registerHelper('getFameModifier', function (actor) {
    const fame = actor.system?.rewards?.fame || 0

    if (fame >= 81) {
      return '+2d'
    } else if (fame >= 61) {
      return '+1d'
    } else if (fame >= 41) {
      return '+2'
    } else if (fame >= 21) {
      return '+1'
    } else {
      return '+0'
    }
  })

  // Register localization helpers
  Handlebars.registerHelper('getLocalizedArray', function (key, actor = undefined) {
    // Split the key to navigate the nested structure
    const parts = key.split('.')
    let current = game.i18n.translations

    // Navigate through the nested object
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else { return [game.i18n.localize('XCC.ErrorNoEntries')] }
    }
    const list = Array.from(current)

    // Skip the first mojo entry for gnome
    if (actor) {
      if (actor.system?.details?.sheetClass === 'gnome') {
        list.shift()
      }
    }
    // Return the array if found, empty array otherwise
    return Array.isArray(list) ? list : []
  })

  Handlebars.registerHelper('getLocalizationKey', function (actor, name) {
    return (actor.system.class?.localizationPath || 'Undefined') + '.' + name
  })

  Handlebars.registerHelper('hasLocalizedEntries', function (actor, name) {
    const key = (actor.system.class?.localizationPath || 'Undefined') + '.' + name
    const parts = key.split('.')
    let current = game.i18n.translations

    // Navigate through the nested object
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else { return false }
    }

    // Return true if we found an array
    return Array.isArray(current)
  })

  // Register math helpers
  Handlebars.registerHelper('ensurePlus', function (value) {
    if (value >= 0) return ensurePlus(value)
    else return '+0'
  })

  Handlebars.registerHelper('sum', function (a, b) {
    if (a && b) return parseInt(a) + parseInt(b)
    else return a || b || 0
  })

  // Register path helper
  Handlebars.registerHelper('getGameImage', function (partial) {
    return globals.imagesPath + 'game-icons-net/' + partial
  })
})

// Parent system is ready - add our module functionality on top
Hooks.once('dcc.ready', async function () {
  console.log('DCC system is ready - XCrawl Classics System applies its changes...')

  // Override Fleeting Luck to always be enabled
  Object.defineProperty(game.dcc.FleetingLuck, 'enabled', {
    get: function () { return true }
  })

  // Override Fleeting Luck Automation with our setting
  Object.defineProperty(game.dcc.FleetingLuck, 'automationEnabled', {
    get: function () { return game.settings.get(globals.id, 'enableMojoAutomation') }
  })

  // Move the Mojo ledger from the player to the crawler - see
  // module/xcc-mojo.js. Must land before the `init()` below, which it replaces.
  installMojo()

  // Hand the spotlight back to the whole roster when an encounter starts or
  // ends - see module/xcc-grandstanding.js.
  registerGrandstandingHooks()

  // Setup pause
  Hooks.on('renderApplicationV2', (app, html, context, options) => {
    const caption = document.querySelector('#pause > figcaption')
    document.getElementById('pause')?.classList.toggle('small', game.settings.get(globals.id, 'smallerPause'))
    // This won't be necessary after new pause screen is implemented into the base DCC system
    if (caption) caption.textContent = game.i18n.localize('DCC.FancyPause')
  })

  // Re-initialise the Mojo tracker. Its launcher lives in the DCC Tools
  // sidebar tab, seeded by the `dcc.getSidebarTools` listener above.
  game.dcc.FleetingLuck.init()

  // Whisper the once-per-version release-notes/user-guide chat card.
  // Fire-and-forget (like the system's checkReleaseNotes): the card is
  // cosmetic and must not delay or abort the class enrichment below.
  checkReleaseNotes()

  // Enrich class arrays
  await enrichClass('XCC.Athlete')
  await enrichClass('XCC.Brawler')
  await enrichClass('XCC.Blaster')
  await enrichClass('XCC.Jammer')
  await enrichClass('XCC.Messenger')
  await enrichClass('XCC.DungeonHottie')
  await enrichClass('XCC.HalfOrc')
  await enrichClass('XCC.HalfElf')
  await enrichClass('XCC.Dwarf')
  await enrichClass('XCC.Gnome', true)
  await enrichClass('XCC.Specialist.Acrobat')
  await enrichClass('XCC.Specialist.Commando')
  await enrichClass('XCC.Specialist.Criminal')
  await enrichClass('XCC.Specialist.CryptRaider')
  await enrichClass('XCC.Specialist.Scout')
  await enrichClass('XCC.Specialist.DwarfMechanic')
  await enrichClass('XCC.Specialist.ElfTrickster')
  await enrichClass('XCC.Specialist.HalfOrcSlayer')
  await enrichClass('XCC.Specialist.HalflingRogue')
})

// Override Actor Directory's Import Actor button to open our own import dialog
Hooks.on('renderActorDirectory', (app, html) => {
  const button = html.querySelector('.import-actors')
  const clone = button?.cloneNode(true)
  button?.replaceWith(clone)
  clone?.addEventListener('click', async (event) => {
    event.preventDefault()
    new XCCActorParser().render(true)
  })
})

// The Token HUD additions - roll buttons, the Mojo stepper, and the standalone
// controls that appear under a selected token - live in their own module.
registerTokenHudHooks()

// The status effect palette - see module/xcc-status-effects.js. On `dcc.ready`
// rather than `setup`, because DCC appends its own combat results from its
// ready hook and has to have done so before the list is rebuilt.
Hooks.once('dcc.ready', () => defineStatusEffects())
registerColorMarkerHooks()

// The token HUD's wardrobe palette - see module/xcc-outfits.js. The button only
// appears for a character that has outfits.
registerOutfitHooks()

// Rulebook skill DCs under skill check chat cards - see module/xcc-skill-dcs.js.
registerSkillDCHooks()

// Live refresh for the Luck overview window - see module/xcc-luck-overview.js.
registerLuckOverviewHooks()

// Keep the deed die in DCC's roll modifier dialog in step between the attack
// and damage rows - see module/xcc-deed-die-dialog.js.
registerDeedDieDialogHooks()

/**
 * Show the full text of a notes or name field, but only while it is too narrow
 * to show it itself.
 *
 * Those columns are ellipsised (`.weapon-list` in xcc.css), on our class tabs
 * and in the system's own equipment list alike.
 *
 * Measured on hover, which is the one moment the field is certain to be laid
 * out - measuring at render catches tabs that are still hidden, where every
 * field reports zero width - and it keeps up with the sheet being resized.
 *
 * Registered on `document` during the capture phase so it runs before
 * Foundry's tooltip manager, which reads the attribute from its own capture
 * listener on `document.body`. Anything later would be too late.
 */
const TRUNCATABLE_FIELDS = 'input.weapon-notes, input.name'
let textPen = null

document.addEventListener('pointerenter', (event) => {
  const field = event.target
  if (!field?.matches?.(TRUNCATABLE_FIELDS)) return

  textPen ??= document.createElement('canvas').getContext('2d')
  const style = getComputedStyle(field)
  textPen.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const inner = field.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0)

  // `data-tooltip-text` takes literal text; `data-tooltip` is looked up as a
  // localization key.
  if (textPen.measureText(field.value).width > inner) field.dataset.tooltipText = field.value
  else delete field.dataset.tooltipText
}, { capture: true })

// Register Dynamic Token Rings
Hooks.on('initializeDynamicTokenRingConfig', ringConfig => {
  const myCustomRings = new foundry.canvas.placeables.tokens.DynamicRingData({
    label: 'XCC Token Rings',
    effects: {
      RING_PULSE: 'TOKEN.RING.EFFECTS.RING_PULSE',
      RING_GRADIENT: 'TOKEN.RING.EFFECTS.RING_GRADIENT',
      BKG_WAVE: 'TOKEN.RING.EFFECTS.BKG_WAVE',
      INVISIBILITY: 'TOKEN.RING.EFFECTS.INVISIBILITY',
      COLOR_OVER_SUBJECT: 'TOKEN.RING.EFFECTS.COLOR_OVER_SUBJECT'
    },
    spritesheet: '/modules/xcc/styles/dynamic-token-ring/dynamic-xcc-spritesheet.json' // TODO: replace path with variable
  })
  ringConfig.addConfig('myCustomRings', myCustomRings)
})

// Debug logs
Hooks.on('updateActor', (actor, data, action, userId) => {
  if (game.settings.get(globals.id, 'isDebug')) {
    console.log('XCC: actor updated:', actor.name, 'Data:', data, 'Action:', action, 'User ID:', userId)
  }
})

Hooks.on('updateItem', (actor, data, action, userId) => {
  if (game.settings.get(globals.id, 'isDebug')) {
    console.log('XCC: item updated:', actor.name, 'Data:', data, 'Action:', action, 'User ID:', userId)
  }
})

// Handle chat message
Hooks.on('renderChatMessageHTML', (message, html, data) => {
  // remove header if we set a flag to do so
  if (message.getFlag('dcc', 'isNoHeader')) {
    const header = html.querySelector('header')
    if (header) {
      header.remove()
    }
  }
})
