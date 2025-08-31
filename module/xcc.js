/* global foundry */
import { registerModuleSettings } from './settings.js'

//import {XCCActorSheet} from './xcc-actor-sheet.js';
import XCCActorSheetAthlete from './xcc-actor-sheet-athlete.js';
import XCCActorSheetBlaster from './xcc-actor-sheet-blaster.js';
import XCCActorSheetBrawler from './xcc-actor-sheet-brawler.js';
import XCCActorSheetJammer from './xcc-actor-sheet-jammer.js';
import XCCActorSheetMessenger from './xcc-actor-sheet-messenger.js';
import XCCActorSheetSpAcrobat from './xcc-actor-sheet-sp-acrobat.js';
import XCCActorSheetSpCommando from './xcc-actor-sheet-sp-commando.js';
import XCCActorSheetSpCriminal from './xcc-actor-sheet-sp-criminal.js';
import XCCActorSheetSpCryptRaider from './xcc-actor-sheet-sp-crypt-raider.js';
import XCCActorSheetSpScout from './xcc-actor-sheet-sp-scout.js';
import XCCActorSheetSpDwarfMechanic from './xcc-actor-sheet-sp-dwarf-mechanic.js';
import XCCActorSheetSpElfTrickster from './xcc-actor-sheet-sp-elf-trickster.js';
import XCCActorSheetSpHalfOrcSlayer from './xcc-actor-sheet-sp-half-orc-slayer.js';
import XCCActorSheetSpHalflingRogue from './xcc-actor-sheet-sp-halfling-rogue.js';
import XCCActorSheetHalfOrc from './xcc-actor-sheet-half-orc.js';
import XCCActorSheetHalfElf from './xcc-actor-sheet-half-elf.js';
import XCCActorSheetGnome from './xcc-actor-sheet-gnome.js';
import XCCActorSheetDwarf from './xcc-actor-sheet-dwarf.js';
import DCCMonkeyPatch from './dcc-monkey-patch.js';

import { ensurePlus } from '/systems/dcc/module/utilities.js';

const { Actors } = foundry.documents.collections
const { loadTemplates } = foundry.applications.handlebars

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  console.log(`XCC | Initializing XCrawl Classics System`)
  DCCMonkeyPatch.patch();

  // XCCActorSheet is not used anymore - using dcc-monkey-patch instead.
  //Actors.unregisterSheet('dcc', DCCActorSheet);
  //Actors.registerSheet('xcc', XCCActorSheet, {makeDefault: true});

  // Register ActorSheets and their Helper functions
  Actors.registerSheet('xcc-athlete', XCCActorSheetAthlete, {
    types: ['Player'],
    label: 'XCC.Athlete.DropdownLabel'
  })
  XCCActorSheetAthlete.addHooksAndHelpers();

  Actors.registerSheet('xcc-blaster', XCCActorSheetBlaster, {
    types: ['Player'],
    label: 'XCC.Blaster.DropdownLabel'
  })
  XCCActorSheetBlaster.addHooksAndHelpers();

  Actors.registerSheet('xcc-brawler', XCCActorSheetBrawler, {
    types: ['Player'],
    label: 'XCC.Brawler.DropdownLabel'
  })
  XCCActorSheetBrawler.addHooksAndHelpers();

  Actors.registerSheet('xcc-jammer', XCCActorSheetJammer, {
    types: ['Player'],
    label: 'XCC.Jammer.DropdownLabel'
  })
  XCCActorSheetJammer.addHooksAndHelpers();

  Actors.registerSheet('xcc-messenger', XCCActorSheetMessenger, {
    types: ['Player'],
    label: 'XCC.Messenger.DropdownLabel'
  })
  XCCActorSheetMessenger.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-acrobat', XCCActorSheetSpAcrobat, {
    types: ['Player'],
    label: 'XCC.Specialist.Acrobat.DropdownLabel'
  })
  XCCActorSheetSpAcrobat.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-commando', XCCActorSheetSpCommando, {
    types: ['Player'],
    label: 'XCC.Specialist.Commando.DropdownLabel'
  })
  XCCActorSheetSpCommando.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-criminal', XCCActorSheetSpCriminal, {
    types: ['Player'],
    label: 'XCC.Specialist.Criminal.DropdownLabel'
  })
  XCCActorSheetSpCriminal.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-crypt-raider', XCCActorSheetSpCryptRaider, {
    types: ['Player'],
    label: 'XCC.Specialist.CryptRaider.DropdownLabel'
  })
  XCCActorSheetSpCryptRaider.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-scout', XCCActorSheetSpScout, {
    types: ['Player'],
    label: 'XCC.Specialist.Scout.DropdownLabel'
  })
  XCCActorSheetSpScout.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-dwarf-mechanic', XCCActorSheetSpDwarfMechanic, {
    types: ['Player'],
    label: 'XCC.Specialist.DwarfMechanic.DropdownLabel'
  })
  XCCActorSheetSpDwarfMechanic.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-elf-trickster', XCCActorSheetSpElfTrickster, {
    types: ['Player'],
    label: 'XCC.Specialist.ElfTrickster.DropdownLabel'
  })
  XCCActorSheetSpElfTrickster.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-half-orc-slayer', XCCActorSheetSpHalfOrcSlayer, {
    types: ['Player'],
    label: 'XCC.Specialist.HalfOrcSlayer.DropdownLabel'
  })
  XCCActorSheetSpHalfOrcSlayer.addHooksAndHelpers();

  Actors.registerSheet('xcc-sp-halfling-rogue', XCCActorSheetSpHalflingRogue, {
    types: ['Player'],
    label: 'XCC.Specialist.HalflingRogue.DropdownLabel'
  })
  XCCActorSheetSpHalflingRogue.addHooksAndHelpers();

  Actors.registerSheet('xcc-half-orc', XCCActorSheetHalfOrc, {
    types: ['Player'],
    label: 'XCC.HalfOrc.DropdownLabel'
  })
  XCCActorSheetHalfOrc.addHooksAndHelpers();

  Actors.registerSheet('xcc-half-elf', XCCActorSheetHalfElf, {
    types: ['Player'],
    label: 'XCC.HalfElf.DropdownLabel'
  })
  XCCActorSheetHalfElf.addHooksAndHelpers();

  Actors.registerSheet('xcc-dwarf', XCCActorSheetDwarf, {
    types: ['Player'],
    label: 'XCC.Dwarf.DropdownLabel'
  })
  XCCActorSheetDwarf.addHooksAndHelpers();

  Actors.registerSheet('xcc-gnome', XCCActorSheetGnome, {
    types: ['Player'],
    label: 'XCC.Gnome.DropdownLabel'
  })
  XCCActorSheetGnome.addHooksAndHelpers();

  // Register partial templates
  loadTemplates(['modules/xcrawl-classics/templates/actor-partial-common.html']);

  // Register debug helper
  Handlebars.registerHelper('debugItem', function (item) {
    if (game.settings.get('xcrawl-classics', 'isDebug')) {
      console.log("Debugging item:", item);
    }
  });

  // Register rewards helpers
  Handlebars.registerHelper('updateRewards', function (actor, sponsorships) {
    if (actor.system?.rewards?.fame === undefined || actor.system.rewards.baseWealth === undefined
      || actor.system.rewards.totalWealth === undefined) {
      actor.update({
        'system.rewards.fame': 0,
        'system.rewards.totalWealth': 11,
        'system.rewards.baseWealth': 11,
      });
    }
    else {
      let wealth = actor.system.rewards.baseWealth;
      sponsorships.forEach(element => {
        wealth += element.system.rewards?.wealth || 0;
      });
      actor.update({
        'system.rewards.totalWealth': wealth
      });
    }
  });

  Handlebars.registerHelper('getWealthRank', function (actor) {
    const totalWealth = actor.system?.rewards?.totalWealth || 0;

    if (totalWealth >= 100) {
      return "XCC.Rewards.WealthTable.100+.Title";
    } else if (totalWealth >= 96) {
      return "XCC.Rewards.WealthTable.96-99.Title";
    } else if (totalWealth >= 91) {
      return "XCC.Rewards.WealthTable.91-95.Title";
    } else if (totalWealth >= 71) {
      return "XCC.Rewards.WealthTable.71-90.Title";
    } else if (totalWealth >= 51) {
      return "XCC.Rewards.WealthTable.51-70.Title";
    } else if (totalWealth >= 21) {
      return "XCC.Rewards.WealthTable.21-50.Title";
    } else if (totalWealth >= 11) {
      return "XCC.Rewards.WealthTable.11-20.Title";
    } else {
      return "XCC.Rewards.WealthTable.1-10.Title";
    }
  });

  Handlebars.registerHelper('getWealthMeaning', function (actor) {
    const totalWealth = actor.system?.rewards?.totalWealth || 0;

    if (totalWealth >= 100) {
      return "XCC.Rewards.WealthTable.100+.Meaning";
    } else if (totalWealth >= 96) {
      return "XCC.Rewards.WealthTable.96-99.Meaning";
    } else if (totalWealth >= 91) {
      return "XCC.Rewards.WealthTable.91-95.Meaning";
    } else if (totalWealth >= 71) {
      return "XCC.Rewards.WealthTable.71-90.Meaning";
    } else if (totalWealth >= 51) {
      return "XCC.Rewards.WealthTable.51-70.Meaning";
    } else if (totalWealth >= 21) {
      return "XCC.Rewards.WealthTable.21-50.Meaning";
    } else if (totalWealth >= 11) {
      return "XCC.Rewards.WealthTable.11-20.Meaning";
    } else {
      return "XCC.Rewards.WealthTable.1-10.Meaning";
    }
  });

  Handlebars.registerHelper('getFameModifier', function (actor) {
    const fame = actor.system?.rewards?.fame || 0;

    if (fame >= 81) {
      return "+2d";
    } else if (fame >= 61) {
      return "+1d";
    } else if (fame >= 41) {
      return "+2";
    } else if (fame >= 21) {
      return "+1";
    } else {
      return "+0";
    }
  });

  // Register localization helpers
  Handlebars.registerHelper('getLocalizedArray', function (key) {
    // Split the key to navigate the nested structure
    const parts = key.split('.');
    let current = game.i18n.translations;

    // Navigate through the nested object
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      }
      else { return [game.i18n.localize('XCC.ErrorNoEntries')] }
    }

    // Return the array if found, empty array otherwise
    return Array.isArray(current) ? current : [];
  });

  Handlebars.registerHelper('getLocalizationKey', function (actor, name) {
    return (actor.system.class?.localizationPath || "Undefined") + "." + name;
  });

  Handlebars.registerHelper('hasLocalizedEntries', function (actor, name) {
    const key = (actor.system.class?.localizationPath || "Undefined") + "." + name
    const parts = key.split('.');
    let current = game.i18n.translations;

    // Navigate through the nested object
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      }
      else { return false; }
    }

    // Return true if we found an array
    return Array.isArray(current);
  });

  Handlebars.registerHelper('ensurePlus', function (value) {
    return ensurePlus(value);
  });

  Handlebars.registerHelper('sum', function (a, b) {
    return parseInt(a) + parseInt(b);
  });
});

// Parent system is ready - add our module functionality on top
Hooks.once('dcc.ready', async function () {
  console.log(`DCC is ready - XCrawl Classics System is loading...`)

  // Register module settings
  await registerModuleSettings();

  // Register our packs
  if (game.settings.get('xcrawl-classics', 'registerLevelDataPack')) {
    Hooks.callAll('dcc.registerLevelDataPack', 'xcrawl-classics.xcc-class-level-data');
  }
  if (game.settings.get('xcrawl-classics', 'registerDisapprovalPack')) {
    Hooks.callAll('dcc.registerDisapprovalPack', 'xcrawl-classics.xcc-disapproval')
  }
  // Force fleeting luck to refresh and become Mojo
  game.dcc.FleetingLuck.init();
});

// Debug logs
Hooks.on('dcc.update', async function (actor, data) {
  if (game.settings.get('xcrawl-classics', 'isDebug')) {
    console.log(`XCC: update hook triggered for actor: ${actor.name}`);
  }
});

Hooks.on("updateActor", (actor, data, action, userId) => {
  if (game.settings.get('xcrawl-classics', 'isDebug')) {
    console.log("XCC: actor updated:", actor.name, "Data:", data, "Action:", action, "User ID:", userId);
  }
});

Hooks.on("updateItem", (actor, data, action, userId) => {
  if (game.settings.get('xcrawl-classics', 'isDebug')) {
    console.log("XCC: item updated:", actor.name, "Data:", data, "Action:", action, "User ID:", userId);
  }
});

// Handle chat message
Hooks.on('renderChatMessageHTML', (message, html, data) => {
  // remove header if we set a flag to do so
  if (message.getFlag('dcc', 'isNoHeader')) {
    const header = html.querySelector('header')
    if (header) {
      header.remove()
    }
  }
});