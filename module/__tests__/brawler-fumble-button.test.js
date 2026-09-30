/* eslint-disable import/no-absolute-path */
/* global game, ChatMessage */
import { expect, test, vi, beforeEach } from 'vitest'
import '/systems/dcc/module/__mocks__/foundry.js'

import XCCActorSheetBrawler from '../xcc-actor-sheet-brawler.js'

let canModify, inserted, clickHandler

function makeMessage (flags, { isAuthor = true } = {}) {
  return {
    isContentVisible: true,
    isAuthor,
    speaker: { actor: 'a1' },
    getFlag: (scope, key) => flags[`${scope}.${key}`],
    setFlag: vi.fn()
  }
}

function makeHtml () {
  return {
    querySelector: (selector) => selector === '.message-content'
      ? { insertAdjacentHTML: (_where, markup) => { inserted = markup } }
      : { addEventListener: (_type, handler) => { clickHandler = handler } }
  }
}

beforeEach(() => {
  canModify = true
  inserted = null
  clickHandler = null
  game.user = { isGM: false }
  game.i18n.localize = (key) => key
  ChatMessage.getSpeakerActor = () => ({ canUserModify: () => canModify })
})

test('no button without the double-ones flag', () => {
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(makeMessage({}), makeHtml())
  expect(inserted).toBeNull()
})

test('a flagged attack gets the Roll Fumble? button and label', () => {
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(makeMessage({ 'xcc.doubleOnesFumble': 'd4-1' }), makeHtml())
  expect(inserted).toContain('XCC.Brawler.RollFumbleQuestion')
  expect(inserted).toContain('XCC.Brawler.OnlyDoubleOnes')
  expect(inserted).not.toContain('disabled')
})

test('users who cannot modify the actor do not see the button', () => {
  canModify = false
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(makeMessage({ 'xcc.doubleOnesFumble': 'd4' }), makeHtml())
  expect(inserted).toBeNull()
})

test('once rolled the button is disabled for players but not for the GM', () => {
  const flags = { 'xcc.doubleOnesFumble': 'd4', 'xcc.doubleOnesFumbleRolled': true }
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(makeMessage(flags), makeHtml())
  expect(inserted).toContain('disabled')

  game.user = { isGM: true }
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(makeMessage(flags), makeHtml())
  expect(inserted).not.toContain('disabled')
})

test('clicking rolls the stored formula as a fumble and marks the card', async () => {
  const toMessage = vi.fn()
  const createRoll = vi.fn(async () => ({ evaluate: vi.fn(), toMessage }))
  game.dcc = { DCCRoll: { createRoll } }
  const message = makeMessage({ 'xcc.doubleOnesFumble': 'd4-1' })
  XCCActorSheetBrawler.addDoubleOnesFumbleButton(message, makeHtml())

  await clickHandler({ preventDefault: vi.fn() })

  expect(createRoll.mock.calls[0][0][0].formula).toEqual('d4-1')
  expect(toMessage).toHaveBeenCalledWith(expect.objectContaining({
    flavor: 'DCC.Fumble (Table 4-2: Fumbles)',
    flags: { 'dcc.RollType': 'Fumble' }
  }))
  expect(message.setFlag).toHaveBeenCalledWith('xcc', 'doubleOnesFumbleRolled', true)
})
