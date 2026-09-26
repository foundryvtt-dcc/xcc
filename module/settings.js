export const globals = {
  id: 'xcc',
  templatesPath: 'modules/xcc/templates/',
  imagesPath: 'modules/xcc/styles/images/',
  title: 'XCrawl Classics System',
  userGuideUrl: 'https://foundryvtt-xcrawl-classics-user-guide.readthedocs.io/en/latest/'
}

export const registerModuleSettings = async function () {
  game.settings.register(globals.id, 'automateMessengerDisapproval', {
    name: 'XCC.Settings.AutomateMessengerDisapproval',
    hint: 'XCC.Settings.AutomateMessengerDisapprovalHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'enableMojoAutomation', {
    name: 'XCC.Settings.EnableMojoAutomation',
    hint: 'XCC.Settings.EnableMojoAutomationHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeGrappleInWeapons', {
    name: 'XCC.Settings.IncludeGrappleInWeapons',
    hint: 'XCC.Settings.IncludeGrappleInWeaponsHint',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeUnarmedInWeapons', {
    name: 'XCC.Settings.IncludeUnarmedInWeapons',
    hint: 'XCC.Settings.IncludeUnarmedInWeaponsHint',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register(globals.id, 'includeShieldBashInWeapons', {
    name: 'XCC.Settings.IncludeShieldBashInWeapons',
    hint: 'XCC.Settings.IncludeShieldBashInWeaponsHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'showSkillDCs', {
    name: 'XCC.Settings.ShowSkillDCs',
    hint: 'XCC.Settings.ShowSkillDCsHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'useSameDeedHalfOrc', {
    name: 'XCC.Settings.UseSameDeedHalfOrc',
    hint: 'XCC.Settings.UseSameDeedHalfOrcHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'grandstandingCrowdDC', {
    name: 'XCC.Settings.GrandstandingCrowdDC',
    hint: 'XCC.Settings.GrandstandingCrowdDCHint',
    scope: 'world',
    config: true,
    default: 14,
    type: Number
  })
  game.settings.register(globals.id, 'grandstandingBonusFame', {
    name: 'XCC.Settings.GrandstandingBonusFame',
    hint: 'XCC.Settings.GrandstandingBonusFameHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean
  })
  // Token HUD additions. Scoped per user like the other display preferences
  // below - what one person wants cluttering their HUD is not the Judge's call.
  game.settings.register(globals.id, 'showHudRolls', {
    name: 'XCC.Settings.ShowHudRolls',
    hint: 'XCC.Settings.ShowHudRollsHint',
    scope: 'user',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register(globals.id, 'showHudMojo', {
    name: 'XCC.Settings.ShowHudMojo',
    hint: 'XCC.Settings.ShowHudMojoHint',
    scope: 'user',
    config: true,
    default: true,
    type: Boolean
  })
  // World-scoped, unlike the HUD toggles above: the palette is the table's
  // shared vocabulary of conditions. One switch, because the list, its artwork
  // and the markers are one rebuild - see module/xcc-status-effects.js.
  game.settings.register(globals.id, 'overrideStatusEffects', {
    name: 'XCC.Settings.OverrideStatusEffects',
    hint: 'XCC.Settings.OverrideStatusEffectsHint',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true
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
    scope: 'world',
    config: true,
    default: false,
    type: Boolean
  })
}
