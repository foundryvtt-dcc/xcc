/* global game, CONFIG, foundry */
/* eslint-disable import/no-absolute-path */

import { ensurePlus } from '/systems/dcc/module/utilities.js'
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

class XCCSpellCheckConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['dcc', 'xcc', 'sheet', 'spell-check-config'],
    tag: 'form',
    position: {
      width: 420,
      height: 'auto'
    },
    window: {
      title: 'XCC.SpellCheckConfig',
      resizable: false
    },
    form: {
      handler: XCCSpellCheckConfig.#onSubmitForm,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'modules/xcc/templates/dialog-spell-check-config.html'
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
        spellCheckAbility: actor.system.class.spellCheckAbility,
        spellCheckOverrideDie: actor.system.class.spellCheckOverrideDie,
        spellCheckOtherMod: actor.system.class.spellCheckOtherMod,
        spellCheckOverride: actor.system.class.spellCheckOverride
      }
    }
    this.temporaryValues.spellCheck = this.calculateSpellCheckBonus()
    if (this.temporaryValues.spellCheckOverride) {
      this.temporaryValues.spellCheckHint = 'Bonus Source: ' + ensurePlus(this.temporaryValues.spellCheckOverride) + ' (override)'
    } else this.temporaryValues.spellCheckHint = this.calculateSpellCheckHint()
    context.isNPC = (actor.type === 'NPC')
    context.isPC = (actor.type === 'Player')
    context.user = game.user
    context.config = CONFIG.DCC
    context.system = actor.system
    context.actor = actor
    context.temporaryValues = this.temporaryValues

    return context
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)
  }

  /**
   * Handle form submission
   * @this {XCCSpellCheckConfig}
   * @param {SubmitEvent} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The processed form data
   * @private
   */
  static async #onSubmitForm (event, form, formData) {
    event.preventDefault()
    if (event.type === 'change') {
      this.temporaryValues = foundry.utils.expandObject(formData.object).temporaryValues
      if (this.temporaryValues.spellCheckOverride !== '') this.temporaryValues.spellCheckOverride = ensurePlus(this.temporaryValues.spellCheckOverride)
      // Recalculate form
      await this.render({})
    }
    if (event.type === 'submit') {
      // Update the actor with the form data
      const actor = this.options.document
      await actor.update({
        'system.class.spellCheckAbility': this.temporaryValues.spellCheckAbility,
        'system.class.spellCheckOverrideDie': this.temporaryValues.spellCheckOverrideDie,
        'system.class.spellCheckOtherMod': this.temporaryValues.spellCheckOtherMod,
        'system.class.spellCheckOverride': this.temporaryValues.spellCheckOverride,
        'system.class.spellCheck': this.temporaryValues.spellCheck
      })
      // Re-draw the updated sheet
      await actor.sheet.render(true)
      this.close()
    }
  }

  calculateSpellCheckHint () {
    const actor = this.options.document
    const blasterDie = actor.system.class?.blasterDie ? ensurePlus(actor.system.class.blasterDie) : ''
    const mod = actor.system.class?.blasterDie ? 0 : parseInt(actor.system.details.level.value)
    let hint = 'Bonus Source: ' + (actor.system.class?.blasterDie ? (ensurePlus(blasterDie) + ' (blaster), ') : (ensurePlus(mod) + ' (lvl), '))
    hint += ensurePlus(actor.system.abilities[this.temporaryValues.spellCheckAbility].mod) + ' (' + this.temporaryValues.spellCheckAbility + ')'
    if (actor.system.details.sheetClass === 'sp-elf-trickster') {
      hint += ', ' + ensurePlus(actor.system.abilities.lck.mod) + ' (lck)'
    }
    if (this.temporaryValues.spellCheckOtherMod) {
      hint += ', ' + ensurePlus(this.temporaryValues.spellCheckOtherMod) + ' (extra)'
    }
    return hint
  }

  calculateSpellCheckBonus () {
    const actor = this.options.document
    const blasterDie = actor.system.class?.blasterDie ? ensurePlus(actor.system.class.blasterDie) : ''
    let mod = actor.system.abilities[this.temporaryValues.spellCheckAbility]?.mod || 0
    if (!actor.system.class?.blasterDie) mod = parseInt(mod) + parseInt(actor.system.details.level.value)
    if (actor.system.details.sheetClass === 'sp-elf-trickster') {
      mod = parseInt(mod) + parseInt(actor.system.abilities.lck.mod)
    }
    if (this.temporaryValues.spellCheckOtherMod) {
      if (isNaN(parseInt(this.temporaryValues.spellCheckOtherMod))) {
        mod = ensurePlus(this.temporaryValues.spellCheckOtherMod) + ensurePlus(mod)
      } else {
        mod = parseInt(mod) + parseInt(this.temporaryValues.spellCheckOtherMod)
      }
    }
    return blasterDie + ensurePlus(mod)
  }
}
export default XCCSpellCheckConfig
