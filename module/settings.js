export const pubConstants = {
  name: 'xcc-system',
  title: 'XCrawl Classics System'
}

export const registerModuleSettings = async function () {
  game.settings.register('xcc-system', 'isDebug', {
    name: "Is Debug?",
    hint: "Enable debug mode for the module.",
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register('xcc-system', 'smallerPause', {
    name: "XCC.Settings.SmallerPause",
    hint: "XCC.Settings.SmallerPauseHint",
    scope: 'user',
    config: true,
    default: false, 
    type: Boolean
  })
  game.settings.register('xcc-system', 'useSameDeedHalfOrc', {
    name: `XCC.Settings.UseSameDeedHalfOrc`,
    hint: `XCC.Settings.UseSameDeedHalfOrcHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean    
  })
  game.settings.register('xcc-system', 'hideNotesTab', {
    name: `XCC.Settings.HideNotesTab`,
    hint: `XCC.Settings.HideNotesTabHint`,
    scope: 'user',
    config: true,
    default: true,
    type: Boolean    
  })
  game.settings.register('xcc-system', 'registerLevelDataPack', {
    name: `XCC.Settings.RegisterLevelDataPack`,
    hint: `XCC.Settings.RegisterLevelDataPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcc-system', 'registerCritTablesPack', {
    name: `XCC.Settings.RegisterCritTablesPack`,
    hint: `XCC.Settings.RegisterCritTablesPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcc-system', 'registerDisapprovalPack', {
    name: `XCC.Settings.RegisterDisapprovalPack`,
    hint: `XCC.Settings.RegisterDisapprovalPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcc-system', 'automateMessengerDisapproval', {
    name: `XCC.Settings.AutomateMessengerDisapproval`,
    hint: `XCC.Settings.AutomateMessengerDisapprovalHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcc-system', 'includeShieldBashInWeapons', {
    name: `XCC.Settings.IncludeShieldBashInWeapons`,
    hint: `XCC.Settings.IncludeShieldBashInWeaponsHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcc-system', 'includeGrappleInWeapons', {
    name: `XCC.Settings.IncludeGrappleInWeapons`,
    hint: `XCC.Settings.IncludeGrappleInWeaponsHint`,
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register('xcc-system', 'includeUnarmedInWeapons', {
    name: `XCC.Settings.IncludeUnarmedInWeapons`,
    hint: `XCC.Settings.IncludeUnarmedInWeaponsHint`,
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  
}