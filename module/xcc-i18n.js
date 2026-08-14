/* global game, foundry, Hooks */

/**
 * XCC relabels parts of the DCC system's vocabulary (Fleeting Luck -> Mojo,
 * DCC Tools -> XCC Tools, plus XCC-specific class/skill labels in the DCC
 * namespace). These used to live as a "DCC" block in lang/en.json, but a
 * lang-file override only wins for English clients: the system ships
 * translated values for SidebarTab and the FleetingLuck family in
 * de/fr/es/it/pl/cn, and the active language's system translation outranks
 * a module's English fallback. So the overrides live here and are stamped
 * onto game.i18n.translations on i18nInit — after every package's
 * translations have merged — which covers all locales.
 *
 * A future xcc translation can localize these per-language by defining the
 * same keys under an XCC.DCCOverrides block in its lang file; those win
 * over the English defaults below.
 */

export const DCC_OVERRIDES = {
  FancyPause: '⏵We will return shortly!⏴',
  FleetingLuck: 'Mojo',
  FleetingLuckClearButtonTitle: 'Take all Mojo from all users',
  FleetingLuckClearMessage: 'All Mojo lost!',
  FleetingLuckClearTitle: 'Take all Mojo from this user',
  FleetingLuckGive: 'Award Mojo',
  FleetingLuckGiveTitle: 'Award a point of Mojo to this user',
  FleetingLuckGiveMessage: '{user} gained {amount} Mojo',
  FleetingLuckResetButtonTitle: 'Reset Mojo for a new session',
  FleetingLuckResetMessage: 'Mojo reset for all users',
  FleetingLuckSpendTitle: 'Spend Mojo for this user',
  FleetingLuckSpendButtonTitle: 'Spend Mojo',
  FleetingLuckSpendMessage: '{user} spent {amount} Mojo',
  FleetingLuckSpendNoLuckWarning: '{user} has no Mojo to spend',
  FleetingLuckTakeTitle: 'Take a point of Mojo from this user',
  FleetingLuckTakeMessage: '{user} lost {amount} Mojo',
  FleetingLuckTerm: 'Mojo Amount',
  SidebarTab: 'XCC Tools',
  'system.class.disrespectPenalty': 'Disrespect Penalty',
  'system.class.devastatingAttack': 'Devastating Attack',
  'system.class.unarmedDamage': 'Unarmed Damage',
  'system.class.trainingDie': 'Training Die',
  'system.class.scramble': 'Scramble',
  'system.class.grappleCritRange': 'Grapple Crit Range',
  'system.class.grappleCritDie': 'Grapple Crit Die',
  'system.class.speed': 'Fast Movement',
  'system.class.athleticDurability': 'Athletic Durability',
  'system.class.blasterDie': 'Blaster Die',
  'system.class.critEvilRange': 'Crit vs. Evil',
  'system.class.scourge': 'Scourge',
  'system.class.turnUndeadDie': 'Turn Unholy Die',
  'system.class.charismaDie': 'Charisma Die',
  'system.class.teamMascotDie': 'Team Mascot Die',
  'system.class.saveBonus': 'Saving Throw Bonus',
  'system.skills.acrobatics.value': 'Acrobatics',
  'system.skills.poleVault.value': 'Pole vault',
  'system.skills.leap.value': 'Leap',
  'system.skills.tightropeWalk.value': 'Tightrope walk',
  'system.skills.dangerSense.value': 'Danger sense',
  'system.skills.criminalConnections.value': 'Criminal connections',
  'system.skills.briberyExpert.value': 'Bribery expert'
}

export function registerI18nOverrides () {
  Hooks.once('i18nInit', () => {
    const translated = foundry.utils.flattenObject(
      foundry.utils.getProperty(game.i18n.translations, 'XCC.DCCOverrides') ?? {}
    )
    const overrides = { ...DCC_OVERRIDES, ...translated }
    for (const [key, value] of Object.entries(overrides)) {
      foundry.utils.setProperty(game.i18n.translations, `DCC.${key}`, value)
    }
  })
}
