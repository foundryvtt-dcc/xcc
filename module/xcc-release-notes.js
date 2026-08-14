/* global game, ChatMessage, foundry */

import { globals } from './settings.js'

const { renderTemplate } = foundry.applications.handlebars

/**
 * XCC version of the DCC system's release-notes chat card (see the system's
 * module/release-notes.js and checkReleaseNotes in module/ready-hook.mjs):
 * whisper each user a card with Release Notes and User Guide buttons the
 * first time they load a world on a new module version. The card reuses the
 * system's .dcc-release-notes-card styling and the DCC button labels; only
 * the title and link targets are XCC's own.
 */
export async function checkReleaseNotes () {
  // Never let a chat-card failure (e.g. ChatMessage.create rejecting on
  // permissions) escape: this runs inside the dcc.ready listener, and an
  // unhandled rejection there would abort the rest of XCC's ready work.
  try {
    const lastSeenVersion = game.user.getFlag(globals.id, 'lastSeenModuleVersion')
    const currentVersion = game.modules.get(globals.id).version

    if (lastSeenVersion !== currentVersion) {
      const html = await renderTemplate(globals.templatesPath + 'chat-card-release-notes.html', {})
      await ChatMessage.create({
        whisper: [game.user.id],
        content: html
      })
      await game.user.setFlag(globals.id, 'lastSeenModuleVersion', currentVersion)
    }
  } catch (e) {
    console.error('XCC | Failed to show the release notes chat card:', e)
  }

  // Register listeners for the card's buttons. Unlike the system's listener,
  // resolve via closest() so clicks landing on the button's <i> icon count.
  document.addEventListener('click', (event) => {
    const action = event.target.closest?.('[data-action]')?.dataset.action
    if (action === 'xcc-release-notes') {
      window.open('https://github.com/foundryvtt-dcc/xcc/releases')
    } else if (action === 'xcc-user-guide') {
      window.open(globals.userGuideUrl)
    }
  })
}
