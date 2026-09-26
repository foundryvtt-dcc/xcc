/* eslint-disable import/no-absolute-path */
/**
 * Regression tests for issue #20: the criminal sheet overwrote Bribery Expert
 * with the class level on every render, so a value typed into the field never
 * stuck.
 */
import { expect, test } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import XCCActorSheetSpCriminal from '../xcc-actor-sheet-sp-criminal.js'

function makeSheet (briberyValue, level = 3) {
  return {
    actor: {
      system: {
        details: { level: { value: level } },
        skills: {
          criminalConnections: { value: '+1' },
          briberyExpert: { value: briberyValue, ability: '', label: '' }
        }
      }
    }
  }
}

test('bribery expert keeps a value the player entered', () => {
  const sheet = makeSheet('+5')
  XCCActorSheetSpCriminal.prototype.setSpecialistSkills.call(sheet)
  expect(sheet.actor.system.skills.briberyExpert).toMatchObject({ value: '+5', ability: 'int' })
})

test('bribery expert defaults to the class level while unset', () => {
  for (const unset of ['0', '', '+0']) {
    const sheet = makeSheet(unset)
    XCCActorSheetSpCriminal.prototype.setSpecialistSkills.call(sheet)
    expect(sheet.actor.system.skills.briberyExpert.value).toEqual('+3')
  }
})
