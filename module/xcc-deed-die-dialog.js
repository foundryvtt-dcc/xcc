/* global game, Hooks */

/**
 * Link the deed die in DCC's roll modifier dialog (ctrl+click an attack).
 *
 * With a deed die, the dialog lists it twice: once in the attack row, and again
 * in the damage row as an ordinary damage die, because the weapon's damage
 * formula carries it too. DCC swaps that damage die for the attack's deed
 * result - but only while both are the same kind of die. Change one to a d4
 * and leave the other a d3, and the damage rolls its own d3.
 *
 * So the damage copy is relabelled "Deed Die" and the two fields are kept in
 * step: typing in either, or using the dice chain, preset or reset buttons on
 * either, copies the value to the other. Nothing in the dialog's own logic
 * changes; if DCC's layout ever moves on, this simply stops applying.
 */

/** Faces of a single die formula ("+1d4" -> 4), or null. */
export function dieFaces (formula) {
  const match = String(formula ?? '').trim().match(/^[+-]?\d*d(\d+)$/)
  return match ? parseInt(match[1]) : null
}

/**
 * The damage field that carries the deed die: the last one of the deed die's
 * size, since the weapon's own dice come first in the damage formula.
 * @param {string} deedValue - the attack row's deed die, e.g. "1d3"
 * @param {{value: string}[]} damageFields
 */
export function findDamageDeedField (deedValue, damageFields) {
  const faces = dieFaces(deedValue)
  if (!faces) return null
  return damageFields.filter(field => dieFaces(field.value) === faces).at(-1) ?? null
}

/**
 * Relabel and link the deed die fields of a rendered roll modifier dialog.
 * @param {HTMLElement} html - the dialog element
 */
export function linkDeedDice (html) {
  const deedLabel = game.i18n.localize('DCC.DeedDie')
  const damageRow = html.querySelector('.dcc-roll-modifier .damage-row')
  const attackRow = [...html.querySelectorAll('.dcc-roll-modifier .formula-row')].find(row => row !== damageRow)
  if (!damageRow || !attackRow) return

  const labelFor = (row, field) => [...row.querySelectorAll('label.term-label')].find(label => label.htmlFor === field.id)
  const attackLabel = [...attackRow.querySelectorAll('label.term-label')].find(label => label.textContent.trim() === deedLabel)
  const attackField = attackLabel && [...attackRow.querySelectorAll('input.term-field')].find(field => field.id === attackLabel.htmlFor)
  if (!attackField) return

  const damageField = findDamageDeedField(attackField.value, [...damageRow.querySelectorAll('input.term-field')])
  if (!damageField) return
  const damageLabel = labelFor(damageRow, damageField)
  if (damageLabel) damageLabel.textContent = deedLabel

  const other = new Map([[attackField, damageField], [damageField, attackField]])
  const copyFrom = (field) => { other.get(field).value = field.value }

  // Typing in either field
  for (const field of other.keys()) {
    field.addEventListener('input', () => copyFrom(field))
    field.addEventListener('change', () => copyFrom(field))
  }

  // The dialog's buttons write the field directly, without an input event, so
  // copy once their click handler has run
  const byTerm = new Map([...other.keys()].map(field => [field.id.replace(/^term-/, ''), field]))
  html.addEventListener('click', (event) => {
    const field = byTerm.get(event.target.closest?.('[data-term]')?.dataset.term)
    if (field) setTimeout(() => copyFrom(field), 0)
  })
}

export function registerDeedDieDialogHooks () {
  Hooks.on('renderRollModifierDialog', (app, html) => linkDeedDice(html))
}
