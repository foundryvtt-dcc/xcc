export const globals = {
  id: 'xcc',
  templatesPath: 'modules/xcc/templates/',
  imagesPath: 'modules/xcc/styles/images/',
  title: 'XCrawl Classics System'
}

export const registerModuleSettings = async function () {
  game.settings.register(globals.id, 'automateMessengerDisapproval', {
    name: 'XCC.Settings.AutomateMessengerDisapproval',
    hint: 'XCC.Settings.AutomateMessengerDisapprovalHint',
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'enableMojoAutomation', {
    name: 'XCC.Settings.EnableMojoAutomation',
    hint: 'XCC.Settings.EnableMojoAutomationHint',
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeGrappleInWeapons', {
    name: 'XCC.Settings.IncludeGrappleInWeapons',
    hint: 'XCC.Settings.IncludeGrappleInWeaponsHint',
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeUnarmedInWeapons', {
    name: 'XCC.Settings.IncludeUnarmedInWeapons',
    hint: 'XCC.Settings.IncludeUnarmedInWeaponsHint',
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeShieldBashInWeapons', {
    name: 'XCC.Settings.IncludeShieldBashInWeapons',
    hint: 'XCC.Settings.IncludeShieldBashInWeaponsHint',
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'useSameDeedHalfOrc', {
    name: 'XCC.Settings.UseSameDeedHalfOrc',
    hint: 'XCC.Settings.UseSameDeedHalfOrcHint',
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'hideNotesTab', {
    name: 'XCC.Settings.HideNotesTab',
    hint: 'XCC.Settings.HideNotesTabHint',
    scope: 'user',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'smallerPause', {
    name: 'XCC.Settings.SmallerPause',
    hint: 'XCC.Settings.SmallerPauseHint',
    scope: 'user',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register(globals.id, 'isDebug', {
    name: 'XCC.Settings.IsDebug',
    hint: 'XCC.Settings.IsDebugHint',
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
}
