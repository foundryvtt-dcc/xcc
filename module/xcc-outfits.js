/* global document, foundry, game, ui */

/**
 * Outfits - alternative token artwork for a character.
 *
 * A crawler in the arena, in the street and in ceremonial kit is the same
 * character wearing different things. The wardrobe is kept on the actor, and
 * the Token HUD grows an extra palette for changing into one of them - built
 * from core's own `togglePalette` markup, so it opens, closes and stacks
 * exactly like the status effects palette beside it.
 *
 * The window that manages the wardrobe hangs off the sheet's header menu; see
 * `XCCActorSheet.openOutfits`.
 */

import { globals } from './settings.js'

// The wardrobe. Every image the character can wear is an ordinary entry in
// this one list, including the token art they started with - see
// `seedWardrobe`. `LEGACY_DEFAULT_FLAG` is the earlier design, where the
// original was held apart from the list, and is only read to migrate it in.
const OUTFITS_FLAG = 'outfits'
const LEGACY_DEFAULT_FLAG = 'defaultToken'

// Where dropped files are uploaded. Per world rather than per module, since the
// module directory is replaced wholesale on every update.
const UPLOAD_SOURCE = 'data'
const uploadDir = () => `worlds/${game.world.id}/xcc-outfits`

/* -------------------------------------------- */
/*  Wardrobe                                    */
/* -------------------------------------------- */

/**
 * The base actor behind a token. An unlinked token carries a synthetic actor
 * whose flags are a copy, so the wardrobe is read from the real one.
 *
 * @param {TokenDocument} tokenDoc
 * @returns {Actor|null}
 */
function baseActor (tokenDoc) {
  return game.actors.get(tokenDoc?.actorId) ?? tokenDoc?.actor ?? null
}

/**
 * The outfits added to a character, as image paths.
 * @param {Actor} actor
 * @returns {string[]}
 */
export function getOutfits (actor) {
  const outfits = actor?.getFlag(globals.id, OUTFITS_FLAG)
  return Array.isArray(outfits) ? outfits.filter(img => typeof img === 'string') : []
}

/**
 * Put the character's existing token art into the wardrobe, once.
 *
 * Without this the original would be the one look you could never pick again
 * once you had changed out of it, since wearing an outfit overwrites the
 * prototype token. Seeding it as an ordinary entry means it is offered like any
 * other and can be deleted like any other.
 *
 * Only ever runs against a wardrobe that has never been set. An emptied one is
 * an empty array rather than nothing, so clearing the list stays cleared.
 *
 * @param {Actor} actor
 * @returns {Promise}
 */
export async function seedWardrobe (actor) {
  if (!actor?.isOwner || actor.getFlag(globals.id, OUTFITS_FLAG) !== undefined) return
  const legacy = actor.getFlag(globals.id, LEGACY_DEFAULT_FLAG)
  const seeds = [legacy, actor.prototypeToken?.texture?.src].filter(img => !!img)
  if (!seeds.length) return
  await actor.setFlag(globals.id, OUTFITS_FLAG, [...new Set(seeds)])
  if (legacy) await actor.unsetFlag(globals.id, LEGACY_DEFAULT_FLAG)
}

/**
 * Everything the character can be wearing, in the order it was added.
 *
 * `isDefault` is a badge, not a kind of entry: it marks whichever image the
 * prototype token currently points at, so it moves when the default does and
 * nothing about it is privileged.
 *
 * @param {Actor} actor
 * @param {string} [current]   The image to mark as worn
 * @returns {{img: string, label: string, index: number, isDefault: boolean, isActive: boolean}[]}
 */
export function getWardrobe (actor, current) {
  const prototype = actor?.prototypeToken?.texture?.src
  return getOutfits(actor).map((img, index) => ({
    img,
    index,
    label: labelFor(img),
    isDefault: img === prototype,
    isActive: img === current
  }))
}

/** The file's own name, as a label. */
function labelFor (img) {
  return decodeURIComponent(img).split('/').pop().replace(/\.[^.]+$/, '')
}

/**
 * Is there a choice to make? One entry is just the art the character already
 * wears, which is not worth a button on the HUD.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export function hasWardrobe (actor) {
  return getOutfits(actor).length > 1
}

/**
 * Add images to a character's wardrobe, ignoring ones already in it.
 * @param {Actor} actor
 * @param {string[]} images
 * @returns {Promise<number>}   How many were actually added
 */
export async function addOutfits (actor, images) {
  // So the first thing added never displaces the art already in use.
  await seedWardrobe(actor)
  const outfits = getOutfits(actor)
  const added = images.filter(img => img && !outfits.includes(img))
  if (!added.length) return 0
  await actor.setFlag(globals.id, OUTFITS_FLAG, [...outfits, ...added])
  return added.length
}

/**
 * Drop one outfit from the wardrobe. Tokens already wearing it keep it - this
 * is the list of what is on offer, not a costume change.
 *
 * @param {Actor} actor
 * @param {number} index
 * @returns {Promise}
 */
export async function removeOutfit (actor, index) {
  const outfits = getOutfits(actor)
  if (!(index in outfits)) return
  outfits.splice(index, 1)
  return actor.setFlag(globals.id, OUTFITS_FLAG, outfits)
}

/**
 * Change a token into an outfit.
 *
 * A linked token is the character, so the prototype changes with it and the
 * next token dragged out is dressed the same way. An unlinked token is a copy
 * that happens to share the artwork, so only that copy changes.
 *
 * @param {TokenDocument} tokenDoc
 * @param {string} img
 * @returns {Promise}
 */
export async function wearOutfit (tokenDoc, img) {
  const actor = baseActor(tokenDoc)
  if (tokenDoc.actorLink && actor) {
    await actor.update({ 'prototypeToken.texture.src': img })
  }
  return tokenDoc.update({ 'texture.src': img })
}

/**
 * Make an outfit the character's default, without touching any token already
 * on a scene - Foundry never pushes a prototype change onto placed tokens.
 *
 * @param {Actor} actor
 * @param {string} img
 * @returns {Promise}
 */
export async function setDefaultOutfit (actor, img) {
  return actor.update({ 'prototypeToken.texture.src': img })
}

/* -------------------------------------------- */
/*  Token HUD Palette                           */
/* -------------------------------------------- */

/**
 * Put the wardrobe button and its palette into a rendered Token HUD.
 *
 * The markup is core's own - a `control-icon` carrying
 * `data-action="togglePalette"` and a sibling `.palette` with the matching
 * `data-palette`. Core's dispatcher is bound to the HUD root and its CSS
 * positions any palette in the right column, so building the pair is the whole
 * job: no open/close handling, and it collapses when another palette opens.
 *
 * @param {TokenHUD} hud
 */
function injectOutfitPalette (hud) {
  const root = hud.element
  const tokenDoc = hud.document
  const actor = baseActor(tokenDoc)
  if (!root || !tokenDoc?.isOwner || !hasWardrobe(actor)) return

  const anchor = root.querySelector('.col.right .palette[data-palette="effects"]')
  if (!anchor) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'control-icon'
  button.dataset.action = 'togglePalette'
  button.dataset.palette = 'xcc-outfits'
  button.dataset.tooltip = 'XCC.Outfits.Choose'
  button.setAttribute('aria-label', game.i18n.localize('XCC.Outfits.Choose'))
  button.innerHTML = '<i class="fa-solid fa-shirt" inert></i>'

  const palette = document.createElement('div')
  palette.className = 'palette xcc-outfits-palette'
  palette.dataset.palette = 'xcc-outfits'
  for (const entry of getWardrobe(actor, tokenDoc.texture?.src)) {
    const tile = document.createElement('img')
    tile.className = `xcc-outfit-control${entry.isActive ? ' active' : ''}`
    tile.src = entry.img
    tile.alt = entry.label
    tile.dataset.tooltipText = entry.label
    tile.dataset.outfitImg = entry.img
    palette.append(tile)
  }

  anchor.insertAdjacentElement('afterend', palette)
  anchor.insertAdjacentElement('afterend', button)

  // Choosing an outfit is not a core action, so it needs its own listener.
  palette.addEventListener('click', async (event) => {
    const img = event.target?.dataset?.outfitImg
    if (!img) return
    event.preventDefault()
    event.stopPropagation()
    await wearOutfit(tokenDoc, img)
  })
}

/**
 * Wire the wardrobe into the Token HUD.
 *
 * Wrapping `_onRender` rather than listening on `renderTokenHUD`, because the
 * hook fires too late. `BasePlaceableHUD#_onRender` re-opens whichever palette
 * was open before the render, and it does so by looking the button up by
 * `data-palette` and toggling a class on it - with no guard for a miss. A token
 * update re-renders the HUD, and changing outfit is a token update, so a
 * palette injected after that call would leave core dereferencing null every
 * time an outfit was picked. Building it first means the pair is in the DOM by
 * the time core goes looking, and the palette stays open across the change.
 */
export function registerOutfitHooks () {
  const hudClass = foundry.applications.hud.TokenHUD
  const onRender = hudClass.prototype._onRender
  hudClass.prototype._onRender = async function (context, options) {
    injectOutfitPalette(this)
    return onRender.call(this, context, options)
  }
}

/* -------------------------------------------- */
/*  Wardrobe Window                             */
/* -------------------------------------------- */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * The wardrobe manager, opened from the sheet's header menu.
 */
export class XCCOutfitsDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'xcc-outfits-{id}',
    classes: ['dcc', 'xcc', 'sheet', 'xcc-outfits-dialog'],
    position: {
      width: 420,
      height: 'auto'
    },
    window: {
      title: 'XCC.Outfits.Title',
      icon: 'fa-solid fa-shirt',
      resizable: true
    },
    actions: {
      browseOutfit: XCCOutfitsDialog.#onBrowse,
      removeOutfit: XCCOutfitsDialog.#onRemove,
      setDefaultOutfit: XCCOutfitsDialog.#onSetDefault
    }
  }

  /** @inheritDoc */
  static PARTS = {
    outfits: {
      template: globals.templatesPath + 'dialog-outfits.html'
    }
  }

  /**
   * @inheritDoc
   * One window per character, so a second open focuses the first rather than
   * stacking. `{id}` in the id above is substituted with whatever this sets.
   */
  _initializeApplicationOptions (options) {
    const initialized = super._initializeApplicationOptions(options)
    initialized.uniqueId = options.document?.id ?? ''
    return initialized
  }

  /** @returns {Actor} */
  get actor () {
    return this.options.document
  }

  /** @inheritDoc */
  get title () {
    return `${game.i18n.localize('XCC.Outfits.Title')}: ${this.actor.name}`
  }

  /** @inheritDoc */
  async _prepareContext (options = {}) {
    const context = await super._prepareContext(options)
    await seedWardrobe(this.actor)
    context.actor = this.actor
    context.editable = this.actor.isOwner
    context.canUpload = game.user.can('FILES_UPLOAD')
    context.outfits = getWardrobe(this.actor, this.actor.prototypeToken?.texture?.src)
    return context
  }

  /**
   * @inheritDoc
   * On first render only: the frame element survives a re-render, so binding
   * these in `_onRender` would stack another set of handlers each time.
   */
  async _onFirstRender (context, options) {
    await super._onFirstRender(context, options)
    if (!context.editable) return

    // Files dropped from the desktop. `dragover` has to be cancelled for the
    // drop to fire at all, and the counter guards against the dragleave that
    // fires when the pointer crosses onto a child element.
    let depth = 0
    const zone = this.element
    zone.addEventListener('dragover', event => event.preventDefault())
    zone.addEventListener('dragenter', () => { if (depth++ === 0) zone.classList.add('dropping') })
    zone.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; zone.classList.remove('dropping') } })
    zone.addEventListener('drop', async (event) => {
      event.preventDefault()
      depth = 0
      zone.classList.remove('dropping')
      await this.#onDropFiles(Array.from(event.dataTransfer?.files ?? []))
    })
  }

  /**
   * Upload dropped image files into the world and add them to the wardrobe.
   * @param {File[]} files
   */
  async #onDropFiles (files) {
    const images = files.filter(file => file.type.startsWith('image/'))
    if (!images.length) return
    if (!game.user.can('FILES_UPLOAD')) {
      return ui.notifications.warn(game.i18n.localize('XCC.Outfits.NoUploadPermission'))
    }

    const { FilePicker } = foundry.applications.apps
    const target = uploadDir()
    // `browse` is the only way to ask whether a directory exists; it throws
    // when it does not, which is the signal to create it.
    try {
      await FilePicker.implementation.browse(UPLOAD_SOURCE, target)
    } catch {
      await FilePicker.implementation.createDirectory(UPLOAD_SOURCE, target)
    }

    const paths = []
    for (const file of images) {
      const response = await FilePicker.implementation.upload(UPLOAD_SOURCE, target, file, {}, { notify: false })
      if (response?.path) paths.push(response.path)
    }
    const added = await addOutfits(this.actor, paths)
    if (added) ui.notifications.info(game.i18n.format('XCC.Outfits.Added', { count: added }))
    await this.render()
  }

  /**
   * Pick an image already in the world, or upload one through Foundry's own
   * picker - which is also the route for a player without upload rights.
   *
   * @this {XCCOutfitsDialog}
   */
  static async #onBrowse () {
    const Picker = foundry.applications.apps.FilePicker.implementation
    new Picker({
      type: 'imagevideo',
      current: this.actor.prototypeToken?.texture?.src ?? '',
      callback: async (path) => {
        await addOutfits(this.actor, [path])
        await this.render()
      }
    }).render(true)
  }

  /**
   * @this {XCCOutfitsDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRemove (event, target) {
    event.stopPropagation()
    await removeOutfit(this.actor, Number(target.dataset.index))
    await this.render()
  }

  /**
   * @this {XCCOutfitsDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onSetDefault (event, target) {
    await setDefaultOutfit(this.actor, target.dataset.img)
    await this.render()
  }
}
