import DCCActorSheet from "/systems/dcc/module/actor-sheet.js";
import { ensurePlus } from "/systems/dcc/module/utilities.js";
import { globals } from './settings.js';

class XCCActorSheetDwarf extends DCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollShieldBashAttack: this.rollShieldBashAttack
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
    xccdwarf: {
      id: 'xcc-dwarf',
      template: globals.templatesPath + 'actor-partial-dwarf.html'
    }
  }

  /** @inheritDoc */
  static CLASS_TABS = {
    sheet: {
      tabs: [
        { id: 'character', group: 'sheet', label: 'DCC.Character' },
        { id: 'equipment', group: 'sheet', label: 'DCC.Equipment' },
        { id: 'xcc-dwarf', group: 'sheet', label: 'XCC.Dwarf.ActorSheetDwarf' }
      ]
    }
  }

  static addHooksAndHelpers() {
    Handlebars.registerHelper('getShieldBashDamage', (actor) => {
      return actor.system.class.shieldBashDamage + ensurePlus(actor.system.details.attackBonus);
    });
    Handlebars.registerHelper('getShieldBashBonus', (actor) => {
      return actor.system.details.attackBonus + ensurePlus(actor.system.class.shieldBashBonus);
    });
  }

  /** @override */
  async _prepareContext(options) {
    // Set base speed
    if (this.actor.system.details.sheetClass !== 'xcc-dwarf') {
      await this.actor.update({
        'system.attributes.speed.base': 20,
        'system.attributes.speed.value': 20,
        // we don't want armor to reduce dwarf speed, but the user can still turn on this option
        'system.config.computeSpeed': false
      })
    }

    const context = await super._prepareContext(options)

    if (this.actor.system.details.sheetClass !== 'xcc-dwarf') {
      await this.actor.update({
        'system.class.localizationPath': "XCC.Dwarf",
        'system.class.className': "xcc.dwarf",
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Dwarf.ClassLink')),
        'system.details.sheetClass': 'xcc-dwarf',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false
      })
    }
    // Never used when _onRender is commented out, but left in case we want to re-enable skill-based shield bash
    if (!this.actor.system.class?.shieldBashDamage) {
      await this.actor.update({
        'system.class.shieldBashDamage': "1d3"
      });
    }
    if (!this.actor.system.class?.shieldBashBonus) {
      await this.actor.update({
        'system.class.shieldBashBonus': 0
      });
    }
    return context
  }

  _onRender(context, options) {
    // Backup of shield bash code, in case we want to re-enable it instead of using an item
    /*if (game.settings.get(globals.id, 'includeShieldBashInWeapons')) {
      // Add the Grapple item to the equipment section
      let items = this.parts.equipment.querySelector('.weapon-list-header').outerHTML +=
        `<li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.brawler.unarmedRegular">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <img class="icon-filter" src="`+globals.imagesPath + `game-icons-net/shield-bash.svg" title="`+ game.i18n.localize("XCC.Dwarf.ShieldBash") + `" alt="` + game.i18n.localize("XCC.Dwarf.ShieldBash") + `" width="22" height="22">
              <div class="attack-buttons">
                  <div class="rollable free-attack-button icon-filter" data-action="rollShieldBashAttack" data-drag="false" title="Roll" draggable="false">&nbsp;</div>
              </div>
              <input class="weapon-name" type="text" value="`+ game.i18n.localize("XCC.Dwarf.ShieldBash") + `" readonly="">
              <input class="disabled" type="text" value="`+ this.getShieldBashToHit() + `" readonly="">
              <input class="weapon-damage disabled" style="width: auto;" type="text" value="`+ this.getShieldBashDamage() + `" readonly="">
              <input class="weapon-notes disabled" type="text" value="`+ game.i18n.localize("XCC.Dwarf.ShieldBashNote") + `" readonly="">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <div class="disabled">-</div>
          </li>`;
    }*/
    super._onRender(context, options);
  }

  getShieldBashToHit() {
    return this.actor.system.details.attackBonus + ensurePlus(parseInt(this.actor.system.abilities.str.mod || 0) + parseInt(this.actor.system.class.shieldBashBonus));
  }

  getShieldBashDamage() {
    return this.actor.system.class.shieldBashDamage + ensurePlus(this.actor.system.details.attackBonus) + ensurePlus(parseInt(this.actor.system.abilities.str.mod || 0));
  }

  static async rollShieldBashAttack(event, target) {
    // Make a temporary fake weapon
    const fakeId = DCCActorSheet.findDataset(target, 'itemId') || '';
    const weapon = {
      key: fakeId,
      value: {
        name: game.i18n.localize('XCC.Dwarf.ShieldBash').toLowerCase(),
        system: {
          actionDie: '1d14',
          damage: this.getShieldBashDamage(),
          critRange: 20,
          toHit: this.getShieldBashToHit()
        },
        id: fakeId,
        _id: fakeId
      }
    }
    // Add the fake weapon to the actor's items
    this.actor.items.set(weapon.key, weapon.value, { modifySource: false });
    // Pass the fake weapon
    await DCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target);
    // Remove the fake weapon from items after we're done
    this.actor.items.delete(weapon.id, { modifySource: false });
  }
}
export default XCCActorSheetDwarf;