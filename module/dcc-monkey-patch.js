import DCCActorSheet from '/systems/dcc/module/actor-sheet.js';
import DCCActor from '/systems/dcc/module/actor.js';
import { ensurePlus } from '/systems/dcc/module/utilities.js';

class DCCMonkeyPatch {
    static patch() {
        // Extend the DCCActorSheet to support 'Reawrds' tab and its functionality.

        // Add rewards tab.
        DCCActorSheet.END_TABS.sheet.tabs.unshift({
            id: 'rewards',
            group: 'sheet',
            label: 'XCC.Rewards.RewardsTitle'
        });
        // Add rewards part template.
        DCCActorSheet.PARTS = foundry.utils.mergeObject(DCCActorSheet.PARTS, {
            rewards: {
                id: 'rewards',
                template: 'modules/xcrawl-classics/templates/actor-partial-rewards.html'
            }
        });

        // Define actions for wealth management and sponsorship creation.
        this.increaseWealth = async function (event, target) {
            const itemId = DCCActorSheet.findDataset(target, 'itemId')
            const item = this.actor.items?.get(itemId)
            if(!item) {
                const currentWealth = this.actor.system.rewards?.baseWealth || 11;
                await this.actor.update({
                    'system.rewards.baseWealth': currentWealth + 1
                });
            }
            else {
                let wealth = item.system.rewards?.wealth || 0;
                item.update({ 'system.rewards.wealth': wealth + 1 });
            }
        };

        this.decreaseWealth = async function (event, target) {
            const itemId = DCCActorSheet.findDataset(target, 'itemId')
            const item = this.actor.items?.get(itemId)
            if(!item) {
                const currentWealth = this.actor.system.rewards?.baseWealth || 11;
                await this.actor.update({
                    'system.rewards.baseWealth': Math.max(0, currentWealth - 1)
                });
            }
            else {
                let wealth = item.system.rewards?.wealth || 0;
                item.update({ 'system.rewards.wealth': wealth - 1 });
            }
        };

        this.sponsorshipCreate = async function (event, target) {
            const type = "xcc-core-book.sponsorship"
            // Grab any data associated with this control.
            const system = foundry.utils.duplicate(target.dataset)
            // Initialize a default name.
            let name = game.i18n.localize('XCC.Rewards.NewOffer');
            system.rewards = {
                benefit: game.i18n.localize('XCC.Rewards.NewBenefit'),
                wealth: 1
            };

            const itemData = {
                name,
                img: 'modules/xcrawl-classics/styles/images/game-icons-net/money-stack.svg',
                type,
                system
            }
            // Remove the type from the dataset since it's in the itemData.type prop.
            delete itemData.system.type

            // Finally, create the item!
            return this.actor.createEmbeddedDocuments('Item', [itemData]);
        }
        
        // Add the wealth and sponsorship input actions to the DCCActorSheet
        DCCActorSheet.DEFAULT_OPTIONS = foundry.utils.mergeObject(DCCActorSheet.DEFAULT_OPTIONS, {
            actions: {
                increaseWealth: this.increaseWealth,
                decreaseWealth: this.decreaseWealth,
                sponsorshipCreate: this.sponsorshipCreate
            }
        });

        // Override the _prepareContext method to include sponsorships in the context.
        let originalPrepareContext = DCCActorSheet.prototype._prepareContext;
        DCCActorSheet.prototype._prepareContext = async function (options) {
            const context = await originalPrepareContext.call(this, options);
            let sponsorships = [];
            let inventory = this.options.document.items;
            for (const i of inventory) {
                if (i.type === 'xcc-core-book.sponsorship') {
                    if( !i.img) {
                        i.img = 'modules/xcrawl-classics/styles/images/game-icons-net/money-stack.svg';
                    }
                    sponsorships.push(i);
                }
            }
            foundry.utils.mergeObject(context, ...[ {'sponsorships' : sponsorships} ]);
            return context;
        }

        // Spell check for Blaster class are computed differently.
        let originalComputeSpellCheck = DCCActor.prototype.computeSpellCheck;
        DCCActor.prototype.computeSpellCheck = function (item, options = {}) {
            originalComputeSpellCheck.call(this, item, options);
            if (this.system.class.sheetClass === 'blaster') {
                // Custom logic for Blaster class spell checks
                let blasterMod = ensurePlus(this.system.class?.blasterDie || '')
                let abilityMod = ensurePlus(this.system.abilities.per.mod)
                let otherMod = this.system.class.spellCheckOtherMod ? ensurePlus(this.system.class.spellCheckOtherMod) : '';
                this.system.class.spellCheck = ensurePlus(blasterMod + abilityMod + otherMod)
                
                if (this.system.class.spellCheckOverride) {
                    this.system.class.spellCheck = this.system.class.spellCheckOverride
                }
            }
        }
    }
}

export default DCCMonkeyPatch;