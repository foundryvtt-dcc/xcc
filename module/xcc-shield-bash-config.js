/* global game, CONFIG, foundry */
/* eslint-disable import/no-absolute-path */

import { ensurePlus } from '/systems/dcc/module/utilities.js'
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

class XCCShieldBashConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['dcc', 'xcc', 'sheet', 'spell-check-config'],
    tag: 'form',
    position: {
      width: 420,
      height: 'auto'
    },
    window: {
      title: 'XCC.Dwarf.ConfigureShieldBash',
      resizable: false
    },
    form: {
      handler: XCCShieldBashConfig.#onSubmitForm,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'modules/xcc/templates/dialog-shield-bash-config.html'
    }
  }

  temporaryValues = undefined

  /* -------------------------------------------- */

  /**
   * Prepare context data for rendering the HTML template
   * @param {Object} options - Rendering options
   * @return {Object} The context data
   */
  async _prepareContext (options = {}) {
    const context = await super._prepareContext(options)
    const actor = this.options.document

    if (!this.temporaryValues) {
      this.temporaryValues = {
        shieldBashDamage: actor.system.class.shieldBashDamage,
        shieldBashBonus: actor.system.class.shieldBashBonus
      }
    }
    this.temporaryValues.shieldBashCheck = this.calculateShieldBashBonus()
    this.temporaryValues.shieldBashHint = this.calculateShieldBashHint()
    context.isNPC = (actor.type === 'NPC')
    context.isPC = (actor.type === 'Player')
    context.user = game.user
    context.config = CONFIG.DCC
    context.system = actor.system
    context.actor = actor
    context.temporaryValues = this.temporaryValues

    return context
  }

  static async #onSubmitForm (event, form, formData) {
    event.preventDefault()
    if (event.type === 'change') {
      this.temporaryValues = foundry.utils.expandObject(formData.object).temporaryValues
      // Recalculate form
      await this.render({})
    }
    if (event.type === 'submit') {
      // Update the actor with the form data
      const actor = this.options.document
      await actor.update({
        'system.class.shieldBashBonus': this.temporaryValues.shieldBashBonus,
        'system.class.shieldBashDamage': this.temporaryValues.shieldBashDamage
      })
      // Re-draw the updated sheet
      await actor.sheet.render(true)
      this.close()
    }
  }

  calculateShieldBashHint () {
    const actor = this.options.document
    const deedDie = actor.system.details?.attackBonus ? ensurePlus(actor.system.details.attackBonus) : ''
    const mod = actor.system.details?.attackBonus ? 0 : parseInt(actor.system.details.level.value)
    let hint = 'Bonus Source: ' + (actor.system.details?.attackBonus ? (ensurePlus(deedDie) + ' (deed), ') : (ensurePlus(mod) + ' (lvl), '))
    hint += ensurePlus(actor.system.abilities.str.mod) + ' (str)'
    if (this.temporaryValues.shieldBashBonus) {
      hint += ', ' + ensurePlus(this.temporaryValues.shieldBashBonus) + ' (shield)'
    }
    return hint
  }

  calculateShieldBashBonus () {
    const actor = this.options.document
    const deedDie = actor.system.details?.attackBonus ? ensurePlus(actor.system.details.attackBonus) : ''
    let mod = actor.system.abilities.str.mod || 0
    if (!actor.system.details?.attackBonus) mod = parseInt(mod) + parseInt(actor.system.details.level.value)
    if (this.temporaryValues.shieldBashBonus) {
      if (isNaN(parseInt(this.temporaryValues.shieldBashBonus))) {
        mod = ensurePlus(this.temporaryValues.shieldBashBonus) + ensurePlus(mod)
      } else {
        mod = parseInt(mod) + parseInt(this.temporaryValues.shieldBashBonus)
      }
    }
    return deedDie + ensurePlus(mod)
  }
}
export default XCCShieldBashConfig
