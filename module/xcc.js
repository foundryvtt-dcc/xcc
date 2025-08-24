/* global foundry */
import {registerModuleSettings} from './settings.js'

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
import DCCMonkeyPatch from './dcc-monkey-patch.js';
import * as chat from '/systems/dcc/module/chat.js';
import {ensurePlus} from '/systems/dcc/module/utilities.js';

const { Actors, Items } = foundry.documents.collections

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {
    console.log(`XCC | Initializing XCrawl Classics System`)
    DCCMonkeyPatch.patch();

    //Actors.unregisterSheet('dcc', DCCActorSheet);
    //Actors.registerSheet('xcc', XCCActorSheet, {
    //  makeDefault: true
    //});

    Actors.registerSheet('xcc-athlete', XCCActorSheetAthlete, {
        types: ['Player'],
        label: 'XCC.Athlete.DropdownLabel'
    })

    Actors.registerSheet('xcc-blaster', XCCActorSheetBlaster, {
        types: ['Player'],
        label: 'XCC.Blaster.DropdownLabel'
    })

    Actors.registerSheet('xcc-brawler', XCCActorSheetBrawler, {
        types: ['Player'],
        label: 'XCC.Brawler.DropdownLabel'
    })

    Actors.registerSheet('xcc-jammer', XCCActorSheetJammer, {
        types: ['Player'],
        label: 'XCC.Jammer.DropdownLabel'
    })

    Actors.registerSheet('xcc-messenger', XCCActorSheetMessenger, {
        types: ['Player'],
        label: 'XCC.Messenger.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-acrobat', XCCActorSheetSpAcrobat, {
        types: ['Player'],
        label: 'XCC.Specialist.Acrobat.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-commando', XCCActorSheetSpCommando, {
        types: ['Player'],
        label: 'XCC.Specialist.Commando.DropdownLabel'
    })
    
    Actors.registerSheet('xcc-sp-criminal', XCCActorSheetSpCriminal, {
        types: ['Player'],
        label: 'XCC.Specialist.Criminal.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-crypt-raider', XCCActorSheetSpCryptRaider, {
        types: ['Player'],
        label: 'XCC.Specialist.CryptRaider.DropdownLabel'
    })
    
    Actors.registerSheet('xcc-sp-scout', XCCActorSheetSpScout, {
        types: ['Player'],
        label: 'XCC.Specialist.Scout.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-dwarf-mechanic', XCCActorSheetSpDwarfMechanic, {
        types: ['Player'],
        label: 'XCC.Specialist.DwarfMechanic.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-elf-trickster', XCCActorSheetSpElfTrickster, {
        types: ['Player'],
        label: 'XCC.Specialist.ElfTrickster.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-half-orc-slayer', XCCActorSheetSpHalfOrcSlayer, {
        types: ['Player'],
        label: 'XCC.Specialist.HalfOrcSlayer.DropdownLabel'
    })

    Actors.registerSheet('xcc-sp-halfling-rogue', XCCActorSheetSpHalflingRogue, {
        types: ['Player'],
        label: 'XCC.Specialist.HalflingRogue.DropdownLabel'
    })

    // Register custom Handlebars helpers
    Handlebars.registerHelper('getGrappleToHit', function(actor) {
      if(!actor.system.class?.trainingDie) return actor.system.abilities.str.mod;
      if(actor.system.abilities.str.mod<0)
          return "+"+actor.system.class.trainingDie+actor.system.abilities.str.mod;
      else if(actor.system.abilities.str.mod>0)
          return "+"+actor.system.class.trainingDie+"+"+actor.system.abilities.str.mod;
      else
          return "+"+actor.system.class.trainingDie;
    });

    Handlebars.registerHelper('getGrappleDamage', function(actor) {
      if(!actor.system.class?.trainingDie) return "d4"+ensurePlus(actor.system.abilities.str.mod);
      if(actor.system.abilities.str.mod<0)
          return "d4+"+actor.system.class.trainingDie+actor.system.abilities.str.mod;
      else if(actor.system.abilities.str.mod>0)
          return "d4+"+actor.system.class.trainingDie+"+"+actor.system.abilities.str.mod;
      else
          return "d4+"+actor.system.class.trainingDie;
    });

    Handlebars.registerHelper('getBrawlerToHit', function(actor) {
      let lck = String(actor.system.abilities.lck.mod)[0]==="-"?'':actor.system.abilities.lck.mod || '';
      let str = actor.system.abilities.str.mod || '';
      let ab = actor.system.details.attackBonus || '';
      return ab+ensurePlus(str+lck);
    });

    Handlebars.registerHelper('getBrawlerDamage', function(actor) {
      let lck = String(actor.system.abilities.lck.mod)[0]==="-"?'':actor.system.abilities.lck.mod || '';
      let str = actor.system.abilities.str.mod || '';
      let die = actor.system.class.unarmedDamage || '';
      return die+ensurePlus(str+lck);
    });

    Handlebars.registerHelper('debugItem', function(item) {
      if (game.settings.get('xcrawl-classics', 'isDebug')) {
        console.log("Debugging item:", item);
      }
    });
    
    Handlebars.registerHelper('updateRewards', function(actor, sponsorships) {
      if(actor.system?.rewards?.fame === undefined || actor.system.rewards.baseWealth === undefined 
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

    Handlebars.registerHelper('getWealthRank', function(actor) {
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

    Handlebars.registerHelper('getWealthMeaning', function(actor) {
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

    Handlebars.registerHelper('getFameModifier', function(actor) {
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

    Handlebars.registerHelper('getLocalizedArray', function(key) {
      // Split the key to navigate the nested structure
      const parts = key.split('.');
      let current = game.i18n.translations;
      
      // Navigate through the nested object
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } 
        else {return [ game.i18n.localize('XCC.DefaultMojoTip')]}
      }
      
      // Return the array if found, empty array otherwise
      return Array.isArray(current) ? current : [];
    });

    Handlebars.registerHelper('getMojoKey', function(actor) {
      return "XCC."+actor.system.details.sheetClass.capitalize()+".Mojo";
    });

    Handlebars.registerHelper('positiveOrZero', function(value) {
      // If the value starts with '-', return '+0', otherwise return the original value
      const stringValue = String(value);
      return stringValue.startsWith('-') ? '+0' : stringValue;
    });

    Handlebars.registerHelper('getJammerACBonus', function(actor) {
      let bonus = 0;
      
      // Add luck modifier if positive
      const luckMod = actor.system?.abilities?.lck?.mod || 0;
      if (luckMod > 0) {
        bonus += luckMod;
      }
      
      // Add current level if chosen weapon is equipped
      if (actor.system?.class?.chosenWeaponEquipped) {
        const level = actor.system?.details?.level.value || 0;
        bonus += level;
      }
      
      return "+"+bonus;
    });

    Handlebars.registerHelper('getJammerPerformanceBonus', function(actor) {
      let bonus = 0;
      
      // Add personality modifier
      const perMod = actor.system?.abilities?.per?.mod || 0;
      bonus += perMod;
      
      // Add class level
      const level = actor.system?.details?.level?.value || 0;
      bonus += level;
      
      return bonus >= 0 ? "+"+bonus : bonus;
    });

    Handlebars.registerHelper('getMessengerHolyActBonus', function(actor, luckModified=false) {
      let bonus = 0;
      
      // Add personality modifier
      const perMod = actor.system?.abilities?.per?.mod || 0;
      bonus += perMod;

      // Add luck modifier if applicable
      if (luckModified) {
        const luckMod = actor.system?.abilities?.lck?.mod || 0;
        bonus += luckMod;
      }
      
      // Add class level
      const level = actor.system?.details?.level?.value || 0;
      bonus += level;
      
      return bonus >= 0 ? "+"+bonus : bonus;
    });
});

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
  if (game.settings.get('xcrawl-classics', 'includeUnarmedInWeapons')) {
      console.log(`XCC: update hook triggered for actor: ${actor.name}`);
  }
});

Hooks.on("updateActor", (actor, data, action, userId) => { 
  if (game.settings.get('xcrawl-classics', 'includeUnarmedInWeapons')) {
      console.log("XCC: actor updated:", actor.name, "Data:", data, "Action:", action, "User ID:", userId); 
  }
});

Hooks.on("updateItem", (actor, data, action, userId) => {
  if (game.settings.get('xcrawl-classics', 'includeUnarmedInWeapons')) {
      console.log("XCC: item updated:", actor.name, "Data:", data, "Action:", action, "User ID:", userId);
  }
});

// Handle special grapple chat message
Hooks.on('renderChatMessageHTML', (message, html, data) => {
  if (message.getFlag('dcc', 'isNoHeader')) {
    const header = html.querySelector('header')
    if (header) {
      header.remove()
    }
  }
  
  // Process lionize messages for up/down arrow controls
  XCCActorSheetJammer.processLionizeChatMessage(message, html);
  
  if (message.getFlag('dcc','isGrapple')) {
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
      emoteGrappleRoll(message, html, data)
    }
    chat.lookupCriticalRoll(message, html)
  }
});

const emoteGrappleRoll = function (message, html) {
  if (!message.rolls || !message.isContentVisible) return

  let deedRollHTML = ''
  if (message.system.deedDieRollResult) {
    const critical = message.system.deedSucceed ? ' critical' : ''
    let iconClass = 'fa-dice-d20'
    if (message.system?.deedDieFormula.includes('d4')) {
      iconClass = 'fa-dice-d4'
    }
    else if (message.system?.deedDieFormula.includes('d3') || message.system?.deedDieFormula.includes('d5') || message.system?.deedDieFormula.includes('d6')) {
      iconClass = 'fa-dice-d6'
    }
    else if (message.system?.deedDieFormula.includes('d7') || message.system?.deedDieFormula.includes('d8')) {
      iconClass = 'fa-dice-d8'
    }
    else if (message.system?.deedDieFormula.includes('d10')) {
      iconClass = 'fa-dice-d10'
    }
    else if (message.system?.deedDieFormula.includes('d12') || message.system?.deedDieFormula.includes('d14') || message.system?.deedDieFormula.includes('d16')) {
      iconClass = 'fa-dice-d12'
    }

    let deedDieHTML;
    if (message.system.deedDieRoll) {
      // If we have the full roll object, create a proper inline roll
      deedDieHTML = `<a class="inline-roll inline-result${critical}" data-roll="${encodeURIComponent(JSON.stringify(message.system.deedDieRoll))}" title="${message.system?.deedDieFormula}"><i class="fas ${iconClass}"></i>${message.system.deedDieRollResult}</a>`
    } else {
      // Fallback to non-clickable display if roll data is missing
      deedDieHTML = `<span class="inline-roll${critical}" title="${message.system?.deedDieFormula}"><i class="fas ${iconClass}"></i>${message.system.deedDieRollResult}</span>`
    }
    deedRollHTML = game.i18n.format('XCC.Athlete.GrappleRollTrainingEmoteSegment', { deed: deedDieHTML })
    if(message.system.deedRollSuccess) {
      deedRollHTML +=  game.i18n.format('XCC.Athlete.GrappleRollTrainingSuccess');
    }
  }

  let crit = message.getFlag('dcc', 'isArmorTooHeavy') ? game.i18n.format('XCC.Athlete.ArmorWarning') : ''
  if (message.getFlag('dcc', 'isCrit')) {
    crit = `<p class="emote-alert critical">${message.system.critPrompt}!</p> ${message.system.critInlineRoll}`
  }
  let fumble = ''
  
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
    rollResult:message.rolls[0].total,
    rollResult2:message.rolls[0].total-4,
    rollResult3:message.rolls[0].total-8,
    rollResult4:message.rolls[0].total-12
  })
  const messageContent = html.querySelector('.message-content')
  if (messageContent) {
    messageContent.innerHTML = attackEmote
  }
}