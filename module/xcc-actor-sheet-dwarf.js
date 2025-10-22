/* eslint-disable import/no-absolute-path */
import XCCActorSheet from './xcc-actor-sheet.js'
import XCCShieldBashConfig from './xcc-shield-bash-config.js'
import { ensurePlus } from '/systems/dcc/module/utilities.js'
import { globals } from './settings.js'

class XCCActorSheetDwarf extends XCCActorSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      height: 640
    },
    actions: {
      rollShieldBashAttack: this.rollShieldBashAttack,
      configureShieldBash: this.configureShieldBash
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

  static async configureShieldBash (event, target) {
    event.preventDefault()
    await new XCCShieldBashConfig({
      document: this.actor,
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2
      }
    }).render(true)
  }

  static addHooksAndHelpers () {
    Handlebars.registerHelper('getShieldBashDamage', (actor) => {
      return actor.sheet.getShieldBashDamage()
    })
    Handlebars.registerHelper('getShieldBashDamageShort', (actor) => {
      return actor.sheet.getShieldBashDamageShort()
    })
    Handlebars.registerHelper('getShieldBashBonus', (actor) => {
      return actor.sheet.getShieldBashToHit()
    })
  }

  /** @override */
  async _prepareContext (options) {
    // Set base speed
    if (this.actor.system.details.sheetClass !== 'xcc-dwarf') {
      await this.actor.update({
        'system.attributes.speed.base': 20,
        'system.attributes.speed.value': 20,
        // we don't want armor to reduce dwarf speed, but the user can still turn on this option
        'system.config.computeSpeed': false,
        // we need to set the class link before default _prepareContext to ensure it is correct
        'system.class.classLink': await foundry.applications.ux.TextEditor.enrichHTML(game.i18n.localize('XCC.Dwarf.ClassLink'))
      })
    }

    const context = await super._prepareContext(options)
    if (this.actor.system.details.sheetClass !== 'xcc-dwarf') {
      await this.actor.update({
        'system.class.localizationPath': 'XCC.Dwarf',
        'system.class.className': 'xcc.dwarf',
        'system.details.sheetClass': 'xcc-dwarf',
        'system.details.critRange': 20,
        'system.class.disapproval': 1,
        'system.config.attackBonusMode': 'autoPerAttack',
        'system.config.addClassLevelToInitiative': false,
        'system.config.showSpells': false,
        'system.class.shieldBashDamage': '1d3',
        'system.class.shieldBashBonus': 0
      })
    }
    if (!this.actor.system.class?.shieldBashDamage) {
      await this.actor.update({
        'system.class.shieldBashDamage': '1d3'
      })
    }
    if (!this.actor.system.class?.shieldBashBonus) {
      await this.actor.update({
        'system.class.shieldBashBonus': 0
      })
    }
    return context
  }

  _onRender (context, options) {
    // Backup of shield bash code, in case we want to re-enable it instead of using an item
    if (game.settings.get(globals.id, 'includeShieldBashInWeapons')) {
      // Add the shield bash item to the equipment section
      this.parts.equipment.querySelector('.weapon-list-header').outerHTML +=
        `<li class="grid-col-span-9 weapon grid-col-gap-5" data-item-id="xcc.shield-bash">
              <input type="checkbox" data-dtype="Boolean" checked="" disabled="" class="disabled">
              <img class="icon-filter" src="` + globals.imagesPath + 'game-icons-net/shield-bash.svg" title="' + game.i18n.localize('XCC.Dwarf.ShieldBash') + '" alt="' + game.i18n.localize('XCC.Dwarf.ShieldBash') + `" width="22" height="22">
              <div class="attack-buttons">
                  <div class="rollable free-attack-button icon-filter" data-action="rollShieldBashAttack" data-drag="false" title="Roll" draggable="false">&nbsp;</div>
              </div>
              <input class="weapon-name" type="text" value="` + game.i18n.localize('XCC.Dwarf.ShieldBash') + `" readonly="">
              <input class="disabled" type="text" value="` + this.getShieldBashToHit() + `" readonly="">
              <input class="weapon-damage disabled" type="text" value="` + this.getShieldBashDamage() + `" readonly="">
              <input class="weapon-notes disabled" type="text" value="` + game.i18n.localize('XCC.Dwarf.ShieldBashNote') + `" readonly="">
              <a class="item-control" style="margin-left:8px; margin-right:8px; font-size:18px;" title="` + game.i18n.localize('XCC.Dwarf.ConfigureShieldBash') + `"
                    data-action="configureShieldBash">
                    <i class="fas fa-gear"></i>
              </a>
          </li>`
    } /**/
    super._onRender(context, options)
  }

  getShieldBashToHit () {
    return ensurePlus(this.actor.system.details.attackBonus) + ensurePlus(parseInt(this.actor.system.abilities.str.mod || 0) + parseInt(this.actor.system.class.shieldBashBonus))
  }

  getShieldBashDamage () {
    return this.actor.system.class.shieldBashDamage + ensurePlus(this.actor.system.details.attackBonus) + ensurePlus(parseInt(this.actor.system.abilities.str.mod || 0))
  }

  getShieldBashDamageShort () {
    return this.actor.system.class.shieldBashDamage + ensurePlus(parseInt(this.actor.system.abilities.str.mod || 0))
  }

  static async rollShieldBashAttack (event, target) {
    // Make a temporary fake weapon
    const fakeId = XCCActorSheet.findDataset(target, 'itemId') || ''
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
    this.actor.items.set(weapon.key, weapon.value, { modifySource: false })
    // Pass the fake weapon
    await XCCActorSheet.DEFAULT_OPTIONS.actions.rollWeaponAttack.call(this, event, target)
    // Remove the fake weapon from items after we're done
    this.actor.items.delete(weapon.id, { modifySource: false })
  }
}
export default XCCActorSheetDwarf
