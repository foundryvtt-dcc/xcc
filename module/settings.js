export const pubConstants = {
  name: 'xcrawl-classics',
  title: 'XCC Core Book'
}

export const registerModuleSettings = async function () {
  game.settings.register('xcrawl-classics', 'isDebug', {
    name: "Is Debug?",
    hint: "Enable debug mode for the module.",
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'smallerPause', {
    name: "XCC.Settings.SmallerPause",
    hint: "XCC.Settings.SmallerPauseHint",
    scope: 'user',
    config: true,
    default: false, 
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'useSameDeedHalfOrc', {
    name: `XCC.Settings.UseSameDeedHalfOrc`,
    hint: `XCC.Settings.UseSameDeedHalfOrcHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean    
  })
  game.settings.register('xcrawl-classics', 'hideNotesTab', {
    name: `XCC.Settings.HideNotesTab`,
    hint: `XCC.Settings.HideNotesTabHint`,
    scope: 'user',
    config: true,
    default: true,
    type: Boolean    
  })
  game.settings.register('xcrawl-classics', 'registerLevelDataPack', {
    name: `XCC.Settings.RegisterLevelDataPack`,
    hint: `XCC.Settings.RegisterLevelDataPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'registerCritTablesPack', {
    name: `XCC.Settings.RegisterCritTablesPack`,
    hint: `XCC.Settings.RegisterCritTablesPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'registerDisapprovalPack', {
    name: `XCC.Settings.RegisterDisapprovalPack`,
    hint: `XCC.Settings.RegisterDisapprovalPackHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'automateMessengerDisapproval', {
    name: `XCC.Settings.AutomateMessengerDisapproval`,
    hint: `XCC.Settings.AutomateMessengerDisapprovalHint`,
    scope: 'module',
    config: true,
    default: true,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'includeGrappleInWeapons', {
    name: `XCC.Settings.IncludeGrappleInWeapons`,
    hint: `XCC.Settings.IncludeGrappleInWeaponsHint`,
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  game.settings.register('xcrawl-classics', 'includeUnarmedInWeapons', {
    name: `XCC.Settings.IncludeUnarmedInWeapons`,
    hint: `XCC.Settings.IncludeUnarmedInWeaponsHint`,
    scope: 'module',
    config: true,
    default: false,
    type: Boolean
  })
  
}