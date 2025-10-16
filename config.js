// Namespace XCC Configuration Values
// noinspection HtmlRequiredAltAttribute,HtmlUnknownTarget

const XCC = {}

// Packs for finding items when importing actors
XCC.actorImporterItemPacks = [
  'xcc-core-book.xcc-core-ammunition',
  'xcc-core-book.xcc-core-armor',
  'xcc-core-book.xcc-core-equipment',
  'xcc-core-book.xcc-core-weapons',
  'xcc-core-book.xcc-core-occupation-items',
  'xcc-core-book.xcc-core-spells-blaster',
  'xcc-core-book.xcc-core-spells-gnome',
  'xcc-core-book.xcc-core-spells-patron'
]

// Name re-mappings for the actor importer
XCC.actorImporterNameMap = {
  knife: ['Knife (as dagger)'],
  scissors: ['Scissors (as dagger)'],
  'tire iron': ['Tire Iron (as club)'],
  'quality knife': ['Quality Knife (as dagger)'],
  'quality hatchet': ['Quality Hatchet (as handaxe)'],
  'quality dagger': ['Quality Dagger (as dagger)'],
  'lighter - masterwork': ['Lighter, masterwork'],
  'keys to pickup': ['Keys to Pickup Truck'],
  'keys to old sedan': ['Keys to Late Model Sedan'],
  'keys to OK auto': ['Keys to Serviceable Auto'],
  'flashlight - combat': ['Flashlight, combat'],
  'combat flashlight': ['Flashlight, combat'],
  'flashlight - headset': ['Flashlight, headset'],
  'rope - 50': ['Rope, 50’'],
  'scroll of blaster spell': ['Scroll of Level-1 Blaster Spell'],
  'tats + piercings': ['Tats and Piercings'],
  'keys to motorbike': ['Keys to Motorcycle'],
  '1 lb. dried fruit': ['Dried Fruit, 1 lb.'],
  '1 lb. good cheese': ['Quality Cheese, 1 lb.'],
  'wp messenger bag': ['Waterproof Messenger Bag'],
  'beast tooth pendant': ['Monster Tooth Pendant'],
  'english-to-? dict': ['English-to-? Dictionary'],
  'clothes on your back': ['0 gp'],
  'quality gloves + hat': ['Quality Gloves', 'Quality Hat'],
  'hammer & spikes': ['Hammer (as club)', 'Iron Spikes, each (5)'],
  'longbow & quiver(24)': ['Longbow', 'Quiver', 'Arrow (24)'],
  '100 gp/m & sports car': ['100 gp', 'Keys to Sports Car'],
  'notebook + pens': ['Notebook', 'Pen (5)'],
  'chain mail & extra weapon': ['Chain Mail', 'Extra Weapon'],
  'smokes + lighter': ['Smokes', 'Lighter, Cheap'],
  'holy symbol & water': ['Holy Symbol, Silver', 'Holy water, 1 vial']
}

export default XCC
