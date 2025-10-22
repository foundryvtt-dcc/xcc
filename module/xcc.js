/* eslint-disable import/no-absolute-path */
/* global CONFIG, foundry, game, Hooks */
import XCCActorSheetAthlete from './xcc-actor-sheet-athlete.js'
import XCCActorSheetBlaster from './xcc-actor-sheet-blaster.js'
import XCCActorSheetBrawler from './xcc-actor-sheet-brawler.js'
import XCCActorSheetJammer from './xcc-actor-sheet-jammer.js'
import XCCActorSheetMessenger from './xcc-actor-sheet-messenger.js'
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
import XCCActor from './xcc-actor.js'

import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals, registerModuleSettings } from './settings.js'

const { Actors } = foundry.documents.collections
const { loadTemplates } = foundry.applications.handlebars

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  console.log('XCC | Initializing XCrawl Classics System')
  CONFIG.XCC = XCC
  CONFIG.Actor.documentClass = XCCActor

  // Register ActorSheets and their Helper functions
  Actors.registerSheet('xcc', XCCActorSheetAthlete, {
    types: ['Player'],
    label: 'XCC.Athlete.DropdownLabel'
  })
  XCCActorSheetAthlete.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetBlaster, {
    types: ['Player'],
    label: 'XCC.Blaster.DropdownLabel'
  })
  XCCActorSheetBlaster.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetBrawler, {
    types: ['Player'],
    label: 'XCC.Brawler.DropdownLabel'
  })
  XCCActorSheetBrawler.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetJammer, {
    types: ['Player'],
    label: 'XCC.Jammer.DropdownLabel'
  })
  XCCActorSheetJammer.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetMessenger, {
    types: ['Player'],
    label: 'XCC.Messenger.DropdownLabel'
  })
  XCCActorSheetMessenger.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpAcrobat, {
    types: ['Player'],
    label: 'XCC.Specialist.Acrobat.DropdownLabel'
  })
  XCCActorSheetSpAcrobat.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpCommando, {
    types: ['Player'],
    label: 'XCC.Specialist.Commando.DropdownLabel'
  })
  XCCActorSheetSpCommando.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpCriminal, {
    types: ['Player'],
    label: 'XCC.Specialist.Criminal.DropdownLabel'
  })
  XCCActorSheetSpCriminal.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpCryptRaider, {
    types: ['Player'],
    label: 'XCC.Specialist.CryptRaider.DropdownLabel'
  })
  XCCActorSheetSpCryptRaider.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpScout, {
    types: ['Player'],
    label: 'XCC.Specialist.Scout.DropdownLabel'
  })
  XCCActorSheetSpScout.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpDwarfMechanic, {
    types: ['Player'],
    label: 'XCC.Specialist.DwarfMechanic.DropdownLabel'
  })
  XCCActorSheetSpDwarfMechanic.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpElfTrickster, {
    types: ['Player'],
    label: 'XCC.Specialist.ElfTrickster.DropdownLabel'
  })
  XCCActorSheetSpElfTrickster.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpHalfOrcSlayer, {
    types: ['Player'],
    label: 'XCC.Specialist.HalfOrcSlayer.DropdownLabel'
  })
  XCCActorSheetSpHalfOrcSlayer.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetSpHalflingRogue, {
    types: ['Player'],
    label: 'XCC.Specialist.HalflingRogue.DropdownLabel'
  })
  XCCActorSheetSpHalflingRogue.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetHalfOrc, {
    types: ['Player'],
    label: 'XCC.HalfOrc.DropdownLabel'
  })
  XCCActorSheetHalfOrc.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetHalfElf, {
    types: ['Player'],
    label: 'XCC.HalfElf.DropdownLabel'
  })
  XCCActorSheetHalfElf.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetDwarf, {
    types: ['Player'],
    label: 'XCC.Dwarf.DropdownLabel'
  })
  XCCActorSheetDwarf.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetGnome, {
    types: ['Player'],
    label: 'XCC.Gnome.DropdownLabel'
  })
  XCCActorSheetGnome.addHooksAndHelpers()

  Actors.registerSheet('xcc', XCCActorSheetGeneric, {
    types: ['Player'],
    label: 'XCC.GenericSheet.DropdownLabel'
  })
  XCCActorSheetGeneric.addHooksAndHelpers()

  // Register partial templates
  loadTemplates([globals.templatesPath + 'actor-partial-common.html'])

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

  // Register module settings
  await registerModuleSettings()

  // Override Fleeting Luck Automation with our setting
  Object.defineProperty(game.dcc.FleetingLuck, 'automationEnabled', {
    get: function () { return game.settings.get(globals.id, 'enableMojoAutomation') }
  })

  // Setup pause
  Hooks.on('renderApplicationV2', (app, html, context, options) => {
    const caption = document.querySelector('#pause > figcaption')
    document.getElementById('pause')?.classList.toggle('small', game.settings.get(globals.id, 'smallerPause'))
    // This won't be necessary after new pause screen is implemented into the base DCC system
    if (caption) caption.textContent = game.i18n.localize('DCC.FancyPause')
  })

  // Re-Initialize Fleeting Luck UI
  game.dcc.FleetingLuck.init()
  foundry.ui.controls.render()
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
Hooks.on('dcc.update', async function (actor, data) {
  if (game.settings.get(globals.id, 'isDebug')) {
    console.log(`XCC: update hook triggered for actor: ${actor.name}`)
  }
})

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
