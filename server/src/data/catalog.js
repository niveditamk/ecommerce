/* =============================================================
   AURELIS API - CATALOGUE & CONTENT
   The single source of truth for products, boutiques and copy.
   ============================================================= */

export const BRAND = {
  name: 'AURELIS',
  sub: 'Maison',
  tagline: 'Rare objects for the considered life',
  founded: 1911,
  city: 'Geneva',
  phone: '+41 22 501 88 00',
  email: 'concierge@aurelis.example',
  hours: 'Concierge available 09:00 &ndash; 21:00 CET, seven days'
};

export const CATEGORIES = [
  { slug: 'jewellery', name: 'Fine Jewellery', shape: 'ring', palette: 'gold', tag: 'Stone &amp; Setting',
    blurb: 'Hand-set stones in recycled 18k gold. Every piece bench-made in our Geneva atelier.',
    sub: ['Rings', 'Necklaces', 'Cuffs &amp; Bangles'] },
  { slug: 'horology', name: 'Horology', shape: 'watch', palette: 'platinum', tag: 'Movement',
    blurb: 'Mechanical calibres finished by hand, regulated in five positions over sixty days.',
    sub: ['Automatic', 'Hand-Wound', 'Complications'] },
  { slug: 'parfums', name: 'Parfums Rares', shape: 'flacon', palette: 'amber', tag: 'Extrait',
    blurb: 'Extrait concentrations from Grasse, aged in oak for a minimum of eleven months.',
    sub: ['Extrait de Parfum', 'Eau de Parfum', 'Discovery Sets'] },
  { slug: 'leather', name: 'Leather Atelier', shape: 'bag', palette: 'noir', tag: 'Saddle-Stitched',
    blurb: 'Full-grain hides, vegetable tanned for nine months, stitched by a single artisan.',
    sub: ['Handbags', 'Travel', 'Small Leather Goods'] },
  { slug: 'objets', name: 'Objets &amp; Home', shape: 'decanter', palette: 'jade', tag: 'Mouth-Blown',
    blurb: 'Crystal, cire and lacquer for the interior. Made in numbered runs, never repeated.',
    sub: ['Crystal', 'Candles', 'Desk'] },
  { slug: 'silk', name: 'Silk &amp; Cashmere', shape: 'scarf', palette: 'rose', tag: 'Woven in Como',
    blurb: 'Twill silk printed in forty-two screens; cashmere spun from Alashan winter fleece.',
    sub: ['Scarves', 'Stoles'] },
  { slug: 'eyewear', name: 'Eyewear', shape: 'glasses', palette: 'sapphire', tag: 'Acetate &amp; Titanium',
    blurb: 'Italian acetate milled over eight weeks, paired with mineral glass lenses.',
    sub: ['Sun', 'Titanium'] }
];

const RAW_PRODUCTS = [
  /* ---- JEWELLERY ---- */
  { id: 'aur-101', name: 'Solstice Signet', cat: 'jewellery', sub: 'Rings', price: 402500,
    shape: 'ring', palette: 'gold', year: 2024, edition: 'Numbered to 120',
    materials: '18k recycled yellow gold, 1.10ct step-cut citrine',
    blurb: 'A flat-shouldered signet carrying a single step-cut stone, cut to hold the low winter light.',
    story: 'The Solstice began as a commission for an astronomer in Uppsala who wanted a ring that read the season. Our setter Marceline spent four months on the bezel geometry alone, angling the table by 2.4 degrees so the stone gathers light from below rather than above. It is the only ring in the house that must be set before it is polished.',
    details: [
      { k: 'Metal', v: '18k recycled yellow gold, 12.4g' },
      { k: 'Stone', v: 'Step-cut citrine, 1.10ct, Zambian' },
      { k: 'Setting', v: 'Hand-cut bezel, closed back' },
      { k: 'Band', v: '3.2mm, comfort profile' },
      { k: 'Hallmark', v: 'Geneva assay, maison punch' }
    ],
    care: 'Wipe with the enclosed chamois. Remove before bathing. Complimentary re-polish annually.',
    sizes: ['46', '48', '50', '52', '54', '56', '58'],
    colors: [{ name: 'Yellow Gold', hex: '#d8bc85', palette: 'gold' }, { name: 'White Gold', hex: '#c3cbd6', palette: 'platinum' }, { name: 'Blackened', hex: '#3b4356', palette: 'obsidian' }],
    rating: 4.9, reviews: 128, stock: 6, badges: ['Atelier'], tags: ['gold', 'signet', 'citrine', 'ring'] },

  { id: 'aur-102', name: 'Nocturne Pendant', cat: 'jewellery', sub: 'Necklaces', price: 273000,
    shape: 'necklace', palette: 'violet', year: 2023, edition: 'Numbered to 200',
    materials: '18k white gold, 0.84ct tanzanite, 42cm graduated chain',
    blurb: 'A graduated bead chain descending to a tapered tanzanite drop.',
    story: 'Each of the forty-three beads is drawn to a different diameter, so the chain gathers weight as it falls. It sits differently on every neck, which is the point.',
    details: [
      { k: 'Metal', v: '18k white gold, rhodium-free' },
      { k: 'Stone', v: 'Tanzanite, 0.84ct, D-block' },
      { k: 'Length', v: '42cm, adjustable to 45cm' },
      { k: 'Clasp', v: 'Hidden box with double catch' }
    ],
    care: 'Store flat in the pouch provided. Avoid ultrasonic cleaning.',
    colors: [{ name: 'Tanzanite', hex: '#a993dd', palette: 'violet' }, { name: 'Aquamarine', hex: '#7d9ede', palette: 'sapphire' }],
    rating: 4.8, reviews: 74, stock: 9, badges: ['New'], tags: ['pendant', 'necklace', 'tanzanite'] },

  { id: 'aur-103', name: 'Meridian Cuff', cat: 'jewellery', sub: 'Cuffs &amp; Bangles', price: 531000,
    shape: 'cuff', palette: 'platinum', year: 2022, edition: 'Numbered to 80',
    materials: 'Solid platinum 950, hand-forged',
    blurb: 'One continuous forged band, opened at the wrist and finished with rock-crystal terminals.',
    story: 'Forged from a single billet over eleven days. The maker leaves the last hammer marks unpolished on the inner face &mdash; a signature the wearer alone sees.',
    details: [
      { k: 'Metal', v: 'Platinum 950, 84g' },
      { k: 'Terminals', v: 'Rock crystal, hand-domed' },
      { k: 'Width', v: '30mm tapering to 22mm' },
      { k: 'Fit', v: 'Adjustable +/- 6mm' }
    ],
    care: 'Platinum develops a patina by design. Re-finishing on request.',
    sizes: ['Small', 'Medium', 'Large'],
    rating: 5.0, reviews: 31, stock: 3, badges: ['Rare'], tags: ['cuff', 'platinum', 'bangle'] },

  { id: 'aur-104', name: 'Ember Band', cat: 'jewellery', sub: 'Rings', price: 178500,
    shape: 'ring', palette: 'rose', year: 2025, edition: 'Open series',
    materials: '18k rose gold, brushed finish',
    blurb: 'An unadorned band with a soft brushed face and a mirror-polished inner wall.',
    story: 'The simplest object we make and the hardest to finish. The transition between brushed and polished is done freehand, which is why two bands are never quite identical.',
    details: [
      { k: 'Metal', v: '18k rose gold, 6.8g' },
      { k: 'Width', v: '4.0mm' },
      { k: 'Finish', v: 'Brushed exterior, polished interior' }
    ],
    care: 'Rose gold warms with wear. Re-brush annually if preferred.',
    sizes: ['46', '48', '50', '52', '54', '56', '58', '60'],
    colors: [{ name: 'Rose Gold', hex: '#e0a4a9', palette: 'rose' }, { name: 'Yellow Gold', hex: '#d8bc85', palette: 'gold' }],
    rating: 4.6, reviews: 210, stock: 24, badges: [], tags: ['band', 'ring', 'rose gold'] },

  /* ---- HOROLOGY ---- */
  { id: 'aur-201', name: 'Calibre 09 Reserve', cat: 'horology', sub: 'Hand-Wound', price: 1568500,
    shape: 'watch', palette: 'platinum', year: 2024, edition: 'Numbered to 60 per year',
    materials: '39mm platinum case, in-house calibre AU-09, 96h reserve',
    blurb: 'A hand-wound calibre with a ninety-six hour reserve and a dial finished in grand feu enamel.',
    story: 'Nine months of the build is waiting. The enamel dial is fired seven times, and roughly one in three survives the kiln. The movement is regulated across sixty days in five positions before a case is even selected for it.',
    details: [
      { k: 'Case', v: '39mm platinum 950, 9.8mm thick' },
      { k: 'Movement', v: 'AU-09 hand-wound, 21,600 vph' },
      { k: 'Reserve', v: '96 hours, twin barrel' },
      { k: 'Dial', v: 'Grand feu enamel, fired seven times' },
      { k: 'Water', v: '30m, screwed caseback' },
      { k: 'Strap', v: 'Alligator, hand-stitched, pin buckle' }
    ],
    care: 'Wind fully each morning. Service interval seven years.',
    colors: [{ name: 'Enamel White', hex: '#f2f5f8', palette: 'platinum' }, { name: 'Midnight', hex: '#5c6070', palette: 'noir' }, { name: 'Verdigris', hex: '#6fbfa9', palette: 'jade' }],
    rating: 5.0, reviews: 46, stock: 2, badges: ['Atelier', 'Rare'], tags: ['watch', 'platinum', 'enamel', 'hand-wound'] },

  { id: 'aur-202', name: 'Perpetuel Automatic', cat: 'horology', sub: 'Automatic', price: 1029000,
    shape: 'watch', palette: 'gold', year: 2023, edition: 'Open series',
    materials: '38mm 18k gold case, micro-rotor automatic',
    blurb: 'A micro-rotor automatic kept deliberately thin, with a sector dial in warm silver.',
    story: 'The micro-rotor lets the case sit at 8.4mm &mdash; thin enough to disappear under a cuff, which is the whole argument for it.',
    details: [
      { k: 'Case', v: '38mm 18k yellow gold, 8.4mm' },
      { k: 'Movement', v: 'AU-14 micro-rotor, 60h' },
      { k: 'Dial', v: 'Sector, galvanic silver' },
      { k: 'Water', v: '50m' }
    ],
    care: 'Wear regularly or store on a winder at 650 tpd.',
    colors: [{ name: 'Yellow Gold', hex: '#d8bc85', palette: 'gold' }, { name: 'Steel', hex: '#c3cbd6', palette: 'platinum' }],
    rating: 4.9, reviews: 88, stock: 5, badges: ['New'], tags: ['watch', 'automatic', 'gold'] },

  { id: 'aur-203', name: 'Nuit Chronograph', cat: 'horology', sub: 'Complications', price: 2033500,
    shape: 'watch', palette: 'obsidian', year: 2022, edition: 'Numbered to 40',
    materials: '41mm blackened titanium, column-wheel chronograph',
    blurb: 'A column-wheel chronograph in blackened grade-5 titanium with a smoked sapphire dial.',
    story: 'Built for a client who flies at night. The dial is smoked sapphire so the movement reads as a shadow behind the hands rather than a display.',
    details: [
      { k: 'Case', v: '41mm grade-5 titanium, DLC' },
      { k: 'Movement', v: 'AU-21 column-wheel, 68h' },
      { k: 'Dial', v: 'Smoked sapphire, skeletonised' },
      { k: 'Water', v: '100m' }
    ],
    care: 'DLC is hard but not immune. Avoid abrasives.',
    rating: 4.9, reviews: 27, stock: 1, badges: ['Rare'], tags: ['watch', 'chronograph', 'titanium'] },

  /* ---- PARFUMS ---- */
  { id: 'aur-301', name: 'Fumee d&rsquo;Or Extrait', cat: 'parfums', sub: 'Extrait de Parfum', price: 38000,
    shape: 'flacon', palette: 'amber', year: 2021, edition: 'House icon',
    materials: '50ml extrait, 28% concentration',
    blurb: 'Smoked labdanum, Somali frankincense and a long, resinous drydown.',
    story: 'Composed by Elise Roux over three years and eleven submissions. The eleventh was accepted on the condition that nothing be removed &mdash; it is a dense perfume and meant to be.',
    details: [
      { k: 'Concentration', v: 'Extrait, 28%' },
      { k: 'Top', v: 'Pink pepper, bergamot' },
      { k: 'Heart', v: 'Labdanum, immortelle, saffron' },
      { k: 'Base', v: 'Frankincense, oud, benzoin' },
      { k: 'Longevity', v: '10&ndash;14 hours' },
      { k: 'Flacon', v: 'Mouth-blown, refillable' }
    ],
    care: 'Store away from light. Refills available in boutique.',
    sizes: ['15ml', '50ml', '100ml'],
    colors: [{ name: 'Amber', hex: '#d99a4e', palette: 'amber' }],
    rating: 4.8, reviews: 342, stock: 40, badges: ['Icon'], tags: ['perfume', 'extrait', 'oud', 'incense'] },

  { id: 'aur-302', name: 'Vetiver Blanc', cat: 'parfums', sub: 'Eau de Parfum', price: 23500,
    shape: 'flacon', palette: 'jade', year: 2024, edition: 'Open series',
    materials: '100ml eau de parfum, 18% concentration',
    blurb: 'Haitian vetiver washed clean with grapefruit peel and a chalk-dry iris.',
    story: 'We wanted a vetiver with no sweetness at all. It took removing eleven ingredients rather than adding any.',
    details: [
      { k: 'Concentration', v: 'Eau de parfum, 18%' },
      { k: 'Top', v: 'Grapefruit peel, green mandarin' },
      { k: 'Heart', v: 'Haitian vetiver, iris butter' },
      { k: 'Base', v: 'Cedar, white musk' },
      { k: 'Longevity', v: '7&ndash;9 hours' }
    ],
    care: 'Store upright, away from heat.',
    sizes: ['50ml', '100ml'],
    rating: 4.7, reviews: 196, stock: 55, badges: ['New'], tags: ['perfume', 'vetiver', 'fresh'] },

  { id: 'aur-303', name: 'Discovery Coffret No.1', cat: 'parfums', sub: 'Discovery Sets', price: 16000,
    shape: 'flacon', palette: 'violet', year: 2025, edition: 'Open series',
    materials: 'Six 9ml flacons in a lacquered case',
    blurb: 'Six of the house in miniature, with a credit towards any full flacon.',
    story: 'The coffret exists because perfume should be lived with for a week before it is bought.',
    details: [
      { k: 'Contents', v: 'Six 9ml flacons' },
      { k: 'Credit', v: '₹16,000 towards any 50ml or 100ml' },
      { k: 'Case', v: 'Lacquered beech, magnetic' }
    ],
    care: 'Keep the case closed between wearings.',
    rating: 4.9, reviews: 508, stock: 120, badges: [], tags: ['perfume', 'set', 'gift', 'discovery'] },

  { id: 'aur-304', name: 'Nuit de Sel', cat: 'parfums', sub: 'Extrait de Parfum', price: 43000,
    shape: 'flacon', palette: 'sapphire', year: 2020, edition: 'Reissue, 500 flacons',
    materials: '50ml extrait, 30% concentration',
    blurb: 'Salt, ambergris and cold stone. Discontinued in 2020, reissued once.',
    story: 'It was withdrawn when our ambergris source closed. A replacement was found in 2024 and matched over nineteen trials.',
    details: [
      { k: 'Concentration', v: 'Extrait, 30%' },
      { k: 'Top', v: 'Sea salt, aldehydes' },
      { k: 'Heart', v: 'Ambergris, seaweed absolute' },
      { k: 'Base', v: 'Mineral musk, driftwood' }
    ],
    care: 'Store away from light.',
    sizes: ['50ml'],
    rating: 4.9, reviews: 87, stock: 4, badges: ['Rare'], tags: ['perfume', 'salt', 'ambergris'] },

  /* ---- LEATHER ---- */
  { id: 'aur-401', name: 'Bastion Tote', cat: 'leather', sub: 'Handbags', price: 327500,
    shape: 'bag', palette: 'noir', year: 2023, edition: 'Open series',
    materials: 'Vegetable-tanned full-grain calf, brass furniture',
    blurb: 'A structured tote saddle-stitched by one artisan, start to finish, in fourteen hours.',
    story: 'Every Bastion carries the initials of its maker inside the gusset. The hide is tanned in pits over nine months in Tuscany &mdash; a process that costs us four times a chrome tannage and is the only reason the bag ages the way it does.',
    details: [
      { k: 'Leather', v: 'Full-grain calf, pit-tanned 9 months' },
      { k: 'Stitch', v: 'Saddle-stitched, 7 spi, linen thread' },
      { k: 'Hardware', v: 'Solid brass, hand-burnished' },
      { k: 'Dimensions', v: '34 x 28 x 14cm' },
      { k: 'Lining', v: 'Goatskin, unlined base' }
    ],
    care: 'Condition twice yearly. Patina is expected and welcome.',
    colors: [{ name: 'Noir', hex: '#3b4356', palette: 'noir' }, { name: 'Cognac', hex: '#d99a4e', palette: 'amber' }, { name: 'Bone', hex: '#c3cbd6', palette: 'platinum' }],
    rating: 4.9, reviews: 156, stock: 8, badges: ['Atelier'], tags: ['bag', 'tote', 'leather'] },

  { id: 'aur-402', name: 'Voyage Weekender', cat: 'leather', sub: 'Travel', price: 464500,
    shape: 'bag', palette: 'amber', year: 2022, edition: 'Open series',
    materials: 'Bridle leather, solid brass, canvas lining',
    blurb: 'A three-day bag built on a bridle-leather frame that will outlive its first owner.',
    story: 'Designed around a specific brief: everything for three nights, nothing checked.',
    details: [
      { k: 'Leather', v: 'English bridle, 3.2mm' },
      { k: 'Dimensions', v: '52 x 30 x 26cm' },
      { k: 'Capacity', v: '41 litres' },
      { k: 'Hardware', v: 'Solid brass, lockable' }
    ],
    care: 'Bridle leather blooms. Buff the wax back with a soft cloth.',
    colors: [{ name: 'Cognac', hex: '#d99a4e', palette: 'amber' }, { name: 'Noir', hex: '#3b4356', palette: 'noir' }],
    rating: 4.8, reviews: 64, stock: 4, badges: [], tags: ['bag', 'travel', 'weekender'] },

  { id: 'aur-403', name: 'Carte Cardholder', cat: 'leather', sub: 'Small Leather Goods', price: 26500,
    shape: 'bag', palette: 'obsidian', year: 2025, edition: 'Open series',
    materials: 'Alligator, hand-skived edges',
    blurb: 'Four pockets, one fold, no stitching visible from the outside.',
    story: 'Skived to 0.6mm at the fold so it closes flat even when full.',
    details: [
      { k: 'Leather', v: 'Alligator, matte finish' },
      { k: 'Pockets', v: 'Four card, one note' },
      { k: 'Dimensions', v: '10.4 x 7.6cm' }
    ],
    care: 'Keep dry. Exotic leathers mark permanently when wet.',
    colors: [{ name: 'Slate', hex: '#3b4356', palette: 'obsidian' }, { name: 'Noir', hex: '#5c6070', palette: 'noir' }],
    rating: 4.7, reviews: 288, stock: 30, badges: [], tags: ['wallet', 'cardholder', 'alligator', 'gift'] },

  /* ---- OBJETS ---- */
  { id: 'aur-501', name: 'Aequus Decanter', cat: 'objets', sub: 'Crystal', price: 120000,
    shape: 'decanter', palette: 'jade', year: 2021, edition: 'Open series',
    materials: 'Mouth-blown lead-free crystal, 1.4L',
    blurb: 'A wide-shouldered decanter blown in one gather, with a ground-glass stopper.',
    story: 'Blown by two makers working as a pair. The stopper is ground to its own decanter and will not fit another.',
    details: [
      { k: 'Material', v: 'Lead-free crystal, mouth-blown' },
      { k: 'Capacity', v: '1.4 litres' },
      { k: 'Height', v: '28cm' },
      { k: 'Stopper', v: 'Ground glass, matched' }
    ],
    care: 'Hand wash only. Dry inverted on a stand.',
    rating: 4.8, reviews: 92, stock: 14, badges: [], tags: ['decanter', 'crystal', 'home', 'gift'] },

  { id: 'aur-502', name: 'Cire No.7 &mdash; Fig &amp; Ash', cat: 'objets', sub: 'Candles', price: 12000,
    shape: 'candle', palette: 'jade', year: 2024, edition: 'House icon',
    materials: '380g coconut-soy wax, cotton wick, refillable vessel',
    blurb: 'Green fig, woodsmoke and a trace of cold hearth. Seventy hours.',
    story: 'The vessel is designed to be kept &mdash; refills ship in a paper sleeve with no second container.',
    details: [
      { k: 'Wax', v: 'Coconut-soy blend, 380g' },
      { k: 'Burn', v: '70 hours' },
      { k: 'Wick', v: 'Braided cotton, lead-free' },
      { k: 'Vessel', v: 'Hand-finished glass, refillable' }
    ],
    care: 'Trim the wick to 5mm before each burn.',
    sizes: ['220g', '380g', '1.1kg'],
    rating: 4.7, reviews: 412, stock: 88, badges: ['Icon'], tags: ['candle', 'home', 'fig', 'gift'] },

  { id: 'aur-503', name: 'Lumen Table Lamp', cat: 'objets', sub: 'Desk', price: 189000,
    shape: 'candle', palette: 'gold', year: 2023, edition: 'Numbered to 150',
    materials: 'Patinated bronze, alabaster shade',
    blurb: 'A bronze column carrying a hand-cut alabaster shade that glows rather than shines.',
    story: 'Each alabaster shade is cut from a single block, so no two diffuse light identically.',
    details: [
      { k: 'Body', v: 'Patinated bronze, 4.2kg' },
      { k: 'Shade', v: 'Alabaster, hand-cut' },
      { k: 'Height', v: '42cm' },
      { k: 'Fitting', v: 'E14, dimmable, 2700K' }
    ],
    care: 'Dust with a dry brush. Do not wet alabaster.',
    rating: 4.9, reviews: 38, stock: 5, badges: ['Rare'], tags: ['lamp', 'bronze', 'alabaster', 'home'] },

  /* ---- SILK ---- */
  { id: 'aur-601', name: 'Carre Astral', cat: 'silk', sub: 'Scarves', price: 49000,
    shape: 'scarf', palette: 'rose', year: 2024, edition: 'Open series',
    materials: '90cm twill silk, hand-rolled hem, 42 screens',
    blurb: 'A star chart of the northern sky in forty-two screens, hemmed by hand.',
    story: 'Printed in Como on a mill that has run since 1872. Forty-two screens is near the practical limit; the forty-third was cut and abandoned.',
    details: [
      { k: 'Fabric', v: 'Twill silk, 16 momme' },
      { k: 'Size', v: '90 x 90cm' },
      { k: 'Print', v: '42 screens, Como' },
      { k: 'Hem', v: 'Hand-rolled, matched thread' }
    ],
    care: 'Dry clean only. Store rolled, never folded.',
    colors: [{ name: 'Rose Nuit', hex: '#e0a4a9', palette: 'rose' }, { name: 'Bleu Astral', hex: '#7d9ede', palette: 'sapphire' }, { name: 'Vert Jade', hex: '#6fbfa9', palette: 'jade' }],
    rating: 4.8, reviews: 176, stock: 26, badges: ['New'], tags: ['scarf', 'silk', 'carre', 'gift'] },

  { id: 'aur-602', name: 'Alashan Stole', cat: 'silk', sub: 'Stoles', price: 98000,
    shape: 'scarf', palette: 'platinum', year: 2022, edition: 'House icon',
    materials: 'Grade-A Alashan cashmere, 4-ply, 200 x 70cm',
    blurb: 'Four-ply winter fleece, combed once a year, woven loose enough to breathe.',
    story: 'The fibre is under 15.5 microns and comes from a single co-operative we have bought from since 1994.',
    details: [
      { k: 'Fibre', v: 'Alashan cashmere, under 15.5 micron' },
      { k: 'Ply', v: '4-ply, 380gsm' },
      { k: 'Size', v: '200 x 70cm' },
      { k: 'Finish', v: 'Hand-fringed' }
    ],
    care: 'Hand wash cool with cashmere shampoo. Dry flat.',
    colors: [{ name: 'Ivoire', hex: '#c3cbd6', palette: 'platinum' }, { name: 'Fumee', hex: '#5c6070', palette: 'noir' }, { name: 'Rose Pale', hex: '#e0a4a9', palette: 'rose' }],
    rating: 4.9, reviews: 121, stock: 18, badges: ['Icon'], tags: ['cashmere', 'stole', 'scarf'] },

  /* ---- EYEWEAR ---- */
  { id: 'aur-701', name: 'Cassis Sun', cat: 'eyewear', sub: 'Sun', price: 64500,
    shape: 'glasses', palette: 'sapphire', year: 2025, edition: 'Open series',
    materials: 'Italian acetate, mineral glass lenses, titanium core',
    blurb: 'A soft square in eight-week acetate with mineral glass and a titanium core wire.',
    story: 'Acetate blocks are cured for eight weeks before milling; the shorter cure is why cheaper frames warp.',
    details: [
      { k: 'Frame', v: 'Italian acetate, 8-week cure' },
      { k: 'Lens', v: 'Mineral glass, category 3' },
      { k: 'Core', v: 'Titanium wire, adjustable' },
      { k: 'Width', v: '142mm, 51-21' }
    ],
    care: 'Clean with the microfibre supplied. Never wipe dry.',
    colors: [{ name: 'Bleu Fume', hex: '#7d9ede', palette: 'sapphire' }, { name: 'Ecaille', hex: '#d99a4e', palette: 'amber' }, { name: 'Noir', hex: '#5c6070', palette: 'noir' }],
    rating: 4.7, reviews: 143, stock: 22, badges: ['New'], tags: ['sunglasses', 'eyewear', 'acetate'] },

  { id: 'aur-702', name: 'Filament Optical', cat: 'eyewear', sub: 'Titanium', price: 78000,
    shape: 'glasses', palette: 'platinum', year: 2023, edition: 'Open series',
    materials: 'Beta-titanium, 11g, rimless bridge',
    blurb: 'Eleven grams of beta-titanium. You forget you are wearing it within an hour.',
    story: 'Built for a client who wears glasses eighteen hours a day. Weight was the only brief.',
    details: [
      { k: 'Frame', v: 'Beta-titanium, 11g' },
      { k: 'Lens', v: 'Prescription, not included' },
      { k: 'Hinge', v: 'Screwless flex' },
      { k: 'Width', v: '138mm, 49-20' }
    ],
    care: 'Titanium is hypoallergenic and will not corrode.',
    rating: 4.8, reviews: 67, stock: 16, badges: [], tags: ['optical', 'eyewear', 'titanium'] },

  /* ============================================================
     CATALOGUE EXPANSION
     Seventeen pieces per collection, each written to one specific
     CC-licensed museum photograph rather than to a stock image —
     the object in the copy is the object in the frame. Licence,
     author and source for every photograph live beside the image
     path in client/src/lib/imageManifest.json.
     ============================================================ */

  /* ---- PARFUMS ---- */
  { id: "aur-305", name: "Sidon Verte", cat: "parfums", sub: "Extrait", price: 78400,
    shape: "flacon", palette: "jade", year: 2023, edition: "Numbered to 120",
    materials: "30ml extrait, 26% concentration",
    blurb: "Mastic tears, green fig wood and the flat mineral smell of a hot glass pipe.",
    story: "The flacon follows a candlestick unguentarium from the Sidon coast, where blown glass was first worked: a reservoir barely a thumb deep beneath a neck longer than the body under it. Theo Bregnard lost eleven necks to collapse before he learned to keep the pipe turning through the cooling stroke. He scratches one short line into each base, which is how a flacon of his run is told from the second glassmaker's.",
    details: [
      { k: "Concentration", v: "Extrait, 26%" },
      { k: "Top", v: "Mastic tears, green fig" },
      { k: "Heart", v: "Cistus, dry cypress" },
      { k: "Base", v: "Vetiver root, labdanum" },
      { k: "Flacon", v: "Free-blown, 118mm neck" }
    ],
    care: "The neck is thin. Set it down on the base, never on its side.",
    sizes: ["30ml"],
    colors: [{ name: "Fig Green", hex: "#5f8d72", palette: "jade" }],
    rating: 4.8, reviews: 64, stock: 6, badges: ["Numbered"], tags: ["perfume","extrait","mastic","fig","resin"] },

  { id: "aur-306", name: "Verre d&rsquo;Antioche", cat: "parfums", sub: "Eau de Parfum", price: 34600,
    shape: "flacon", palette: "ivory", year: 2024, edition: "Open series",
    materials: "45ml eau de parfum, 19% concentration",
    blurb: "Bitter orange leaf over warm beeswax, worn close to the skin.",
    story: "Antioch glassmakers used the candlestick neck as a measure: what the tube held was one anointing, and the reservoir below it held the rest. We kept that proportion and fill to the same line, so the flacon carries 45ml rather than a round 50. Vera Lindqvist refused to widen the tube to make the number tidy.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 19%" },
      { k: "Top", v: "Bitter orange leaf, petitgrain" },
      { k: "Heart", v: "Beeswax absolute, orris" },
      { k: "Base", v: "Sandalwood, tonka" },
      { k: "Fill", v: "45ml, to the neck line" }
    ],
    care: "Keep the stopper seated. A narrow neck left open loses a season in a week.",
    sizes: ["45ml"],
    colors: [{ name: "Wax Ivory", hex: "#efe6d4", palette: "ivory" }],
    rating: 4.6, reviews: 148, stock: 22, badges: [], tags: ["perfume","orange","beeswax","soft"] },

  { id: "aur-307", name: "Bouteille de Treves", cat: "parfums", sub: "Extrait", price: 96400,
    shape: "flacon", palette: "obsidian", year: 2022, edition: "One of 40",
    materials: "50ml extrait, 27% concentration",
    blurb: "Cold smoke, birch tar and wet slate.",
    story: "A squat Moselle bottle, wider at the shoulder than at the foot, which is why it sits steady on a damp shelf. The birch tar is distilled by Konrad Weiss outside Trier in a kiln his family has fired since 1948. He sends four litres a year and we take all of it, which sets the run at forty flacons whether we want more or not.",
    details: [
      { k: "Concentration", v: "Extrait, 27%" },
      { k: "Top", v: "Juniper smoke, black pepper" },
      { k: "Heart", v: "Birch tar, wet slate accord" },
      { k: "Base", v: "Oakmoss, tobacco leaf" },
      { k: "Yield", v: "40 flacons per distillation" }
    ],
    care: "Tar darkens in daylight. Keep the flacon boxed between wearings.",
    sizes: ["50ml"],
    colors: [{ name: "Slate Black", hex: "#1b1c20", palette: "obsidian" }],
    rating: 4.9, reviews: 41, stock: 0, badges: ["Rare"], tags: ["perfume","extrait","smoke","birch","tar"] },

  { id: "aur-308", name: "Iris de Ravenne", cat: "parfums", sub: "Extrait", price: 64800,
    shape: "flacon", palette: "platinum", year: 2025, edition: "Numbered to 200",
    materials: "50ml extrait, 24% concentration",
    blurb: "Orris root held four years, with almond milk and cold butter.",
    story: "Orris cannot be hurried. The rhizomes are lifted, dried and then left alone for four years before they smell of anything at all; this lot came out of Tuscan ground in 2020 and was opened last spring. Nadia Ferri matched the wall thickness of the flacon to a Roman flask in the Ravenna museum, thin enough that the level shows through without a mark on the glass.",
    details: [
      { k: "Concentration", v: "Extrait, 24%" },
      { k: "Orris", v: "Tuscan, four-year dried" },
      { k: "Heart", v: "Almond milk, ambrette" },
      { k: "Base", v: "Cold butter accord, white musk" },
      { k: "Maceration", v: "11 months in oak" }
    ],
    care: "Store upright and out of light. The glass is thin at the shoulder.",
    sizes: ["15ml","50ml"],
    colors: [{ name: "Pale Platinum", hex: "#cfd3d6", palette: "platinum" }, { name: "Orris Grey", hex: "#b7bcc0", palette: "platinum" }],
    rating: 4.7, reviews: 213, stock: 11, badges: ["Atelier"], tags: ["perfume","extrait","orris","powder"] },

  { id: "aur-309", name: "Cendre Bleue", cat: "parfums", sub: "Eau de Parfum", price: 27900,
    shape: "flacon", palette: "lapis", year: 2026, edition: "Open series",
    materials: "100ml eau de parfum, 17% concentration",
    blurb: "Blue chamomile over cold ash and juniper.",
    story: "Blue chamomile is not dyed. The azulene forms during distillation and the colour holds if the still is kept cool; Marta Devi runs hers eight degrees under the usual and the oil comes off inky. The bottle it copies has no shoulder at all, a straight cone with a folded lip, so the colour reads all the way down the side.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 17%" },
      { k: "Top", v: "Juniper berry, blue chamomile" },
      { k: "Heart", v: "Cold ash accord, clary sage" },
      { k: "Base", v: "Grey amber, cedar" },
      { k: "Longevity", v: "6&ndash;8 hours" }
    ],
    care: "Colour fades in sunlight before the scent does. Keep it shaded.",
    sizes: ["50ml","100ml"],
    colors: [{ name: "Azulene Blue", hex: "#24487e", palette: "lapis" }],
    rating: 4.5, reviews: 96, stock: 34, badges: ["New"], tags: ["perfume","chamomile","juniper","ash"] },

  { id: "aur-310", name: "Baume de Cyrene", cat: "parfums", sub: "Extrait", price: 112500,
    shape: "flacon", palette: "gold", year: 2021, edition: "One of 40",
    materials: "30ml extrait, 29% concentration",
    blurb: "Bitter fennel resin and acacia honey, going dark and green on the skin.",
    story: "The Romans ate silphium out of existence and the plant stamped on the Cyrene coins cannot be smelled by anyone now living. Ines Marchetti built the absence out of asafoetida, sweet fennel and galbanum, then cut it back with acacia honey until it stopped reading as medicine. Forty flacons were poured. She has refused a second run twice.",
    details: [
      { k: "Concentration", v: "Extrait, 29%" },
      { k: "Top", v: "Sweet fennel, galbanum" },
      { k: "Heart", v: "Asafoetida tincture, acacia honey" },
      { k: "Base", v: "Opoponax, beeswax" },
      { k: "Run", v: "40 flacons, poured once" }
    ],
    care: "Honey materials thicken in cold. Warm the flacon in the hand before use.",
    sizes: ["30ml"],
    colors: [{ name: "Coin Gold", hex: "#c9a227", palette: "gold" }],
    rating: 5, reviews: 18, stock: 2, badges: ["Last Pieces","Rare"], tags: ["perfume","extrait","fennel","honey","resin"] },

  { id: "aur-311", name: "Resine de Palmyre", cat: "parfums", sub: "Extrait", price: 88200,
    shape: "flacon", palette: "oxblood", year: 2020, edition: "Numbered to 120",
    materials: "50ml extrait, 26% concentration",
    blurb: "Dates, saffron and a resin that stays on wool for a week.",
    story: "Palmyra taxed incense by the camel-load and the tariff stone still lists what came through the gate. We worked from that list rather than from a brief: myrrh, bdellium, date syrup, saffron. Bdellium was the hard one. Our supplier in Jodhpur grades the tears by hand and rejects about half of what he is brought, and we buy only the top grade.",
    details: [
      { k: "Concentration", v: "Extrait, 26%" },
      { k: "Top", v: "Saffron, cumin seed" },
      { k: "Heart", v: "Bdellium, date syrup accord" },
      { k: "Base", v: "Myrrh, guaiac, styrax" },
      { k: "Longevity", v: "12&ndash;16 hours" }
    ],
    care: "Resins mark linen. Apply to skin, not to a collar.",
    sizes: ["30ml","50ml"],
    colors: [{ name: "Myrrh Red", hex: "#6d2229", palette: "oxblood" }, { name: "Date Brown", hex: "#7a4a33", palette: "oxblood" }],
    rating: 4.8, reviews: 73, stock: 0, badges: ["Rare"], tags: ["perfume","extrait","myrrh","saffron","incense"] },

  { id: "aur-312", name: "Verre Malade", cat: "parfums", sub: "Eau de Parfum", price: 21400,
    shape: "flacon", palette: "ivory", year: 2024, edition: "Open series",
    materials: "100ml eau de parfum, 16% concentration",
    blurb: "Wet glass, lemon peel and a dusty white flower.",
    story: "Conservators call it verre malade: glass that weeps, then crazes, then goes cloudy from the inside. The plain Roman bottle this one follows has been stable since it was catalogued in 1913, and the record says why, which is that it was kept dry. The perfume takes the idea and not the fault. It opens damp and is flat and mineral within the hour.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 16%" },
      { k: "Top", v: "Lemon peel, wet glass accord" },
      { k: "Heart", v: "Dusty jasmine, hay" },
      { k: "Base", v: "Chalk, soft musk" },
      { k: "Flacon", v: "Soda-lime, annealed 14 hours" }
    ],
    care: "Wipe the neck dry after filling. Standing moisture clouds the glass.",
    sizes: ["50ml","100ml"],
    colors: [{ name: "Clouded Ivory", hex: "#e8ded0", palette: "ivory" }],
    rating: 4.4, reviews: 118, stock: 18, badges: [], tags: ["perfume","lemon","jasmine","mineral"] },

  { id: "aur-313", name: "Nard Noir", cat: "parfums", sub: "Extrait", price: 134700,
    shape: "flacon", palette: "noir", year: 2019, edition: "One of 40",
    materials: "30ml extrait, 31% concentration",
    blurb: "Spikenard, black tea and old leather.",
    story: "Spikenard is dug at four thousand metres above Jumla and the collectors are licensed by weight. Our 2019 allocation was eleven kilos of root, which came to forty flacons and nothing further. The oil is nearly black and stains a blotter permanently, so the sampling cards for this one are stored apart from the rest of the library.",
    details: [
      { k: "Concentration", v: "Extrait, 31%" },
      { k: "Top", v: "Black tea, bay" },
      { k: "Heart", v: "Himalayan spikenard, patchouli" },
      { k: "Base", v: "Old leather accord, vetiver" },
      { k: "Allocation", v: "11kg root, 40 flacons" }
    ],
    care: "Two drops is a full wearing. It does not need help.",
    sizes: ["30ml"],
    colors: [{ name: "Root Black", hex: "#14100f", palette: "noir" }],
    rating: 4.9, reviews: 29, stock: 1, badges: ["Last Pieces","Rare"], tags: ["perfume","extrait","spikenard","leather","tea"] },

  { id: "aur-314", name: "Terre d&rsquo;Ombre", cat: "parfums", sub: "Eau de Parfum", price: 31200,
    shape: "flacon", palette: "obsidian", year: 2025, edition: "Open series",
    materials: "100ml eau de parfum, 18% concentration",
    blurb: "Earth pigment, cocoa hull and a dry vetiver.",
    story: "Raw umber out of the Troodos hills smells of nothing in the jar. Ground wet on a slab it smells faintly of a cellar, and that is the thing we spent a season trying to reproduce. It came out as beetroot, cocoa hull and a Javanese vetiver that had been sitting in our stores since 2016 and had gone quiet enough to sit underneath.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 18%" },
      { k: "Top", v: "Beetroot, black cardamom" },
      { k: "Heart", v: "Cocoa hull, damp earth accord" },
      { k: "Base", v: "Javanese vetiver, cade" },
      { k: "Longevity", v: "8&ndash;10 hours" }
    ],
    care: "Store away from heat. Warmth pushes the cocoa forward.",
    sizes: ["50ml","100ml"],
    colors: [{ name: "Umber", hex: "#23252b", palette: "obsidian" }, { name: "Cocoa Hull", hex: "#3a2e28", palette: "obsidian" }],
    rating: 4.6, reviews: 187, stock: 27, badges: [], tags: ["perfume","earth","cocoa","vetiver"] },

  { id: "aur-315", name: "Souffle Court", cat: "parfums", sub: "Extrait", price: 57300,
    shape: "flacon", palette: "platinum", year: 2023, edition: "Numbered to 300",
    materials: "50ml extrait, 23% concentration",
    blurb: "Aldehydes, pressed linen and a clean skin musk.",
    story: "A short breath makes thin glass. Bregnard's rule for this flacon is one lungful, and a piece not finished on that breath goes into the cullet bin unfinished; three hundred survived a run of four hundred and forty. The perfume was built to the same rule, nine materials with none of them covering another.",
    details: [
      { k: "Concentration", v: "Extrait, 23%" },
      { k: "Materials", v: "Nine, no filler" },
      { k: "Top", v: "Aldehydes C-11, C-12" },
      { k: "Heart", v: "Pressed linen accord, orris" },
      { k: "Base", v: "Skin musk, blond wood" }
    ],
    care: "Thin glass chips at the rim. Do not stand it in a crowded tray.",
    sizes: ["50ml"],
    colors: [{ name: "Linen White", hex: "#d9dcde", palette: "platinum" }],
    rating: 4.7, reviews: 132, stock: 9, badges: ["Numbered","Atelier"], tags: ["perfume","extrait","aldehyde","linen","musk"] },

  { id: "aur-316", name: "Camphre et Cire", cat: "parfums", sub: "Eau de Parfum", price: 24800,
    shape: "flacon", palette: "ivory", year: 2026, edition: "Open series",
    materials: "100ml eau de parfum, 17% concentration",
    blurb: "Borneo camphor over warm candle wax, cold at the top and soft underneath.",
    story: "Borneol crystallises inside the standing tree and is picked out of the split trunk rather than distilled; a good tree gives about a matchbox of crystal. We buy three matchboxes a year through a cooperative at Barus and stretch them with rosemary so the opening still reads cold at the fourth hour instead of the first.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 17%" },
      { k: "Top", v: "Borneol crystal, rosemary" },
      { k: "Heart", v: "Candle wax accord, elemi" },
      { k: "Base", v: "Sandalwood, benzoin" },
      { k: "Supply", v: "Three pickings a year, Barus" }
    ],
    care: "Camphor sublimes. Close the flacon firmly and keep it cool.",
    sizes: ["50ml","100ml"],
    colors: [{ name: "Candle Ivory", hex: "#f2ead9", palette: "ivory" }],
    rating: 4.5, reviews: 61, stock: 31, badges: ["New"], tags: ["perfume","camphor","wax","cool"] },

  { id: "aur-317", name: "Chappuis 1911", cat: "parfums", sub: "Extrait", price: 158600,
    shape: "flacon", palette: "gold", year: 2021, edition: "One of 40",
    materials: "30ml extrait, 30% concentration",
    blurb: "Rose de Mai, animalic base and a heavy amber, read as first written.",
    story: "Marguerite Chappuis wrote the maison's first formula on the back of a Geneva customs form in April 1911. The paper is in the office and the ink has gone brown. Two of her materials are now prohibited and a third is no longer produced anywhere; this reading substitutes those three and leaves the remaining twenty-two at the weights she gave, including the rose at a rate no accountant would sign off today.",
    details: [
      { k: "Concentration", v: "Extrait, 30%" },
      { k: "Formula", v: "25 materials, 22 unchanged" },
      { k: "Heart", v: "Rose de Mai, ylang" },
      { k: "Base", v: "Amber, civet substitute, oakmoss" },
      { k: "Run", v: "40 flacons, 2021" }
    ],
    care: "Left in daylight the amber darkens. Keep it in the box.",
    sizes: ["30ml"],
    colors: [{ name: "Archive Gold", hex: "#b8912f", palette: "gold" }, { name: "Rose Ink", hex: "#8a5a4c", palette: "gold" }],
    rating: 5, reviews: 47, stock: 3, badges: ["Last Pieces","Icon"], tags: ["perfume","extrait","rose","amber","archive"] },

  { id: "aur-318", name: "Longue Meche", cat: "parfums", sub: "Coffret", price: 46500,
    shape: "flacon", palette: "obsidian", year: 2024, edition: "Numbered to 120",
    materials: "One 30ml candlestick flacon and two sealed 15ml refills",
    blurb: "The candlestick flacon, two sealed refills and the cannula needed to fill it.",
    story: "The neck on a candlestick unguentarium is too long and too narrow for a funnel, so this coffret ships with a 1.2mm steel cannula alongside the refills. Emile Renaud, who cases them, moved the cannula from the tray into a clip in the lid after the first thirty coffrets, because it kept rolling out when the box was opened flat.",
    details: [
      { k: "Contents", v: "One 30ml flacon, two 15ml refills" },
      { k: "Concentration", v: "Extrait, 25%" },
      { k: "Neck", v: "121mm, filled by cannula" },
      { k: "Cannula", v: "1.2mm steel, clipped in lid" },
      { k: "Case", v: "Beech, magnetic close" }
    ],
    care: "Fill slowly. A fast pour traps air and pushes back up the neck.",
    sizes: [],
    colors: [{ name: "Beech Black", hex: "#1a1614", palette: "obsidian" }, { name: "Steel", hex: "#8d9196", palette: "obsidian" }],
    rating: 4.8, reviews: 55, stock: 7, badges: ["Numbered"], tags: ["perfume","coffret","refill","extrait"] },

  { id: "aur-319", name: "Encre de Chene", cat: "parfums", sub: "Extrait", price: 71900,
    shape: "flacon", palette: "oxblood", year: 2022, edition: "Numbered to 200",
    materials: "50ml extrait, 25% concentration",
    blurb: "Oak gall, iron and a dark plum.",
    story: "Iron gall ink is oak gall, iron salt and gum, and for about a day after it is mixed it smells sharp and slightly metallic before settling into paper. That first day is what this is. The metallic note is a single aldehyde carried at 0.3 percent; at 0.4 it stops reading as iron and starts reading as blood, which we established across nine trials and did not enjoy.",
    details: [
      { k: "Concentration", v: "Extrait, 25%" },
      { k: "Top", v: "Dark plum, blackcurrant bud" },
      { k: "Heart", v: "Oak gall accord, iron note at 0.3%" },
      { k: "Base", v: "Gum arabic, oak, leather" },
      { k: "Trials", v: "Nine, to fix the iron rate" }
    ],
    care: "Do not decant. The iron note goes off contact with metal.",
    sizes: ["50ml"],
    colors: [{ name: "Ink Oxblood", hex: "#5d1f26", palette: "oxblood" }],
    rating: 4.7, reviews: 88, stock: 0, badges: ["Rare","Numbered"], tags: ["perfume","extrait","oak","ink","plum"] },

  { id: "aur-320", name: "Pierre Ponce", cat: "parfums", sub: "Eau de Parfum", price: 19600,
    shape: "flacon", palette: "platinum", year: 2025, edition: "Open series",
    materials: "100ml eau de parfum, 15% concentration",
    blurb: "Pumice, wet stone and a thin lemon.",
    story: "Lipari pumice is collected rather than quarried. It floats, and the boats take it off the north shore in nets. Held under a running tap it smells chalky and faintly of sulphur; the sulphur we left out, and everything else is in here, with a Sicilian lemon pressed the same week as the stone was washed.",
    details: [
      { k: "Concentration", v: "Eau de parfum, 15%" },
      { k: "Top", v: "Sicilian lemon, bergamot" },
      { k: "Heart", v: "Wet pumice accord, salt fig" },
      { k: "Base", v: "Chalk, grey musk" },
      { k: "Longevity", v: "5&ndash;7 hours" }
    ],
    care: "A light thing, and it goes off in heat. Do not keep it in a car.",
    sizes: ["50ml","100ml"],
    colors: [{ name: "Pumice Grey", hex: "#c2c6c8", palette: "platinum" }],
    rating: 4.3, reviews: 154, stock: 24, badges: [], tags: ["perfume","stone","lemon","mineral"] },

  { id: "aur-321", name: "Coffret Aquilee", cat: "parfums", sub: "Coffret", price: 42300,
    shape: "flacon", palette: "rose", year: 2026, edition: "Open series",
    materials: "Five 9ml flacons in a cut-felt tray",
    blurb: "Five of the Roman glass series at full strength, in a fitted tray.",
    story: "Aquileia sent glass north up the Amber Road, and its workshops turned out the plain thick-walled bottle this tray is cut for. The five inside are poured at their full extrait strength rather than reduced for the coffret, which is why each well takes 9ml and not 12. The fill was set by what the oils cost, not by what fitted the box.",
    details: [
      { k: "Contents", v: "Five 9ml flacons" },
      { k: "Concentration", v: "Extrait, 24&ndash;31% as poured" },
      { k: "Tray", v: "Cut felt, five wells" },
      { k: "Case", v: "Beech, magnetic close" },
      { k: "Refill", v: "Empty flacons refilled at 60% in boutique" }
    ],
    care: "Keep the case closed between wearings. The wells hold the flacons upright.",
    sizes: [],
    colors: [{ name: "Amber Road Rose", hex: "#c48b7a", palette: "rose" }, { name: "Felt Clay", hex: "#b9776b", palette: "rose" }],
    rating: 4.6, reviews: 34, stock: 14, badges: ["New"], tags: ["perfume","coffret","discovery","gift"] },

  /* ---- LEATHER ---- */
  { id: "aur-404", name: "Kainuu Field Bag", cat: "leather", sub: "Bags", price: 214800,
    shape: "bag", palette: "obsidian", year: 2021, edition: "Numbered to 120",
    materials: "Bark-tanned reindeer, shearling lining, antler toggle",
    blurb: "A hunting bag cut from one piece of hide, with the fleece left on inside the flap.",
    story: "Osmo Rautio has trapped the Oulanka watershed since 1979 and lent us the bag his grandfather carried, a Finnish hunter's satchel lined in bird and seal skin so that the shot stayed dry against the body. We kept the single-piece body and the fur lining and took the wild pelts out, lining ours in shorn reindeer instead. The flap is cut long enough to reach the base seam, which is the reason nothing inside rattles when you walk.",
    details: [
      { k: "Leather", v: "Reindeer, bark-tanned 14 weeks" },
      { k: "Lining", v: "Shorn reindeer shearling, 12mm pile" },
      { k: "Closure", v: "Single long flap, antler toggle" },
      { k: "Dimensions", v: "30 x 26 x 11cm" },
      { k: "Strap", v: "Adjustable 92-128cm, 32mm harness" }
    ],
    care: "Brush the fleece cold. Never dry the hide near heat.",
    sizes: ["One size"],
    colors: [{ name: "Peat", hex: "#3a3630", palette: "obsidian" }, { name: "Birch", hex: "#c9bda6", palette: "ivory" }],
    rating: 4.6, reviews: 41, stock: 6, badges: ["Numbered"], tags: ["bag","hunting","reindeer","shearling"] },

  { id: "aur-405", name: "Praxis Visiting Bag", cat: "leather", sub: "Bags", price: 268400,
    shape: "bag", palette: "noir", year: 2019, edition: "Open series",
    materials: "Black bridle hide, nickel-plated steel frame, waxed drill lining",
    blurb: "A physician's bag on a hinged steel frame that opens flat to both sides.",
    story: "The pattern comes from a bag made for a Liverpool consultant between the wars, hinged so that both jaws fall away and the whole interior is visible at once rather than through a slot. Our frame is drawn from 4mm steel and nickel-plated by Tobias Renz in Solingen, who still finishes surgical instruments. The jaws are set to hold at 140 degrees, so the bag stands open on a table without a hand on it.",
    details: [
      { k: "Leather", v: "Black bridle, 2.8mm, hot-stuffed" },
      { k: "Frame", v: "Nickel-plated steel, 4mm section" },
      { k: "Opening", v: "Jaws hold at 140 degrees, unassisted" },
      { k: "Dimensions", v: "41 x 24 x 21cm" },
      { k: "Lining", v: "Waxed cotton drill, wipe-clean" }
    ],
    care: "Wipe the frame dry after wet weather. Nickel spots before steel does.",
    sizes: ["One size"],
    colors: [{ name: "Noir", hex: "#22242a", palette: "noir" }, { name: "Oxblood", hex: "#5c2226", palette: "oxblood" }],
    rating: 4.8, reviews: 73, stock: 2, badges: ["Icon"], tags: ["bag","frame","doctor","bridle"] },

  { id: "aur-406", name: "Aldgate Instrument Bag", cat: "leather", sub: "Bags", price: 189600,
    shape: "case", palette: "platinum", year: 2024, edition: "One of 40",
    materials: "Bridle hide, elastic-backed loops, steel frame, brass feet",
    blurb: "Fitted inside with sixteen loops, each cut to hold one instrument rather than to fill the space.",
    story: "We measured the interior of an English visiting bag whose instruments had survived alongside it, and found every loop had been sewn to a single object: two wide ones for the stethoscope, four narrow for syringe barrels, one broad enough for a wrapped kidney dish. Ours keeps that logic. Karin Aeschbach sets the loops in Geneva only after the customer has sent the dimensions of what they intend to carry, so no two interiors have left the atelier the same.",
    details: [
      { k: "Interior", v: "16 elastic-backed loops, set to order" },
      { k: "Leather", v: "Bridle hide, 2.6mm, tan-lined" },
      { k: "Frame", v: "Steel, twin clasp, nickel finish" },
      { k: "Base", v: "5mm bridle, four brass feet" },
      { k: "Dimensions", v: "38 x 22 x 19cm" }
    ],
    care: "Replace perished loops through the atelier; do not glue them.",
    sizes: ["One size"],
    colors: [{ name: "Steel Tan", hex: "#8d8477", palette: "platinum" }, { name: "Noir", hex: "#26282e", palette: "noir" }],
    rating: 4.9, reviews: 22, stock: 0, badges: ["Atelier","Rare"], tags: ["case","instruments","fitted","bespoke"] },

  { id: "aur-407", name: "Parfleche Envelope", cat: "leather", sub: "Small Leather Goods", price: 71300,
    shape: "case", palette: "ivory", year: 2022, edition: "Open series",
    materials: "Untanned bison rawhide, single latigo lace",
    blurb: "Untanned hide, folded while damp and dried flat, with no thread anywhere in it.",
    story: "Rawhide is not tanned. It is fleshed, stretched on a frame and dried hard, and the North American storage cases that used it were folded like an envelope while still wet so the creases set permanently and the case would hold its shape forever after. We make ours the same way at a small rawhide works outside Villars, where the hides dry eleven days on the frame before folding. There is no stitching in the piece: four slits and one lace hold it shut.",
    details: [
      { k: "Hide", v: "Bison rawhide, untanned, 2.4mm" },
      { k: "Construction", v: "Folded damp, no stitching used" },
      { k: "Drying", v: "11 days frame-dried before folding" },
      { k: "Closure", v: "One latigo lace through four slits" },
      { k: "Dimensions", v: "36 x 24cm folded, 410g" }
    ],
    care: "Rawhide softens if it gets wet and hardens again out of shape. Keep it dry.",
    sizes: ["One size"],
    colors: [{ name: "Raw", hex: "#d8cbb0", palette: "ivory" }],
    rating: 4.4, reviews: 58, stock: 11, badges: [], tags: ["case","rawhide","folded","flat"] },

  { id: "aur-408", name: "Fowler Shot Pouch", cat: "leather", sub: "Small Leather Goods", price: 58900,
    shape: "case", palette: "oxblood", year: 2023, edition: "Numbered to 90",
    materials: "Oak-bark tanned cowhide, cast brass charger",
    blurb: "An oval shot pouch with a brass charger that throws one measure and stops.",
    story: "The original was carried in Pennsylvania around 1840 and its brass charger had been filed down by its owner until it threw exactly the load his gun liked, which is why the rim is uneven. We cast ours in the same alloy at a foundry in Vallorbe and leave the final cut to the customer's own measure, anywhere from 20 to 32 grams. The body is blocked wet over a beech form so the oval holds its shape even when the pouch is empty.",
    details: [
      { k: "Leather", v: "Oak-bark tanned cowhide, 3mm" },
      { k: "Charger", v: "Cast brass, filed to order, 20-32g" },
      { k: "Construction", v: "Wet-blocked over a beech form" },
      { k: "Dimensions", v: "17 x 13 x 5cm" },
      { k: "Strap", v: "28mm harness, roller buckle" }
    ],
    care: "Empty and air the pouch after use. Powder residue eats stitching.",
    sizes: ["One size"],
    colors: [{ name: "Oxblood", hex: "#6a2b28", palette: "oxblood" }, { name: "Russet", hex: "#8f5a34", palette: "gold" }],
    rating: 4.5, reviews: 34, stock: 3, badges: ["Numbered"], tags: ["pouch","brass","shooting","blocked"] },

  { id: "aur-409", name: "Lanework Pouch", cat: "leather", sub: "Small Leather Goods", price: 96400,
    shape: "bag", palette: "lapis", year: 2025, edition: "One of 60",
    materials: "Brain-tanned deerskin, Czech glass seed beads, waxed linen",
    blurb: "A rectangular pouch beaded in raised lanes, eleven rows across the face.",
    story: "Lane stitch lays beads in parallel bands that arch slightly above the hide instead of lying flat, which is why work done this way sits proud and catches light along each ridge. Marta Kellenberger beads ours in Appenzell using Czech seed beads in size 13, roughly nine thousand to a face, over about ninety hours. The lanes run vertically, eleven of them, and the two outermost are set a half-bead narrower where the panel turns onto the side.",
    details: [
      { k: "Beads", v: "Czech glass, 13/0, ~9,000 per face" },
      { k: "Technique", v: "Lane stitch, 11 lanes, ~90 hours" },
      { k: "Leather", v: "Brain-tanned deerskin, 1.4mm" },
      { k: "Thread", v: "Waxed linen, sinew-laid" },
      { k: "Dimensions", v: "19 x 14cm" }
    ],
    care: "Never immerse. A dropped bead can be reset; a shrunk hide cannot.",
    sizes: ["One size"],
    colors: [{ name: "Lapis", hex: "#2b4a7d", palette: "lapis" }, { name: "Chalk White", hex: "#e2ded2", palette: "ivory" }, { name: "Oxblood", hex: "#7a2f2a", palette: "oxblood" }],
    rating: 4.8, reviews: 96, stock: 14, badges: ["Atelier"], tags: ["pouch","beadwork","deerskin","handwork"] },

  { id: "aur-410", name: "Chutes Swatch Coffret", cat: "leather", sub: "Small Leather Goods", price: 41200,
    shape: "atelier", palette: "gold", year: 2026, edition: "Annual, 2025 vintage",
    materials: "41 hide swatches, linen-covered bookbinder's board",
    blurb: "Forty-one offcuts from a single year of the atelier's cutting, boxed and labelled.",
    story: "The idea came from a bag of clogmaker's offcuts collected in 1917 by a nurse who thought the scraps were worth keeping, and they now read as a complete record of what one workshop used that year. Ours does the same job deliberately. Every January, Denis Fauchere pulls a piece from each hide the atelier cut in the preceding twelve months, writes the tannery, the tannage and the month on the back, and boxes forty-one of them. The 2025 coffret includes two pieces of a Tuscan pit-tanned shoulder we have not been able to buy since.",
    details: [
      { k: "Contents", v: "41 swatches, 90 x 60mm each" },
      { k: "Record", v: "Tannery, tannage and month on each" },
      { k: "Vintage", v: "Cut from the 2025 atelier year" },
      { k: "Box", v: "Bookbinder's board, linen-covered" },
      { k: "Weight", v: "1.1kg boxed" }
    ],
    care: "Keep the box closed. Sunlight will redden the vegetable-tanned pieces first.",
    sizes: [],
    colors: [{ name: "Assorted", hex: "#a97b45", palette: "gold" }],
    rating: 4.3, reviews: 129, stock: 22, badges: ["New"], tags: ["swatches","offcuts","archive","reference"] },

  { id: "aur-411", name: "Ashfield Gladstone", cat: "leather", sub: "Travel", price: 312700,
    shape: "bag", palette: "oxblood", year: 2020, edition: "Open series",
    materials: "Dark brown bridle hide, forged steel frame, cotton drill lining",
    blurb: "A medium Gladstone with two independent clasps and one central handle.",
    story: "Two clasps rather than one, because a frame bag carried by a single handle twists at the ends and a lone middle catch lets both corners gape. The pair on this bag sit 190mm apart and each turns its own tongue. The frame is forged by Aldo Peruzzi outside Vicenza from a pattern he has cut since 1988, and it is deliberately heavier at the hinge than the English hardware it copies, since the hinge was the first thing to fail on every period bag we opened up.",
    details: [
      { k: "Leather", v: "Dark brown bridle, 3mm" },
      { k: "Frame", v: "Forged steel, two clasps at 190mm" },
      { k: "Handle", v: "Single, rolled and stitched, 26mm" },
      { k: "Dimensions", v: "46 x 28 x 24cm" },
      { k: "Lining", v: "Brown cotton drill" }
    ],
    care: "Oil the hinge annually. Bridle bloom buffs back with a soft cloth.",
    sizes: ["One size"],
    colors: [{ name: "Bark Brown", hex: "#5d3a26", palette: "oxblood" }, { name: "Noir", hex: "#25262b", palette: "noir" }],
    rating: 4.9, reviews: 88, stock: 0, badges: ["Icon","Rare"], tags: ["gladstone","travel","frame","bridle"] },

  { id: "aur-412", name: "Ridgebar Valise", cat: "leather", sub: "Travel", price: 358900,
    shape: "bag", palette: "gold", year: 2022, edition: "Open series",
    materials: "Brown bridle hide, straight steel bar frame, unbleached drill",
    blurb: "The top bar runs dead straight, so the mouth stays square while you pack it.",
    story: "Most frame bags curve across the top and sag into a lens shape the moment they are loaded. This one keeps a straight bar hinged at both ends instead of the centre, which is the entire reason it stands with its mouth open and square on the floor. Peruzzi's shop cuts the bar from a single 8mm section, and the side hinges take the strain in its place. Those hinges are the only part of this bag we replace rather than repair.",
    details: [
      { k: "Leather", v: "Brown bridle, 3.2mm" },
      { k: "Frame", v: "Straight 8mm bar, side-hinged" },
      { k: "Opening", v: "Square mouth, 38 x 21cm" },
      { k: "Dimensions", v: "48 x 30 x 25cm" },
      { k: "Lining", v: "Unbleached cotton drill" }
    ],
    care: "Do not force the bar past its stop. The side hinges set the limit for a reason.",
    sizes: ["One size"],
    colors: [{ name: "Tan", hex: "#a06b3c", palette: "gold" }, { name: "Bark Brown", hex: "#5b3927", palette: "oxblood" }],
    rating: 4.7, reviews: 51, stock: 7, badges: [], tags: ["valise","travel","frame","structured"] },

  { id: "aur-413", name: "Rayure Valise", cat: "leather", sub: "Travel", price: 397500,
    shape: "bag", palette: "noir", year: 2024, edition: "Numbered to 75",
    materials: "Black calf, roller-embossed rib, brown cotton lining",
    blurb: "Black calf run under an engraved roller, so the stripe is pressed into the grain rather than printed on it.",
    story: "The stripe is not ink. The hide passes under an engraved brass roller at ninety degrees and takes a permanent rib at 3mm intervals, which is the finish the Rotterdam bag we copied had still been holding after a century in a museum store. Gerd Vollmer runs the roller in Offenbach and will not do black hides after midday, because the plate reads differently once the room has warmed. We kept the brown cotton lining against the black, exactly as the original had it.",
    details: [
      { k: "Leather", v: "Black calf, ribbed at 3mm intervals" },
      { k: "Embossing", v: "Engraved brass roller, 90C" },
      { k: "Frame", v: "Steel, single central clasp" },
      { k: "Dimensions", v: "44 x 27 x 23cm" },
      { k: "Lining", v: "Brown cotton drill" }
    ],
    care: "Cream sparingly. Heavy wax fills the rib and flattens the stripe.",
    sizes: ["One size"],
    colors: [{ name: "Noir", hex: "#1f2024", palette: "noir" }],
    rating: 4.8, reviews: 37, stock: 1, badges: ["Last Pieces","Numbered"], tags: ["valise","embossed","stripe","travel"] },

  { id: "aur-414", name: "Sauria Grand Valise", cat: "leather", sub: "Travel", price: 486300,
    shape: "bag", palette: "obsidian", year: 2023, edition: "One of 25",
    materials: "Lizard-grain embossed calf, full calf lining, steel frame",
    blurb: "The largest frame bag we make, lizard-grained on both faces, carried by two handles.",
    story: "Not lizard, but calf blocked against a lizard-grain plate so the scale pattern is pressed into the hide instead of taken off an animal. We settled on that after studying the Rotterdam original, which is also a print, and after our lining supplier pointed out that a bag this size in genuine exotic would swallow four skins. Two handles rather than one because loaded it goes past nine kilos, and a single handle at that weight pulls the frame out of the leather within about a decade.",
    details: [
      { k: "Leather", v: "Calf, lizard-grain embossed, 3.4mm" },
      { k: "Handles", v: "Two, rolled, 320mm centres" },
      { k: "Lining", v: "Full brown calf, edges turned" },
      { k: "Dimensions", v: "58 x 36 x 30cm" },
      { k: "Weight", v: "4.2kg empty" }
    ],
    care: "Clean along the grain, not across it. Cream collects in the scale edges.",
    sizes: ["One size"],
    colors: [{ name: "Umber", hex: "#4a3a2c", palette: "obsidian" }, { name: "Tobacco", hex: "#7c5433", palette: "gold" }],
    rating: 5, reviews: 19, stock: 0, badges: ["Rare"], tags: ["valise","large","embossed","travel"] },

  { id: "aur-415", name: "Himeji Kinchaku Pouch", cat: "leather", sub: "Small Leather Goods", price: 63700,
    shape: "bag", palette: "jade", year: 2025, edition: "Open series",
    materials: "White-tanned deerskin, 16-strand kumihimo silk cord",
    blurb: "A drawstring pouch in white-tanned deerskin, gathered on eight unreinforced eyelets.",
    story: "The shape is taken from a leather pouch drawn in the autumn plate of a set of four Japanese koban woodblock prints, the third of the series, where the bag is shown pulled tight at the neck. The leather is shiro-nameshi, the Himeji white tannage worked with river water and rapeseed oil and no bark at all, still made by the Nakagawa family who are among the last doing it. Left untreated it comes out almost white; the cord is a jade silk kumihimo braid of sixteen strands.",
    details: [
      { k: "Leather", v: "Deerskin, shiro-nameshi white tannage" },
      { k: "Tannage", v: "River-soaked, rapeseed oil, no bark" },
      { k: "Cord", v: "16-strand kumihimo silk, jade" },
      { k: "Eyelets", v: "Eight, hand-punched, unreinforced" },
      { k: "Dimensions", v: "16 x 21cm gathered" }
    ],
    care: "White-tanned hide yellows with handling. That is the tannage, not a fault.",
    sizes: ["One size"],
    colors: [{ name: "Jade Cord", hex: "#5f8a72", palette: "jade" }, { name: "Undyed", hex: "#e6dfd0", palette: "ivory" }],
    rating: 4.6, reviews: 143, stock: 18, badges: ["New"], tags: ["pouch","drawstring","deerskin","japan"] },

  { id: "aur-416", name: "Bianhu Flask", cat: "leather", sub: "Travel", price: 87600,
    shape: "flacon", palette: "platinum", year: 2021, edition: "Numbered to 150",
    materials: "Wet-moulded calf over a blown glass liner, brass cap",
    blurb: "A flat travelling flask, stitched over glass, in the form the Tang potters were copying.",
    story: "The Tang kilns made white porcelain flasks in the shape of a nomad's leather bottle, false seam ridge and all, which means the leather came first and the porcelain is the imitation. We have run it back the other way. The glass liner is blown at Vallorbe to the profile of the flask held in Xi'an, the calf is wet-moulded onto it, and the two halves are stitched along the ridge exactly where the potters pressed their seam that never held anything together.",
    details: [
      { k: "Body", v: "Wet-moulded calf over blown glass" },
      { k: "Capacity", v: "480ml" },
      { k: "Seam", v: "Raised centre ridge, saddle-stitched 8 spi" },
      { k: "Closure", v: "Cork and brass screw cap" },
      { k: "Dimensions", v: "22 x 17 x 6cm" }
    ],
    care: "Rinse the liner only. Do not soak the leather to clean the inside.",
    sizes: [],
    colors: [{ name: "Bone", hex: "#cfc9bb", palette: "platinum" }, { name: "Tobacco", hex: "#7b5433", palette: "gold" }],
    rating: 4.4, reviews: 67, stock: 9, badges: ["Numbered"], tags: ["flask","travel","moulded","glass"] },

  { id: "aur-417", name: "Ordos Saddle Bag", cat: "leather", sub: "Travel", price: 274900,
    shape: "bag", palette: "gold", year: 2020, edition: "One of 45",
    materials: "Oil-finished harness cowhide, forged brass fittings",
    blurb: "Paired panniers on a single yoke, cut unequally so the load clears the rider's knee.",
    story: "The Qing pattern hangs two pockets from one yoke that lies across the cantle, and the pockets are not the same: the near-side one is forty millimetres shallower so it stays behind the leg. We kept that asymmetry, which reads as a mistake on a table and stops reading as one the moment you sit in a saddle. The tooling is done by Batu Erdene in Hohhot, four roundels a side, struck with a punch rather than cut with a swivel knife.",
    details: [
      { k: "Leather", v: "Harness cowhide, 3.5mm, oil-finished" },
      { k: "Construction", v: "Single yoke, unequal panniers" },
      { k: "Tooling", v: "Four struck roundels per side" },
      { k: "Fittings", v: "Hand-forged brass girth billets" },
      { k: "Dimensions", v: "54 x 34cm across the yoke" }
    ],
    care: "Re-oil after rain. Harness leather stiffens if it dries out under load.",
    sizes: ["One size"],
    colors: [{ name: "Saddle Tan", hex: "#a4703c", palette: "gold" }, { name: "Oxblood", hex: "#6b2f2a", palette: "oxblood" }],
    rating: 4.7, reviews: 26, stock: 2, badges: ["Last Pieces"], tags: ["saddle","panniers","tooled","travel"] },

  { id: "aur-418", name: "Quadrant Shoulder Bag", cat: "leather", sub: "Bags", price: 168200,
    shape: "bag", palette: "oxblood", year: 2026, edition: "Open series",
    materials: "Red watersnake body, plain calf flap and strap, brass and sterling plates",
    blurb: "Four metal triangles, two brass and two silver, close into one diamond on the flap.",
    story: "The badge is the whole bag. Four triangles are set point to point so they read as a single diamond across a room and as four separate plates in the hand, two in polished brass and two in sterling. The tolerance is unforgiving because a quarter of a millimetre out at any corner opens a visible line down the middle, so Renata Sollberger sets them in one sitting or not at all. The body is red-dyed watersnake; the flap and strap are plain calf, since snake abrades wherever it folds.",
    details: [
      { k: "Body", v: "Watersnake, aniline red, scales hand-set" },
      { k: "Flap and strap", v: "Plain calf, 2mm" },
      { k: "Badge", v: "Two brass and two sterling triangles" },
      { k: "Strap drop", v: "Adjustable 46-58cm" },
      { k: "Dimensions", v: "26 x 17 x 7cm" }
    ],
    care: "Brush scales towards the tail. Lifting them the other way tears the edges.",
    sizes: ["One size"],
    colors: [{ name: "Oxblood", hex: "#7d2b2e", palette: "oxblood" }, { name: "Noir", hex: "#26272c", palette: "noir" }],
    rating: 4.2, reviews: 204, stock: 26, badges: ["New"], tags: ["bag","shoulder","snakeskin","hardware"] },

  { id: "aur-419", name: "Liao Crescent Bag", cat: "leather", sub: "Bags", price: 231400,
    shape: "bag", palette: "obsidian", year: 2024, edition: "Numbered to 110",
    materials: "Alum-tanned goat, bone toggle, riveted D-rings",
    blurb: "A crescent-topped pouch seamed along the curve, the way the Khitan riders cut them.",
    story: "Khitan bags of the Liao period run their seam over the top curve instead of down the sides, which puts the strongest line exactly where a bag hanging off a saddle takes the most flex. We copied the geometry from the example in Ulaanbaatar and it rewrote the pattern: two pieces instead of four, and no base seam left to wear through against a horse's flank. The curve is 220mm of saddle stitch and it is the only structural seam in the piece.",
    details: [
      { k: "Leather", v: "Goat, alum-tanned, 2.2mm" },
      { k: "Construction", v: "Two panels, one 220mm curved seam" },
      { k: "Closure", v: "Bone toggle and leather loop" },
      { k: "Suspension", v: "Two riveted D-rings" },
      { k: "Dimensions", v: "28 x 22 x 8cm" }
    ],
    care: "Alum tannage is water-soluble. Do not wash it.",
    sizes: ["One size"],
    colors: [{ name: "Smoke", hex: "#4c4741", palette: "obsidian" }, { name: "Undyed", hex: "#ddd3c0", palette: "ivory" }],
    rating: 4.5, reviews: 62, stock: 5, badges: ["Numbered"], tags: ["bag","crescent","nomad","goat"] },

  { id: "aur-420", name: "Pinang Canteen", cat: "leather", sub: "Travel", price: 119800,
    shape: "case", palette: "ivory", year: 2019, edition: "One of 30",
    materials: "Undyed alum-tanned hide, glass liner, riveted top loop",
    blurb: "A leather canteen with the stitched shoulder ridge and top loop the Tang potters glazed white.",
    story: "The Henan pot copies a leather water bag so closely that you can still count the stitches the potter pressed into the wet clay: a ridge over the shoulder, a loop at the top, a pinched neck below it. We built the leather version back out of the pot. The body is moulded in two halves over a plaster form taken from measured photographs of the original, then finished in alum-tanned hide left undyed, which dries to roughly the same white the glaze was chasing.",
    details: [
      { k: "Body", v: "Alum-tanned hide, undyed, moulded in halves" },
      { k: "Capacity", v: "900ml, glass-lined" },
      { k: "Ridge", v: "Shoulder seam, welted, 6 spi" },
      { k: "Loop", v: "Single top loop, riveted through" },
      { k: "Dimensions", v: "24 x 19 x 9cm" }
    ],
    care: "Undyed hide takes a mark from everything. Most owners let it.",
    sizes: [],
    colors: [{ name: "Undyed", hex: "#e4dccb", palette: "ivory" }],
    rating: 4.3, reviews: 15, stock: 12, badges: ["Rare"], tags: ["canteen","moulded","undyed","travel"] },

  /* ---- OBJETS ---- */
  { id: "aur-504", name: "Lancier Table Clock", cat: "objets", sub: "Table", price: 328400,
    shape: "watch", palette: "platinum", year: 2022, edition: "One of 40",
    materials: "Cast and chased sterling silver, eight-day movement",
    blurb: "Two lancers stand either side of a silvered dial on a stepped sterling base.",
    story: "Modelled from a St Petersburg cabinet clock of 1872 by Ilya Reshetov in our Carouge silver shop, who spent eleven weeks on the two riders alone. The near lancer carries a chased wire rein, soldered in after the casting rather than modelled with it, which is why his hand closes properly around it.",
    details: [
      { k: "Metal", v: "Sterling silver, 3.9kg" },
      { k: "Figures", v: "Two lancers, cast and hand-chased" },
      { k: "Movement", v: "Eight-day, twin barrel, 11 jewels" },
      { k: "Dial", v: "Silvered brass, Roman chapter ring" },
      { k: "Height", v: "34cm to the finial" }
    ],
    care: "Wind on the same day each week. Polish with a dry silver cloth only.",
    sizes: [],
    colors: [{ name: "Silver", hex: "#c9ccd1", palette: "platinum" }],
    rating: 4.9, reviews: 27, stock: 2, badges: ["Rare","Numbered"], tags: ["clock","silver","table","figural"] },

  { id: "aur-505", name: "Beffroi Table Clock", cat: "objets", sub: "Table", price: 297400,
    shape: "watch", palette: "gold", year: 2021, edition: "Numbered to 60",
    materials: "Gilt bronze, champleve enamel, lapis columns",
    blurb: "A Renaissance tower reduced to forty centimetres, with the dial set into its second storey.",
    story: "Drawn from a tower clock shown in Paris in 1867 and rebuilt to our own proportions by Sylvie Charpentier, who cut the four corner columns from one lapis block so the veining runs continuously around the case. The spire unscrews for access to the movement; there is no other way into the case.",
    details: [
      { k: "Case", v: "Gilt bronze, hand-chased" },
      { k: "Columns", v: "Lapis lazuli, four, one block" },
      { k: "Enamel", v: "Champleve, six panels" },
      { k: "Movement", v: "Eight-day, half-hour strike" },
      { k: "Height", v: "41cm" }
    ],
    care: "Do not immerse. Clean the enamel with a barely damp cloth.",
    sizes: [],
    colors: [{ name: "Gilt", hex: "#b08d4f", palette: "gold" }, { name: "Lapis", hex: "#26417a", palette: "lapis" }],
    rating: 4.8, reviews: 14, stock: 0, badges: ["Numbered","Rare"], tags: ["clock","gilt","lapis","table"] },

  { id: "aur-506", name: "Leiden Reading Stand", cat: "objets", sub: "Desk", price: 142600,
    shape: "atelier", palette: "obsidian", year: 2023, edition: "Open series",
    materials: "Quartersawn European oak, blackened steel ratchet",
    blurb: "An oak book rest with a five-stop ratchet, cut low enough to read from a seated desk.",
    story: "The angle was set against the painting it is named for, in which the scholar leans over a folio at roughly nineteen degrees. Made by Jonas Brechbuhl in Bienne from oak air-dried nine years, with the ratchet teeth filed rather than milled so the stops fall without a sound.",
    details: [
      { k: "Timber", v: "Quartersawn oak, air-dried nine years" },
      { k: "Hardware", v: "Blackened steel ratchet, five stops" },
      { k: "Angle range", v: "15 to 55 degrees" },
      { k: "Board", v: "38 x 27cm" },
      { k: "Weight", v: "2.1kg" }
    ],
    care: "Wax twice a year. Keep clear of radiators.",
    sizes: ["Quarto","Folio"],
    colors: [{ name: "Smoked Oak", hex: "#3a332b", palette: "obsidian" }, { name: "Natural Oak", hex: "#b39a72", palette: "ivory" }],
    rating: 4.6, reviews: 63, stock: 11, badges: ["Atelier"], tags: ["stand","oak","reading","desk"] },

  { id: "aur-507", name: "Varenne Paperweight", cat: "objets", sub: "Desk", price: 38900,
    shape: "atelier", palette: "noir", year: 2024, edition: "Numbered to 200",
    materials: "Sand-cast bronze, 1.6kg, waxed black patina",
    blurb: "A door rosette from the Faubourg Saint-Germain, cast solid and weighted to hold a folio open.",
    story: "Cast from a squeeze taken of the ironwork at 57 Rue de Varenne, the courtyard Atget photographed for the Bibliotheque before the war. We leave the mould seam unground on the underside, which is the only way to tell one of our casts from the door it came off.",
    details: [
      { k: "Metal", v: "Sand-cast bronze, 1.6kg" },
      { k: "Finish", v: "Waxed black patina" },
      { k: "Diameter", v: "9.4cm" },
      { k: "Base", v: "Baize-lined, hand-cut" },
      { k: "Pattern", v: "Taken from a 1704 door rosette" }
    ],
    care: "Rewax once a year. Fingerprints lift with a dry cloth.",
    sizes: [],
    colors: [{ name: "Black Patina", hex: "#22201d", palette: "noir" }],
    rating: 4.7, reviews: 96, stock: 24, badges: [], tags: ["paperweight","bronze","desk","cast"] },

  { id: "aur-508", name: "Bracteate Page Marker", cat: "objets", sub: "Desk", price: 26450,
    shape: "pendant", palette: "gold", year: 2025, edition: "Numbered to 120",
    materials: "Silver-gilt bracteate foil, 0.4mm, on a woven silk cord",
    blurb: "A struck silver-gilt leaf on a silk cord, thin enough to close a book on.",
    story: "Struck the way the pilgrim badges were: one foil pressed over a steel die, so the image stands proud on the front face and hollow on the back. Margit Falk cut our die in Basel from a fragment recorded in Norfolk, and because only a single corner of that fragment survives, three of the four borders are her reconstruction.",
    details: [
      { k: "Metal", v: "Sterling silver, gilt, 0.4mm foil" },
      { k: "Weight", v: "3.1g" },
      { k: "Plate", v: "52 x 24mm" },
      { k: "Cord", v: "Woven silk, 34cm" },
      { k: "Method", v: "Struck over a single steel die" }
    ],
    care: "The gilding is thin. Blot rather than rub.",
    sizes: [],
    colors: [{ name: "Gilt", hex: "#c2a15c", palette: "gold" }, { name: "Oxblood Cord", hex: "#6a2027", palette: "oxblood" }],
    rating: 4.5, reviews: 41, stock: 0, badges: ["Numbered"], tags: ["bookmark","silver","gilt","struck"] },

  { id: "aur-509", name: "Eads Three-Well Tray", cat: "objets", sub: "Desk", price: 88300,
    shape: "atelier", palette: "platinum", year: 2022, edition: "Numbered to 150",
    materials: "Die-struck silver plate over nickel, baize base",
    blurb: "Three wells for clips, stamps and keys, with a bridge struck in relief along the long side.",
    story: "The relief panels come from dies cut after a 1904 souvenir tray sold at the fair in St Louis: a station at one end, a garden at the other, and the Eads Bridge running the length between them. Struck at four tonnes in Solothurn, then planished by hand at the third well, where the die always leaves a ridge.",
    details: [
      { k: "Body", v: "Nickel silver, plated 30 microns" },
      { k: "Wells", v: "Three, 6 x 4cm each" },
      { k: "Relief", v: "Die-struck, three panels" },
      { k: "Base", v: "Green baize, hand-cut" },
      { k: "Dimensions", v: "24 x 9 x 3cm" }
    ],
    care: "The plate is 30 microns. Wipe, never scour.",
    sizes: [],
    colors: [{ name: "Silver Plate", hex: "#cfd2d6", palette: "platinum" }],
    rating: 4.4, reviews: 118, stock: 7, badges: ["Numbered"], tags: ["tray","desk","silver","organiser"] },

  { id: "aur-510", name: "Kauri Dressing Case", cat: "objets", sub: "Cases", price: 214700,
    shape: "case", palette: "oxblood", year: 2020, edition: "One of 40",
    materials: "Kauri veneer, paua inlay, silk velvet, six silver-topped jars",
    blurb: "A veneered case that opens to six silver-topped jars set in red velvet.",
    story: "Built around six jars turned by Anneke Voss, whose silver tops are threaded one at a time so each returns only to the jar it was cut for. The lid inlay is New Zealand paua rather than the usual pearl, which is why it reads green in raking light and grey straight on.",
    details: [
      { k: "Veneer", v: "Kauri, quartered, 0.9mm" },
      { k: "Inlay", v: "Paua shell, hand-cut" },
      { k: "Lining", v: "Silk velvet, oxblood" },
      { k: "Fittings", v: "Six jars, sterling tops, threaded to match" },
      { k: "Dimensions", v: "31 x 22 x 14cm" }
    ],
    care: "Keep out of direct sun; the veneer lightens. The lining cannot be washed.",
    sizes: ["Six-jar","Nine-jar"],
    colors: [{ name: "Oxblood Velvet", hex: "#5e1f26", palette: "oxblood" }, { name: "Ivory Velvet", hex: "#e3dccb", palette: "ivory" }],
    rating: 4.9, reviews: 22, stock: 3, badges: ["Rare","Last Pieces"], tags: ["case","veneer","dressing","silver"] },

  { id: "aur-511", name: "Skiver Desk Blotter", cat: "objets", sub: "Desk", price: 47800,
    shape: "atelier", palette: "jade", year: 2023, edition: "Open series",
    materials: "Vegetable-tanned skiver, blotting refills, brass corners",
    blurb: "A skived hide pad with four brass corners and twenty sheets of blotting stock beneath.",
    story: "Skiver is the split outer face of a sheepskin, thin enough to lie flat on a desk and still take gilt. Ours is tanned in Millau and tooled with one fillet line drawn in a single pass by Renaud Costes; where he lifts the wheel at the fourth corner the line stops two millimetres short, and we leave it stopped.",
    details: [
      { k: "Leather", v: "Sheep skiver, vegetable-tanned" },
      { k: "Tooling", v: "Single gilt fillet, hand-drawn" },
      { k: "Corners", v: "Solid brass, four" },
      { k: "Refill", v: "Twenty sheets, 100gsm blotting" },
      { k: "Dimensions", v: "60 x 40cm" }
    ],
    care: "Replace the blotting stock when it stops taking ink. Keep the leather dry.",
    sizes: ["50 x 35cm","60 x 40cm","75 x 50cm"],
    colors: [{ name: "Bottle Green", hex: "#1f3d33", palette: "jade" }, { name: "Noir", hex: "#211f1e", palette: "noir" }],
    rating: 4.6, reviews: 154, stock: 31, badges: [], tags: ["blotter","leather","desk","brass"] },

  { id: "aur-512", name: "Repertoire Card Index", cat: "objets", sub: "Cases", price: 63250,
    shape: "case", palette: "ivory", year: 2021, edition: "Open series",
    materials: "Sycamore carcass, ebonised runners, 400 pressed cards",
    blurb: "A sliding tray of four hundred cards behind a lid that stays open on its own.",
    story: "A lead strip in the rear rail counterweights the lid, so it holds at any angle without a stay to catch a sleeve. Cut in sycamore by the Rieder shop in Brienz, whose cabinetmakers pencil the same number on the drawer and the carcass underside; the two are planed to each other and will not swap between boxes.",
    details: [
      { k: "Carcass", v: "Sycamore, dovetailed" },
      { k: "Runners", v: "Ebonised beech, waxed" },
      { k: "Capacity", v: "400 cards, 125 x 75mm" },
      { k: "Lid", v: "Lead-counterweighted, no stay" },
      { k: "Dimensions", v: "28 x 16 x 13cm" }
    ],
    care: "Wax the runners yearly. Do not force the drawer in humid weather.",
    sizes: ["400 card","800 card"],
    colors: [{ name: "Sycamore", hex: "#d9cdb4", palette: "ivory" }, { name: "Ebonised", hex: "#241f1d", palette: "obsidian" }],
    rating: 4.5, reviews: 77, stock: 18, badges: ["Atelier"], tags: ["index","cards","sycamore","desk"] },

  { id: "aur-513", name: "Quire Day Book", cat: "objets", sub: "Desk", price: 34600,
    shape: "atelier", palette: "noir", year: 2024, edition: "Open series",
    materials: "Sewn on cords, 192 pages, laid paper, calf spine",
    blurb: "Eight quires sewn on cords, so the book lies flat at any opening.",
    story: "Beatrix Amrein sews these in Lucerne on four linen cords and laces the cord ends into the boards rather than gluing them down, which is the reason the book will stay open at page one. The stock is a laid paper that takes fountain ink without feathering and refuses to take ballpoint cleanly at all.",
    details: [
      { k: "Binding", v: "Sewn on four linen cords, laced-in" },
      { k: "Pages", v: "192, laid, 120gsm" },
      { k: "Spine", v: "Calf, hand-pared" },
      { k: "Ruling", v: "Feint, 7mm, unpunched" },
      { k: "Format", v: "210 x 148mm" }
    ],
    care: "Do not crack the spine. It opens flat without force.",
    sizes: ["A5","A4"],
    colors: [{ name: "Noir Calf", hex: "#1c1a19", palette: "noir" }, { name: "Oxblood Calf", hex: "#5b2026", palette: "oxblood" }],
    rating: 4.7, reviews: 203, stock: 9, badges: [], tags: ["daybook","binding","paper","desk"] },

  { id: "aur-514", name: "Encrier No.4", cat: "objets", sub: "Desk", price: 71400,
    shape: "atelier", palette: "obsidian", year: 2019, edition: "Numbered to 300",
    materials: "Cast glass well, gunmetal collar, slate base",
    blurb: "A cast-glass well in a gunmetal collar, sunk into slate so it cannot be knocked over.",
    story: "The well holds 60ml but is cut to be filled to 40, the level at which the internal shoulder stops a nib picking up more ink than it can carry to the page. The slate is sawn wet from Ballachulish quarry spoil and left rough on the underside, where it meets the desk and nobody looks.",
    details: [
      { k: "Well", v: "Cast glass, 60ml, 40ml fill line" },
      { k: "Collar", v: "Gunmetal, machined" },
      { k: "Base", v: "Ballachulish slate, 1.8kg" },
      { k: "Aperture", v: "24mm" },
      { k: "Dimensions", v: "12 x 12 x 7cm" }
    ],
    care: "Flush with cold water. Never let ink dry in the well.",
    sizes: [],
    colors: [{ name: "Slate", hex: "#33383c", palette: "obsidian" }],
    rating: 4.4, reviews: 58, stock: 26, badges: ["Numbered"], tags: ["inkwell","glass","slate","desk"] },

  { id: "aur-515", name: "Bicolore Ribbon Tins", cat: "objets", sub: "Desk", price: 19800,
    shape: "case", palette: "rose", year: 2025, edition: "Numbered to 250",
    materials: "Lithographed tinplate, pair, with two inked cotton ribbons",
    blurb: "A pair of shallow tins holding black-and-red cotton ribbon on 13mm spools.",
    story: "Printed in four passes on a Mailander press in Lugano, the fourth pass being the red that shows only on the lower band of the lid. The spool inside is 13mm, the width a pre-war portable takes, which is why the tin is shallower than the size of the lid suggests.",
    details: [
      { k: "Tin", v: "Lithographed tinplate, four-pass" },
      { k: "Contents", v: "Two ribbons, cotton, black and red" },
      { k: "Spool", v: "13mm, universal core" },
      { k: "Ink", v: "Cotton-inked, non-drying" },
      { k: "Tin diameter", v: "62mm" }
    ],
    care: "Keep the lid on. An unhoused ribbon dries inside a fortnight.",
    sizes: [],
    colors: [{ name: "Rose Litho", hex: "#c98a86", palette: "rose" }, { name: "Noir Litho", hex: "#242021", palette: "noir" }],
    rating: 4.3, reviews: 88, stock: 40, badges: ["New"], tags: ["ribbon","tin","typewriter","desk"] },

  { id: "aur-516", name: "Copyist Stand", cat: "objets", sub: "Desk", price: 52300,
    shape: "atelier", palette: "platinum", year: 2023, edition: "Open series",
    materials: "Nickel-plated brass, sprung steel clip, lead-filled foot",
    blurb: "A weighted copy holder that stands a page upright at typing height beside the machine.",
    story: "The foot carries 900g of lead so the stand does not walk across the desk when a sheet is torn out of the clip. Plated in Le Locle over polished brass, with the underside of the foot left bare so the weight can be drilled out and re-poured rather than replaced.",
    details: [
      { k: "Column", v: "Nickel-plated brass, 34cm" },
      { k: "Foot", v: "Lead-filled, 900g" },
      { k: "Clip", v: "Sprung steel, 90mm jaw" },
      { k: "Adjustment", v: "Tilt 0 to 40 degrees, friction" },
      { k: "Capacity", v: "30 sheets" }
    ],
    care: "Polish the nickel with a dry cloth. The clip spring is not adjustable.",
    sizes: [],
    colors: [{ name: "Nickel", hex: "#c6c8cb", palette: "platinum" }],
    rating: 4.2, reviews: 47, stock: 22, badges: [], tags: ["stand","nickel","copy","desk"] },

  { id: "aur-517", name: "Soliflore Vase", cat: "objets", sub: "Table", price: 41750,
    shape: "flacon", palette: "jade", year: 2022, edition: "Open series",
    materials: "Hand-blown glass, 19cm, wheel-ground foot",
    blurb: "A single-stem vase with a neck narrow enough to hold one stem upright unsupported.",
    story: "Blown off-hand in Vallauris by Pilar Mestre, who pulls the neck to 11mm: wide enough for a garden rose, too narrow for the thick stem of a florist one. The foot is ground flat on a wet wheel and left unpolished, so it grips a waxed desk instead of sliding on it.",
    details: [
      { k: "Glass", v: "Hand-blown, lead-free" },
      { k: "Height", v: "19cm" },
      { k: "Neck", v: "11mm internal" },
      { k: "Capacity", v: "90ml" },
      { k: "Foot", v: "Wheel-ground, unpolished" }
    ],
    care: "Hand wash. The neck takes a pipe cleaner, not a brush.",
    sizes: ["19cm","26cm"],
    colors: [{ name: "Jade", hex: "#4f7d6c", palette: "jade" }, { name: "Clear", hex: "#dfe6e5", palette: "ivory" }],
    rating: 4.6, reviews: 131, stock: 34, badges: [], tags: ["vase","glass","blown","table"] },

  { id: "aur-518", name: "Kingwood Letter Rack", cat: "objets", sub: "Desk", price: 118600,
    shape: "atelier", palette: "oxblood", year: 2020, edition: "One of 40",
    materials: "Kingwood and boxwood marquetry, four divisions, brass feet",
    blurb: "Four graduated divisions in kingwood, the fronts laid in a quartered pattern.",
    story: "The four fronts are sawn as one packet and opened like a book, so the figure mirrors across the front pair and again across the pair behind. Emil Tanner lays them over a pine ground in Vevey with hide glue and a hot hammer, which is why a blistered panel can be softened and pressed back down rather than cut out.",
    details: [
      { k: "Veneer", v: "Kingwood, book-matched, 1.2mm" },
      { k: "Stringing", v: "Boxwood, hand-cut" },
      { k: "Divisions", v: "Four, graduated 6 to 14cm" },
      { k: "Adhesive", v: "Hide glue, hammer-laid" },
      { k: "Dimensions", v: "26 x 12 x 15cm" }
    ],
    care: "Hide glue softens in heat. Keep away from a radiator.",
    sizes: [],
    colors: [{ name: "Kingwood", hex: "#6b3a2c", palette: "oxblood" }],
    rating: 4.8, reviews: 19, stock: 1, badges: ["Rare","Last Pieces"], tags: ["rack","marquetry","kingwood","desk"] },

  { id: "aur-519", name: "Horn Coupe-Papier", cat: "objets", sub: "Desk", price: 27350,
    shape: "atelier", palette: "ivory", year: 2026, edition: "Numbered to 180",
    materials: "Pressed ox horn handle, hardened steel blade",
    blurb: "A steel paper knife with a pressed horn handle, ground on one side only.",
    story: "Ground with a single bevel so the blade runs along the fold and lifts the flap instead of cutting through what is inside. Roland Zumbach presses the horn flat over four days in Fribourg at a heat low enough to keep its translucency, so no two handles carry the same grain of grey.",
    details: [
      { k: "Blade", v: "Hardened steel, single bevel, 15cm" },
      { k: "Handle", v: "Pressed ox horn, 9cm" },
      { k: "Weight", v: "74g" },
      { k: "Balance", v: "At the bolster" },
      { k: "Overall length", v: "24cm" }
    ],
    care: "Horn dislikes water and dry heat. Oil lightly once a year.",
    sizes: [],
    colors: [{ name: "Pale Horn", hex: "#ddd3bd", palette: "ivory" }, { name: "Dark Horn", hex: "#3b332c", palette: "obsidian" }],
    rating: 4.5, reviews: 66, stock: 27, badges: ["New","Numbered"], tags: ["knife","horn","steel","desk"] },

  { id: "aur-520", name: "Chevalet Watch Stand", cat: "objets", sub: "Cases", price: 96400,
    shape: "watch", palette: "obsidian", year: 2024, edition: "Numbered to 120",
    materials: "Blackened brass easel, calf-lined cradle, lampworked dome",
    blurb: "A cradle that holds one watch upright overnight, under a dome that keeps the dust off.",
    story: "The cradle is cut to a 20mm lug width and lined in calf shaved to 0.8mm, thin enough that a bracelet closes around it rather than resting open on top. Marta Ilves lampworks the dome in Tallinn and grinds each rim to its own base plate, so a dome borrowed from another stand will rock.",
    details: [
      { k: "Frame", v: "Blackened brass, 480g" },
      { k: "Cradle", v: "Calf-lined, 20mm lug width" },
      { k: "Dome", v: "Lampworked glass, ground to its base" },
      { k: "Base", v: "Slate-grey baize, weighted" },
      { k: "Height", v: "15cm with the dome" }
    ],
    care: "Lift the dome straight up. Do not slide it across the base.",
    sizes: [],
    colors: [{ name: "Blackened Brass", hex: "#2b2825", palette: "obsidian" }],
    rating: 4.7, reviews: 34, stock: 3, badges: ["Last Pieces"], tags: ["watch","stand","brass","case"] },

  /* ---- SILK ---- */
  { id: "aur-603", name: "Elytra Zardozi", cat: "silk", sub: "Scarves", price: 128400,
    shape: "scarf", palette: "gold", year: 2023, edition: "One of 40",
    materials: "Cotton-backed mulberry silk, flat silver badla, gold thread, jewel-beetle elytra",
    blurb: "Flat silver wire and beetle-wing cases laid on cotton-backed silk, in the Delhi manner.",
    story: "The elytra are gathered after the season from jewel beetles that die in the orchards north of the city, and Nasreen Qureshi's workshop drills each one twice on a hand bow-drill before couching it down beside the flattened badla. About nine hundred go into a single scarf. The green they throw is structural rather than dyed, so it will still be that green when the silver has gone grey.",
    details: [
      { k: "Ground", v: "Cotton-backed mulberry silk, 14 momme" },
      { k: "Metal", v: "Flat silver badla wire, 3mm" },
      { k: "Applied", v: "Approx. 900 beetle elytra, drilled and couched" },
      { k: "Size", v: "180 x 45cm" },
      { k: "Hem", v: "Hand-rolled, 11 stitches per cm" }
    ],
    care: "Never dry clean; solvent lifts the elytra. Surface clean only, and store rolled on the tube supplied.",
    sizes: ["180 x 45cm"],
    colors: [{ name: "Vieil Or", hex: "#b8912f", palette: "gold" }, { name: "Vert Elytre", hex: "#2f6b4f", palette: "jade" }],
    rating: 4.9, reviews: 41, stock: 3, badges: ["Rare","Numbered"], tags: ["zardozi","silver","beetle","delhi","scarf"] },

  { id: "aur-604", name: "Coimbra Manta", cat: "silk", sub: "Shawls", price: 88600,
    shape: "scarf", palette: "oxblood", year: 2021, edition: "Numbered to 120",
    materials: "Compound tabby of reeled silk and hand-spun linen, 150 x 150cm",
    blurb: "A woven Iberian cover, square and heavy, that falls as readily over a shoulder as over a chair back.",
    story: "The structure was read off a seventeenth-century Iberian cover that Duarte Pinho could only decipher by unpicking two centimetres of the original selvedge under a loupe. It is a compound tabby on two warps, one silk and one linen, which is why the corners hang with weight and the cloth stays on a shoulder without a pin. Woven at Beiriz at forty-eight picks a minute, six days to a piece.",
    details: [
      { k: "Structure", v: "Compound tabby, silk and linen warps" },
      { k: "Silk", v: "22 momme, undyed reeled filament" },
      { k: "Loom", v: "Dobby at Beiriz, 48 picks per minute" },
      { k: "Size", v: "150 x 150cm" },
      { k: "Edge", v: "Woven selvedge, knotted linen fringe" }
    ],
    care: "Dry clean. The linen warp softens with wear and the drape improves for it.",
    sizes: ["150 x 150cm"],
    colors: [{ name: "Sang de Boeuf", hex: "#7a2b2b", palette: "oxblood" }, { name: "Lin Ecru", hex: "#d9cfba", palette: "ivory" }],
    rating: 4.6, reviews: 58, stock: 12, badges: ["Numbered"], tags: ["woven","shawl","linen","iberian"] },

  { id: "aur-605", name: "Blonda Almagro", cat: "silk", sub: "Shawls", price: 132500,
    shape: "scarf", palette: "noir", year: 2022, edition: "One of 40",
    materials: "Silk bobbin lace, worked on the pillow in one continuous ground",
    blurb: "Silk bobbin lace worked as one continuous ground, without a join anywhere in it.",
    story: "Almagro has made blonda on the pillow since the eighteenth century and there are now fewer than thirty women in La Mancha who can set the full pattern. Pilar Ontiveros works this one on a churro pillow with 640 bobbins, laying the point d'esprit ground and filling the flowers in the same pass, which is why there is no seam to find. She works mornings only: silk picks up oil from a warm hand.",
    details: [
      { k: "Technique", v: "Bobbin lace, blonda de Almagro" },
      { k: "Bobbins", v: "640, on a churro pillow" },
      { k: "Thread", v: "Reeled silk, 120 denier, piece-dyed" },
      { k: "Size", v: "210 x 60cm" },
      { k: "Hours", v: "Approx. 900, single hand" }
    ],
    care: "Do not wash. Return to the atelier for cleaning and store flat between acid-free tissue.",
    sizes: ["210 x 60cm"],
    colors: [{ name: "Noir Manchego", hex: "#141414", palette: "noir" }],
    rating: 5, reviews: 12, stock: 1, badges: ["Rare","Atelier"], tags: ["lace","bobbin","shawl","spain"] },

  { id: "aur-606", name: "Lustenau Whitework", cat: "silk", sub: "Scarves", price: 74800,
    shape: "scarf", palette: "ivory", year: 2024, edition: "Numbered to 120",
    materials: "Undyed silk crepe de chine embroidered in white cotton floss on a hand frame",
    blurb: "White floss on white silk, so the pattern only reads when the light crosses it.",
    story: "Lustenau in the Vorarlberg embroidered for the Swiss houses across the Rhine for a century, and a handful of the old hand frames are still standing there. Elisabeth Hammerle works ours in padded satin stitch over a running foundation and pads three times where the older pieces pad twice, which is what gives the petals their thickness. Held flat against a table it looks blank; it does not resolve until it moves.",
    details: [
      { k: "Ground", v: "Silk crepe de chine, 14 momme, undyed" },
      { k: "Thread", v: "Egyptian cotton floss, 60/2" },
      { k: "Stitch", v: "Padded satin over triple running foundation" },
      { k: "Size", v: "90 x 90cm" },
      { k: "Hours", v: "110 per scarf, hand frame" }
    ],
    care: "Dry clean only. Press on the reverse through a cloth, never on the embroidery.",
    sizes: ["70 x 70cm","90 x 90cm"],
    colors: [{ name: "Blanc Rhin", hex: "#f2ece2", palette: "ivory" }, { name: "Craie", hex: "#e3dbcb", palette: "ivory" }],
    rating: 4.7, reviews: 96, stock: 22, badges: ["New"], tags: ["whitework","embroidery","scarf","austria"] },

  { id: "aur-607", name: "Satigny Gauze", cat: "silk", sub: "Scarves", price: 42300,
    shape: "scarf", palette: "platinum", year: 2025, edition: "Open series",
    materials: "Leno gauze silk, 6 momme, 38g finished",
    blurb: "A leno gauze open enough to read a watch dial through two folds of it.",
    story: "On a leno loom every second warp crosses its neighbour and locks, which is the only reason a cloth this open keeps its shape instead of sliding into a mesh. Marc Brulisauer runs ours in Zurich at 26 picks a minute, slow enough that the crossing does not snap the singles. The whole scarf weighs 38 grams, and the green came off the vine rows behind Satigny station in the week we chose it.",
    details: [
      { k: "Weave", v: "Leno gauze, crossed warp" },
      { k: "Silk", v: "6 momme, 20/22 denier singles" },
      { k: "Weight", v: "38g finished" },
      { k: "Size", v: "200 x 55cm" },
      { k: "Loom", v: "Zurich, 26 picks per minute" }
    ],
    care: "Hand wash cool without wringing. Dry flat, out of direct sun.",
    sizes: ["200 x 55cm","230 x 65cm"],
    colors: [{ name: "Argent Pale", hex: "#c8ccd2", palette: "platinum" }, { name: "Vigne Satigny", hex: "#7f9469", palette: "jade" }],
    rating: 4.4, reviews: 208, stock: 34, badges: [], tags: ["gauze","leno","light","scarf"] },

  { id: "aur-608", name: "Tambour Luneville", cat: "silk", sub: "Scarves", price: 68900,
    shape: "scarf", palette: "rose", year: 2023, edition: "Numbered to 120",
    materials: "Silk satin embroidered face-down with a Luneville hook, single continuous thread",
    blurb: "Worked from beneath with a hook, in one unbroken chain from corner to corner.",
    story: "Luneville embroidery is done blind: the frame sits face-down and the hooked needle comes up from underneath, so the embroiderer watches the reverse while the chain forms on the side she cannot see. Sylvie Marchal has worked that way for thirty-one years and takes ours as a single continuous thread, which means the whole spray will run if it is cut anywhere. She finds the corners by touch.",
    details: [
      { k: "Technique", v: "Luneville hook, worked face-down" },
      { k: "Thread", v: "Filament silk, one continuous length" },
      { k: "Ground", v: "Silk satin, 19 momme" },
      { k: "Size", v: "110 x 110cm" },
      { k: "Hours", v: "64 per scarf" }
    ],
    care: "Dry clean only. Do not pull a loose loop; send it back to the atelier instead.",
    sizes: ["110 x 110cm"],
    colors: [{ name: "Rose Cendre", hex: "#c98b91", palette: "rose" }, { name: "Ivoire Luneville", hex: "#efe6d6", palette: "ivory" }],
    rating: 4.8, reviews: 74, stock: 0, badges: ["Numbered"], tags: ["tambour","embroidery","chain","scarf"] },

  { id: "aur-609", name: "Sozni Nishat", cat: "silk", sub: "Shawls", price: 118700,
    shape: "scarf", palette: "jade", year: 2022, edition: "One of 40",
    materials: "Handspun pashmina worked in double-sided sozni needlework",
    blurb: "Sozni needlework so fine that the reverse can be worn as the face.",
    story: "Srinagar rates a sozni man by the needle he can hold, and Ghulam Nabi Wani works to a twelve, meaning twelve stitches across the width of a grain of rice. He will not begin a pattern the naqash has not first cut on a wood block. This one carries the chinar leaf off the Nishat terraces and is do-rukha, worked identically on both faces, so there is no wrong side to fold away.",
    details: [
      { k: "Technique", v: "Sozni, do-rukha (double-sided)" },
      { k: "Density", v: "12 stitches per grain width" },
      { k: "Ground", v: "Pashmina, 14 micron, handspun weft" },
      { k: "Size", v: "200 x 100cm" },
      { k: "Hours", v: "Approx. 1,400, two hands" }
    ],
    care: "Hand wash cool with a wool shampoo, or return it to us. Never dry clean.",
    sizes: ["200 x 100cm"],
    colors: [{ name: "Vert Chinar", hex: "#4f7a5c", palette: "jade" }, { name: "Ivoire Dal", hex: "#e8dfcc", palette: "ivory" }],
    rating: 5, reviews: 29, stock: 2, badges: ["Rare","Atelier"], tags: ["sozni","pashmina","kashmir","shawl"] },

  { id: "aur-610", name: "Canton Manton", cat: "silk", sub: "Shawls", price: 141900,
    shape: "scarf", palette: "oxblood", year: 2021, edition: "One of 40",
    materials: "Silk crepe embroidered in Canton floss, hand-knotted fringe",
    blurb: "Cantonese floss embroidery set straight onto the silk, with no printed outline beneath it.",
    story: "These shawls were made in Canton for the Manila galleons and were never Spanish at all, whatever Seville decided afterwards. Ours is worked in Shunde by Lam Sau-ping's frame of four women who put the flowers down from memory, so no two off the same frame repeat. The fringe is knotted last, 1,180 strands across the four sides, and it takes longer than the embroidery did.",
    details: [
      { k: "Technique", v: "Canton floss embroidery, no printed outline" },
      { k: "Ground", v: "Silk crepe, 22 momme" },
      { k: "Fringe", v: "1,180 hand-knotted strands" },
      { k: "Size", v: "160 x 160cm plus 55cm fringe" },
      { k: "Hours", v: "Approx. 620, frame of four" }
    ],
    care: "Specialist dry clean only. Hang over a wide rail and never fold across the fringe.",
    sizes: ["160 x 160cm"],
    colors: [{ name: "Rouge Shunde", hex: "#8c2226", palette: "oxblood" }, { name: "Noir Laque", hex: "#17161a", palette: "noir" }],
    rating: 4.9, reviews: 47, stock: 4, badges: ["Rare"], tags: ["manton","embroidery","fringe","shawl"] },

  { id: "aur-611", name: "Kalocsa Rosette", cat: "silk", sub: "Scarves", price: 57600,
    shape: "scarf", palette: "lapis", year: 2024, edition: "Open series",
    materials: "Silk twill embroidered in 29 floss colours over freehand chalk drawing",
    blurb: "Kalocsa flowers set out by a drawing woman in freehand chalk before a needle touches the cloth.",
    story: "In Kalocsa the drawing is a separate trade from the sewing, and the irokaasszony who marks the cloth is paid more than the woman who fills it. Ours is drawn by Erzsebet Toth, who is seventy-four and puts a paprika pod into every design as her signature; it sits in the lower border, third motif from the left. Twenty-nine floss colours, four more than the village standard permits.",
    details: [
      { k: "Drawing", v: "Freehand chalk, no transfer" },
      { k: "Colours", v: "29 floss shades" },
      { k: "Ground", v: "Silk twill, 16 momme" },
      { k: "Size", v: "90 x 90cm" },
      { k: "Hours", v: "38 drawing, 96 sewing" }
    ],
    care: "Dry clean. The bright floss will bleed in water.",
    sizes: ["90 x 90cm"],
    colors: [{ name: "Bleu Kalocsa", hex: "#2f4b8f", palette: "lapis" }, { name: "Rouge Paprika", hex: "#b8332e", palette: "oxblood" }, { name: "Blanc Cuit", hex: "#f1ece1", palette: "ivory" }],
    rating: 4.6, reviews: 133, stock: 19, badges: ["New"], tags: ["kalocsa","floral","embroidery","scarf"] },

  { id: "aur-612", name: "Bursa Dival", cat: "silk", sub: "Scarves", price: 84200,
    shape: "scarf", palette: "gold", year: 2023, edition: "Numbered to 120",
    materials: "Silk satin with gilt strip carried over cut card in the dival manner",
    blurb: "Dival work, where the metal thread rides over cut card so the border stands off the cloth.",
    story: "Dival is built rather than stitched flat: the pattern is first cut in mukavva card, glued to the ground, then bridged with gilt thread drawn tight enough to burnish itself along the edges. Mehmet Sahin cuts the card in Bursa with a cobbler's knife, because scissors round the corners and the light then sits wrong on them. The finished border stands a millimetre and a half proud of the satin.",
    details: [
      { k: "Technique", v: "Dival, metal thread over cut card" },
      { k: "Metal", v: "Gilt strip, 2% gold on silver" },
      { k: "Relief", v: "1.5mm above the ground" },
      { k: "Ground", v: "Silk satin, 19 momme" },
      { k: "Size", v: "100 x 100cm" }
    ],
    care: "Do not press the border. Hand cleaning by a specialist, stored rolled.",
    sizes: ["100 x 100cm"],
    colors: [{ name: "Or Bursa", hex: "#b3902d", palette: "gold" }, { name: "Nuit", hex: "#1b1b22", palette: "obsidian" }],
    rating: 4.7, reviews: 61, stock: 0, badges: ["Numbered","Atelier"], tags: ["dival","metal","bursa","scarf"] },

  { id: "aur-613", name: "Bukhara Suzani", cat: "silk", sub: "Shawls", price: 109300,
    shape: "scarf", palette: "rose", year: 2020, edition: "One of 40",
    materials: "Six handwoven adras panels embroidered separately and joined after",
    blurb: "Six loom-widths embroidered apart and joined only once the last one came back.",
    story: "A suzani is drawn across one cloth, cut into strips, and handed to different women, so each panel is embroidered alone and the colours never quite agree when the seams go up. We kept that rather than correcting it. Ours went out in Bukhara in 2018 to six women of one family and returned in 2020; the third panel from the left runs a full shade lighter because Zulfiya ran out of the madder lot and dyed her own.",
    details: [
      { k: "Construction", v: "Six panels, embroidered apart, joined last" },
      { k: "Stitch", v: "Basma and kanda-khayol couching" },
      { k: "Ground", v: "Handwoven silk-cotton adras" },
      { k: "Size", v: "230 x 160cm" },
      { k: "Dye", v: "Madder and pomegranate rind, one lot per panel" }
    ],
    care: "Air rather than clean. Spot clean cold; the madder is not colourfast.",
    sizes: ["230 x 160cm"],
    colors: [{ name: "Rose Madder", hex: "#c46a6e", palette: "rose" }, { name: "Ivoire Adras", hex: "#e9e0cd", palette: "ivory" }],
    rating: 4.8, reviews: 22, stock: 1, badges: ["Rare","Last Pieces"], tags: ["suzani","bukhara","madder","shawl"] },

  { id: "aur-614", name: "Colcha Castelo", cat: "silk", sub: "Scarves", price: 79400,
    shape: "scarf", palette: "ivory", year: 2025, edition: "Numbered to 120",
    materials: "Hand-spun linen embroidered with bourette silk in long floats",
    blurb: "Bourette silk laid in long floats over hand-spun linen, after the colchas of Castelo Branco.",
    story: "The colchas of Castelo Branco use silk reeled in the Beira Baixa, coarser than Chinese filament, which is why it sits up off the linen instead of sinking into it. Maria de Jesus Nunes runs the floats out to four centimetres and anchors each with a single tie-down, the old way: longer and they catch, shorter and the shine dies. The linen is spun at Bucos and still smells faintly of retting when it reaches us.",
    details: [
      { k: "Silk", v: "Bourette, reeled in the Beira Baixa" },
      { k: "Stitch", v: "Long float to 4cm, single tie-down" },
      { k: "Ground", v: "Hand-spun linen from Bucos" },
      { k: "Size", v: "120 x 120cm" },
      { k: "Hours", v: "210 per piece" }
    ],
    care: "Dry clean only. Do not brush the floats, they lift.",
    sizes: ["120 x 120cm"],
    colors: [{ name: "Ecru Bucos", hex: "#ded3bd", palette: "ivory" }, { name: "Or Beira", hex: "#c39b3a", palette: "gold" }],
    rating: 4.5, reviews: 38, stock: 9, badges: ["Numbered"], tags: ["colcha","linen","float","scarf"] },

  { id: "aur-615", name: "Epirus Cypress", cat: "silk", sub: "Scarves", price: 63100,
    shape: "scarf", palette: "obsidian", year: 2019, edition: "Open series",
    materials: "Half-silk ground worked in counted-thread indigo embroidery",
    blurb: "The Ioannina cypress worked in one indigo, counted off the weave rather than drawn on it.",
    story: "The Epirot embroiderers never marked their cloth; the figure is counted off the ground threads, so a scarf is only as regular as the weaving beneath it. We had this ground woven to an exact thirty-four ends per centimetre for that reason alone. Kostas Zervas's frame in Ioannina takes the cypress-and-bird border in a single dark indigo, and lets the count run out at the fourth corner, as every dowry piece in the town does.",
    details: [
      { k: "Technique", v: "Counted-thread, no drawn outline" },
      { k: "Count", v: "34 ends per cm in the ground" },
      { k: "Thread", v: "Indigo-dyed silk, single colour" },
      { k: "Ground", v: "Half-silk, silk warp on cotton" },
      { k: "Size", v: "140 x 45cm" }
    ],
    care: "Hand wash cold and alone for the first three washes; the indigo will crock.",
    sizes: ["140 x 45cm"],
    colors: [{ name: "Indigo Ioannina", hex: "#232a3a", palette: "obsidian" }],
    rating: 4.3, reviews: 87, stock: 15, badges: [], tags: ["epirus","indigo","counted","scarf"] },

  { id: "aur-616", name: "Kerman Pateh", cat: "silk", sub: "Pocket Squares", price: 24700,
    shape: "scarf", palette: "lapis", year: 2024, edition: "Open series",
    materials: "Fulled wool ariz embroidered in madder and indigo wool floss",
    blurb: "A pocket square taken from a pateh panel, wool worked on wool in the Kerman way.",
    story: "Pateh is embroidered in wool onto a fulled wool ground called ariz, dyed in Kerman with madder and the indigo grown south of the city, and the needle has to be blunt or it splits the ground open. Fariba Ostadi works the boteh-within-boteh figure her mother used. We take only the corner sections of her panels, where the ariz was fulled hardest and will fold to a crisp point in a breast pocket.",
    details: [
      { k: "Ground", v: "Fulled wool ariz, Kerman" },
      { k: "Thread", v: "Wool floss, madder and indigo" },
      { k: "Stitch", v: "Blunt-needle satin and stem" },
      { k: "Size", v: "32 x 32cm" },
      { k: "Edge", v: "Hand-rolled with silk thread" }
    ],
    care: "Dry clean. Store flat and do not press over the boteh.",
    sizes: ["32 x 32cm"],
    colors: [{ name: "Indigo Kerman", hex: "#2c3f6b", palette: "lapis" }, { name: "Garance", hex: "#9c3b34", palette: "oxblood" }],
    rating: 4.4, reviews: 112, stock: 28, badges: ["New"], tags: ["pateh","wool","kerman","pocket"] },

  { id: "aur-617", name: "Punto Assisi", cat: "silk", sub: "Pocket Squares", price: 21900,
    shape: "scarf", palette: "oxblood", year: 2026, edition: "Open series",
    materials: "Linen-silk union worked in long-armed cross with Holbein outline",
    blurb: "Assisi work, in which the figure is left bare and everything around it is filled.",
    story: "The Assisi convents worked it as a reversal: the griffin is never stitched at all, it is what remains when the field around it has been covered in long-armed cross. Suor Anna Ferrini's group at San Damiano still outlines in Holbein stitch, which reads identically on both faces, so the back of this square is as clean as the front. That matters more here than on a scarf, since a pocket square is only ever seen folded.",
    details: [
      { k: "Technique", v: "Long-armed cross fill, Holbein outline" },
      { k: "Reserve", v: "Figure left unstitched, ground filled" },
      { k: "Ground", v: "Linen-silk union, 28 count" },
      { k: "Size", v: "35 x 35cm" },
      { k: "Reverse", v: "Identical to the face" }
    ],
    care: "Hand wash cool and press damp on the reverse.",
    sizes: ["35 x 35cm"],
    colors: [{ name: "Rouge Assisi", hex: "#8f3a30", palette: "oxblood" }, { name: "Noir Holbein", hex: "#191919", palette: "noir" }],
    rating: 4.2, reviews: 19, stock: 0, badges: [], tags: ["assisi","linen","holbein","pocket"] },

  { id: "aur-618", name: "Sagara Kyoto", cat: "silk", sub: "Pocket Squares", price: 33800,
    shape: "scarf", palette: "noir", year: 2023, edition: "One of 40",
    materials: "Nishijin habutae worked entirely in Sagara knots",
    blurb: "Every dot is a Sagara knot, tied and drawn down one at a time.",
    story: "Sagara-nui builds a surface out of separate knots; there is no stitch line anywhere, only knots set beside each other until the density becomes the pattern. Nishimura Kenji works in Nishijin at roughly a hundred and ninety to the square centimetre and keeps apprentices off commissions until their sixth year, because a knot pulled a quarter-turn too tight tilts and throws the light back wrong. The wave-and-plover corner here is 41,000 knots across a hand's breadth.",
    details: [
      { k: "Technique", v: "Sagara-nui, knotted surface" },
      { k: "Density", v: "Approx. 190 knots per sq cm" },
      { k: "Count", v: "Approx. 41,000 knots in the corner motif" },
      { k: "Ground", v: "Nishijin silk habutae, 12 momme" },
      { k: "Size", v: "33 x 33cm" }
    ],
    care: "Do not press. Specialist dry clean, and keep flat in the box supplied.",
    sizes: ["33 x 33cm"],
    colors: [{ name: "Noir Nishijin", hex: "#111014", palette: "noir" }, { name: "Argent Chidori", hex: "#c9ccd1", palette: "platinum" }],
    rating: 4.9, reviews: 8, stock: 2, badges: ["Rare","Atelier"], tags: ["sagara","knot","kyoto","pocket"] },

  { id: "aur-619", name: "Appenzell Cutwork", cat: "silk", sub: "Pocket Squares", price: 39600,
    shape: "scarf", palette: "ivory", year: 2022, edition: "Numbered to 120",
    materials: "Linen batiste, 90 lea, hand-embroidered and cut open afterwards",
    blurb: "Appenzell whitework, the openwork cut only once the last stitch is in.",
    story: "In Appenzell the cutting is the part that frightens people: the ground is embroidered whole and the little windows are opened afterwards with curved scissors, so one slip loses six weeks. Vreni Fassler has cut for the house since 1998 and works with the linen still in the frame and still damp, because dry linen frays ahead of the blade. There are sixty-two windows in this square and she has never yet spaced them the same way twice.",
    details: [
      { k: "Technique", v: "Appenzell whitework, cut after embroidery" },
      { k: "Openwork", v: "62 windows, opened with curved scissors" },
      { k: "Ground", v: "Linen batiste, 90 lea" },
      { k: "Size", v: "38 x 38cm" },
      { k: "Hours", v: "54 embroidery, 9 cutting" }
    ],
    care: "Hand wash cool. Press damp through linen and never starch the openwork.",
    sizes: ["38 x 38cm","45 x 45cm"],
    colors: [{ name: "Blanc Appenzell", hex: "#f4f0e8", palette: "ivory" }],
    rating: 4.8, reviews: 33, stock: 6, badges: ["Atelier","Numbered"], tags: ["appenzell","whitework","linen","pocket"] },

  /* ---- EYEWEAR ---- */
  { id: "aur-703", name: "Fores Reader", cat: "eyewear", sub: "Optical", price: 96400,
    shape: "glasses", palette: "oxblood", year: 2024, edition: "Numbered to 120",
    materials: "Italian acetate, six-week cure, riveted seven-barrel hinges",
    blurb: "A high-bridged reading frame that pushes up onto the forehead and stays there.",
    story: "The pattern came off a pair drawn in a Cruikshank etching published by S. W. Fores at Piccadilly, in which Bottom has shoved his spectacles up above the brow and gone on reading without them. Roland Perret files our bridge at fifty-two degrees against a brass gauge rather than the usual forty, which is the whole reason the frame grips the forehead instead of sliding back down onto the nose.",
    details: [
      { k: "Frame", v: "Italian acetate, 6-week cure, 24g" },
      { k: "Bridge", v: "Keyhole, filed at 52 degrees" },
      { k: "Lens", v: "Plano demonstration, prescription to order" },
      { k: "Hinge", v: "Seven-barrel, riveted through" },
      { k: "Width", v: "141mm, 48-22" }
    ],
    care: "Wipe with the microfibre supplied. Acetate softens in a hot car; keep it out of the glovebox.",
    sizes: ["46-22","48-22","50-22"],
    colors: [{ name: "Havane Fonce", hex: "#6b4a2f", palette: "oxblood" }, { name: "Encre", hex: "#22242c", palette: "obsidian" }],
    rating: 4.6, reviews: 88, stock: 3, badges: ["Last Pieces"], tags: ["optical","acetate","reader","etching"] },

  { id: "aur-704", name: "Pittsfield Optical", cat: "eyewear", sub: "Optical", price: 118250,
    shape: "glasses", palette: "ivory", year: 2023, edition: "Open series",
    materials: "Bone acetate cut from a single block, 2.4mm wire core, CR-39 lenses",
    blurb: "A low-set reading frame in bone acetate, cut so the wearer looks over the rim at the room.",
    story: "Fanny Appleton wrote this sheet on a Sunday afternoon at Pittsfield in August 1838, in a hand that gets smaller as the daylight goes. We set the optical centre four millimetres below standard for exactly that hour, so the eye drops to the page and lifts to the window without the frame being touched. Both rims are cut from one bone-coloured block, which is why the grain runs on across the bridge instead of stopping at it.",
    details: [
      { k: "Frame", v: "Bone acetate, single-block cut, 21g" },
      { k: "Optical centre", v: "Set 4mm below standard" },
      { k: "Lens", v: "CR-39, anti-reflective, prescription to order" },
      { k: "Rim", v: "Full, 2.4mm wire core" },
      { k: "Width", v: "138mm, 47-21" }
    ],
    care: "Rinse in cool water and dry with the cloth. Bone acetate yellows in direct sun; store it in the case.",
    sizes: ["45-21","47-21","49-21"],
    colors: [{ name: "Os", hex: "#e7ddc9", palette: "ivory" }],
    rating: 4.5, reviews: 132, stock: 14, badges: [], tags: ["optical","reader","acetate","archive"] },

  { id: "aur-705", name: "Iron-Gall Optical", cat: "eyewear", sub: "Optical", price: 84900,
    shape: "glasses", palette: "gold", year: 2022, edition: "Numbered to 90",
    materials: "Horn-toned acetate, CR-39 blanks dyed 12 per cent amber before surfacing",
    blurb: "A reading frame with a faint amber lens, made for handwriting that has browned into its paper.",
    story: "Iron-gall ink bites as it ages, and on this 1838 leaf the strokes have gone from black to a rust that sits only a shade off the ground. Marthe Voisin, who reads manuscript for a living at the Bibliotheque cantonale, asked for a lens that would separate that rust from the paper without turning the whole page yellow. The tint is twelve per cent amber, dyed into the blank before surfacing, and it is the only lens we make that is deliberately not corrected for colour.",
    details: [
      { k: "Frame", v: "Horn-toned acetate, hand-polished, 23g" },
      { k: "Lens", v: "CR-39, 12% amber, dyed in the blank" },
      { k: "Transmission", v: "88% visible, no blue cut" },
      { k: "Hinge", v: "Five-barrel, sprung" },
      { k: "Width", v: "140mm, 49-21" }
    ],
    care: "The tint is in the material rather than a coating and will not wear off. Clean wet, never dry.",
    sizes: ["47-21","49-21","51-21"],
    colors: [{ name: "Corne", hex: "#8a5f34", palette: "gold" }, { name: "Rouille", hex: "#7a3b2e", palette: "oxblood" }],
    rating: 4.7, reviews: 41, stock: 8, badges: ["Atelier"], tags: ["optical","tinted","archive","reader"] },

  { id: "aur-706", name: "Watermark Folding", cat: "eyewear", sub: "Optical", price: 143700,
    shape: "glasses", palette: "platinum", year: 2025, edition: "Numbered to 60",
    materials: "Beta-titanium, three folding joints, drilled rimless lenses",
    blurb: "A reading frame that folds three times and closes to the size of the letter it was made to read.",
    story: "Hold this 1838 sheet to a window and the chain lines come up about twenty-six millimetres apart, with the mill's watermark sitting near the fold. The frame folds on the same rhythm: two temple joints and one bridge joint, so it shuts flat to eighty-eight by thirty-four millimetres and slips inside a folded quarto. Beta-titanium carries all three joints without a spring anywhere, so there is nothing in it that can fatigue.",
    details: [
      { k: "Frame", v: "Beta-titanium, 14g" },
      { k: "Joints", v: "Three, folds flat to 88 x 34mm" },
      { k: "Lens", v: "Rimless, drilled, prescription to order" },
      { k: "Bridge", v: "Titanium pad arms, adjustable" },
      { k: "Width", v: "134mm, 46-20" }
    ],
    care: "Fold from the bridge first, then the temples. Never force a joint that is cold.",
    sizes: ["44-20","46-20","48-20"],
    colors: [{ name: "Titane Brut", hex: "#b9bcc4", palette: "platinum" }],
    rating: 4.9, reviews: 27, stock: 6, badges: ["New","Numbered"], tags: ["optical","titanium","folding","rimless"] },

  { id: "aur-707", name: "Cachet Travelling Case", cat: "eyewear", sub: "Optical", price: 67300,
    shape: "case", palette: "oxblood", year: 2021, edition: "One of 40",
    materials: "Polished shagreen over pear wood, cast brass seal catch, Alcantara lining",
    blurb: "A shagreen case that shuts on a wax-red seal and holds a folded reader flat.",
    story: "Before envelopes a letter was its own wrapper: this sheet was folded in four, addressed on the back and closed with a drop of wax. The case copies that geometry exactly, four panels and one fold-over flap with no hinge at all, and the catch is a cast brass disc struck from a seal cut for us by Emile Rochat in Carouge. The shagreen is polished flat until the ray denticles read as a field of small pale rings; one skin yields two cases and the pair are never matched.",
    details: [
      { k: "Body", v: "Shagreen over pear wood, 148 x 62 x 28mm" },
      { k: "Catch", v: "Cast brass seal disc, hand-struck" },
      { k: "Lining", v: "Alcantara, wax red" },
      { k: "Construction", v: "Four panels, fold-over flap, no hinge" },
      { k: "Weight", v: "96g empty" }
    ],
    care: "Shagreen dislikes standing water. Wipe damp and never soak.",
    sizes: [],
    colors: [{ name: "Cire Rouge", hex: "#7a2f2c", palette: "oxblood" }, { name: "Galuchat Pale", hex: "#d9d3c4", palette: "ivory" }],
    rating: 4.8, reviews: 19, stock: 0, badges: ["Rare"], tags: ["case","shagreen","optical","travel"] },

  { id: "aur-708", name: "Flambeau Sun", cat: "eyewear", sub: "Sun", price: 212400,
    shape: "glasses", palette: "gold", year: 2024, edition: "Numbered to 120",
    materials: "Italian acetate, eight-week cure, vacuum-dipped mineral glass lenses",
    blurb: "A wide sun in warm gold acetate with lenses graded from smoke at the brow to clear at the cheek.",
    story: "Constance Mayer painted Le Flambeau de Venus in Prud'hon's Paris studio, and the entire picture is lit from one raised torch: bright across the top of the canvas, falling away below it. The gradient in these lenses runs the same way and at the same rate, category three at the brow down to category one at the lower edge, which is the reverse of every driving lens we make and is corrected instead for a face in low afternoon light.",
    details: [
      { k: "Frame", v: "Italian acetate, 8-week cure, 29g" },
      { k: "Lens", v: "Mineral glass, graded cat 3 to cat 1" },
      { k: "Gradient", v: "Vacuum-dipped, brow to cheek" },
      { k: "Core", v: "Nickel silver wire, adjustable" },
      { k: "Width", v: "146mm, 54-19" }
    ],
    care: "Mineral glass is hard but brittle. Set the frame down lens-up.",
    sizes: ["52-19","54-19"],
    colors: [{ name: "Or Chaud", hex: "#c79a4b", palette: "gold" }, { name: "Ivoire Brule", hex: "#e3d5b8", palette: "ivory" }],
    rating: 4.9, reviews: 63, stock: 7, badges: ["Icon"], tags: ["sun","acetate","gradient","glass"] },

  { id: "aur-709", name: "Brocanteur Optical", cat: "eyewear", sub: "Optical", price: 128600,
    shape: "glasses", palette: "noir", year: 2020, edition: "Open series",
    materials: "Blackened nickel silver, rims turned from solid rod, cable temples",
    blurb: "A small round optical in blackened nickel silver, sized for close looking rather than for being seen in.",
    story: "The Wattier lithograph after Haudebourt-Lescot shows a picture dealer bent over a canvas at arm's length, and the print itself was pulled on one of Engelmann's stones in Paris in the 1820s. The eye here is deliberately small at forty-two millimetres, because a dealer's working distance is three hundred millimetres and not infinity, and a wide lens only adds edge distortion at that range. Each rim is turned from solid rod rather than bent from wire, which is slower and is the reason the circle is genuinely round.",
    details: [
      { k: "Frame", v: "Blackened nickel silver, 17g" },
      { k: "Rim", v: "Turned from solid rod, 42mm eye" },
      { k: "Lens", v: "Prescription to order, close-work bias" },
      { k: "Temple", v: "Cable, 145mm, wraps the ear" },
      { k: "Finish", v: "Cold-blacked, unlacquered" }
    ],
    care: "The blacking wears through at the contact points by design. Re-blacking on request.",
    sizes: ["42-24","44-24"],
    colors: [{ name: "Noir Froid", hex: "#2b2c31", palette: "noir" }],
    rating: 4.4, reviews: 156, stock: 12, badges: [], tags: ["optical","metal","round","lithograph"] },

  { id: "aur-710", name: "Woolwich Grey", cat: "eyewear", sub: "Optical", price: 74850,
    shape: "glasses", palette: "noir", year: 2022, edition: "Open series",
    materials: "Grey acetate milled from a single block run, silk reading cord supplied",
    blurb: "A grey acetate optical with a cord channel milled into the underside of each temple.",
    story: "The Woolwich letter of June 1841 opens by setting a damp English garrison town against Paris in high summer, and whoever wrote it plainly had both hands on the page. So each temple carries a 1.2mm channel on its underside for a silk cord, letting the frame be dropped and left hanging rather than put down on a table already covered in paper. Grey is the hardest acetate to hold even across a batch; we cut every rim in a run from one block and scrap whatever fails to match.",
    details: [
      { k: "Frame", v: "Grey acetate, single-block run, 25g" },
      { k: "Temple", v: "1.2mm cord channel, both sides" },
      { k: "Cord", v: "Silk, 700mm, supplied" },
      { k: "Lens", v: "CR-39, anti-reflective" },
      { k: "Width", v: "142mm, 50-20" }
    ],
    care: "Do not knot the cord directly to the temple; use the supplied loops.",
    sizes: ["48-20","50-20","52-20"],
    colors: [{ name: "Gris Arsenal", hex: "#5a5d64", palette: "noir" }, { name: "Encre", hex: "#23252b", palette: "obsidian" }],
    rating: 4.3, reviews: 204, stock: 21, badges: [], tags: ["optical","acetate","cord","grey"] },

  { id: "aur-711", name: "Demi-Lune Optical", cat: "eyewear", sub: "Optical", price: 59200,
    shape: "glasses", palette: "gold", year: 2019, edition: "Open series",
    materials: "Brass with 3 micron 18k plate, sprung five-barrel hinges, half-moon lenses",
    blurb: "Half-moon readers in 18k-plated brass, cut low enough to read a letter and talk over it.",
    story: "This 1841 sheet is a letter to a brother, written to be read and answered in one sitting, and half-moons exist for precisely that arrangement: page below, room above. The lens is twenty-one millimetres deep at the centre and fourteen at the temple end, a taper copied from a pair of 1930s dispensing spectacles found in a drawer at an optician's on the Rue de la Cite. The plate is three microns of 18k over brass, which will wear through at the bridge in about a decade and is meant to.",
    details: [
      { k: "Frame", v: "Brass, 3 micron 18k plate, 15g" },
      { k: "Lens", v: "Half-moon, 21mm centre to 14mm temple" },
      { k: "Hinge", v: "Sprung, five-barrel" },
      { k: "Bridge", v: "Saddle, no pads" },
      { k: "Width", v: "136mm, 47-22" }
    ],
    care: "The plate wears at contact points. Do not polish with an abrasive cloth.",
    sizes: ["+1.00","+1.50","+2.00","+2.50"],
    colors: [{ name: "Or Jaune", hex: "#c9a961", palette: "gold" }],
    rating: 4.2, reviews: 288, stock: 3, badges: ["Last Pieces"], tags: ["optical","readers","gold","halfmoon"] },

  { id: "aur-712", name: "Aurige Case", cat: "eyewear", sub: "Sun", price: 287500,
    shape: "case", palette: "ivory", year: 2021, edition: "One of 40",
    materials: "Hand-carved bone lid on an ebonised pear wood body, doeskin lining",
    blurb: "A carved bone case whose lid repeats a Rouen chariot-race relief, sized for a wide sun frame.",
    story: "The original is a lid in the Musee des Antiquites at Rouen: four teams turning the far post of the circus, cut shallow so the relief only reads at a slant. Pascal Guiraud works it in reverse on bone with a burin, forty-one hours to a lid, and leaves the fourth chariot barely cut where the Rouen surface has worn away rather than inventing what is missing. The body is pear wood ebonised in the block, so a scratch does not show pale.",
    details: [
      { k: "Lid", v: "Carved bone, 41 hours, hand burin" },
      { k: "Body", v: "Ebonised pear wood, 162 x 66 x 34mm" },
      { k: "Relief", v: "Four-horse teams, after the Rouen couvercle" },
      { k: "Lining", v: "Doeskin, jade" },
      { k: "Weight", v: "184g empty" }
    ],
    care: "Bone moves with humidity. Keep it away from a radiator or a sunlit sill.",
    sizes: [],
    colors: [{ name: "Os Ancien", hex: "#ded2b6", palette: "ivory" }, { name: "Jade Sombre", hex: "#4f7a6a", palette: "jade" }],
    rating: 5, reviews: 11, stock: 0, badges: ["Rare","Numbered"], tags: ["case","bone","carved","sun"] },

  { id: "aur-713", name: "Halation Cat-Eye", cat: "eyewear", sub: "Sun", price: 91300,
    shape: "glasses", palette: "rose", year: 2025, edition: "Numbered to 200",
    materials: "Acetate faded in the block, CR-39 lenses with a forward-scatter laminate",
    blurb: "A low cat-eye in faded rose acetate with a lens that blooms slightly at the highlights.",
    story: "The photograph this was drawn against carries the warm bloom colour film gives around a bright edge, light scattering back off the film base. We built that into the lens rather than correcting it out: a four per cent forward-scatter layer inside the laminate that softens a specular highlight without dropping midtone contrast. Bruno Fassler spent two years at the lens bench getting the scatter even, because uneven scatter reads as a dirty lens instead of an effect.",
    details: [
      { k: "Frame", v: "Acetate, hand-faded in the block, 26g" },
      { k: "Lens", v: "CR-39, cat 2, 4% forward-scatter layer" },
      { k: "Uplift", v: "Cat-eye, 11 degrees" },
      { k: "Core", v: "Steel wire, adjustable" },
      { k: "Width", v: "139mm, 52-18" }
    ],
    care: "The scatter layer sits inside the laminate and cannot be polished off. Clean as any lens.",
    sizes: ["50-18","52-18"],
    colors: [{ name: "Rose Passe", hex: "#d8a0a2", palette: "rose" }, { name: "Cendre", hex: "#9a8f92", palette: "platinum" }],
    rating: 4.6, reviews: 97, stock: 15, badges: ["New"], tags: ["sun","cateye","acetate","rose"] },

  { id: "aur-714", name: "Brouilly Sun", cat: "eyewear", sub: "Sun", price: 105750,
    shape: "glasses", palette: "oxblood", year: 2023, edition: "Numbered to 150",
    materials: "Three-ply acetate, eleven-week cure, grey-brown mineral glass",
    blurb: "A deep wine acetate sun, held to the light the colour of Gamay in a glass.",
    story: "Mont Brouilly is pink granite under the vines, and a young Gamay off that hill is opaque in the bottle and clear in the glass. The acetate is laid up to do the same thing: three plies with the middle one only lightly pigmented, so the frame reads near-black on a shelf and turns red on a face in sun. It needs eleven weeks of cure rather than eight, because pigment that shallow will bloom to the surface if the block is milled early.",
    details: [
      { k: "Frame", v: "Three-ply acetate, 11-week cure, 30g" },
      { k: "Ply", v: "Middle layer 0.6mm, low pigment" },
      { k: "Lens", v: "Mineral glass, cat 3, grey-brown" },
      { k: "Hinge", v: "Seven-barrel, riveted" },
      { k: "Width", v: "147mm, 53-20" }
    ],
    care: "Never leave it on a dashboard; the middle ply is always the first layer to move.",
    sizes: ["51-20","53-20","55-20"],
    colors: [{ name: "Gamay", hex: "#5e1f24", palette: "oxblood" }, { name: "Granit Rose", hex: "#b08079", palette: "rose" }],
    rating: 4.7, reviews: 78, stock: 10, badges: ["Atelier"], tags: ["sun","acetate","oxblood","glass"] },

  { id: "aur-715", name: "Folsom Noir", cat: "eyewear", sub: "Sun", price: 62400,
    shape: "glasses", palette: "obsidian", year: 2024, edition: "Open series",
    materials: "Matte acetate with hinges buried in the block, uniform grey mineral glass",
    blurb: "A blunt black mask sun with a flat top bar and no visible hinge.",
    story: "Folsom Street in late September takes a hard low sun straight down the block between the warehouses, and that is the light this was drawn for: a flat six-millimetre top bar to cut glare above the brow, and thirty-eight millimetres of lens at the outer edge to stop the bounce off parked cars. The hinges are sunk into the acetate on a jig, so from the front there is no metal anywhere. It is the only frame we make with no polished surface on it at all.",
    details: [
      { k: "Frame", v: "Matte acetate, hinge buried in the block, 33g" },
      { k: "Top bar", v: "Flat, 6mm" },
      { k: "Lens", v: "Mineral glass, cat 3, uniform grey" },
      { k: "Coverage", v: "38mm at the outer edge" },
      { k: "Width", v: "150mm, 56-16" }
    ],
    care: "Matte acetate holds fingerprints. The supplied cloth is the only thing that lifts them cleanly.",
    sizes: ["54-16","56-16"],
    colors: [{ name: "Noir Mat", hex: "#1c1d21", palette: "obsidian" }],
    rating: 4.4, reviews: 143, stock: 1, badges: ["Last Pieces"], tags: ["sun","matte","black","mask"] },

  { id: "aur-716", name: "Carlton Optical", cat: "eyewear", sub: "Optical", price: 138900,
    shape: "glasses", palette: "jade", year: 2026, edition: "Numbered to 100",
    materials: "Green-flecked acetate, asymmetric rims, riveted seven-barrel hinges",
    blurb: "A broad optical in green-flecked acetate, drawn from a 1950s Melbourne dispensing pattern.",
    story: "The Royal Exhibition Building holds a vintage fair each year under the 1880 dome in the Carlton Gardens, and the pattern for this frame came off a pair bought at one of those stalls with the original dispenser's ticket still folded inside the case. We kept the odd part rather than tidying it: the rims run three millimetres wider at the temple than at the nose, an asymmetry with no optical purpose that nobody notices until they put the frame on and find it sits square.",
    details: [
      { k: "Frame", v: "Green-flecked acetate, 27g" },
      { k: "Rim", v: "Asymmetric, 3mm wider at temple" },
      { k: "Lens", v: "CR-39, anti-reflective, prescription to order" },
      { k: "Hinge", v: "Seven-barrel, riveted" },
      { k: "Width", v: "144mm, 51-19" }
    ],
    care: "Have the fit checked once a year. Acetate relaxes with body heat and drifts wide.",
    sizes: ["49-19","51-19","53-19"],
    colors: [{ name: "Vert Mouchete", hex: "#4f6b52", palette: "jade" }, { name: "Ecaille Claire", hex: "#a97b4a", palette: "gold" }],
    rating: 4.8, reviews: 34, stock: 9, badges: ["New","Numbered"], tags: ["optical","acetate","jade","vintage"] },

  { id: "aur-717", name: "Erebus Glacier", cat: "eyewear", sub: "Sun", price: 176300,
    shape: "glasses", palette: "platinum", year: 2020, edition: "Numbered to 75",
    materials: "Satin nickel silver, category 4 mineral glass, vegetable-tanned kip side shields",
    blurb: "A glacier sun with removable leather side shields and category four glass, made for snow rather than for streets.",
    story: "Antarctic light arrives twice, once from the sky and once off the ice, and it is the second one that burns. Each shield is moulded from a single piece of vegetable-tanned kip and pierced forty-one times a side, enough airflow that the lens does not fog the moment you stop climbing. Category four glass is not legal for driving in any country we ship to, and we print that on the box because people ask.",
    details: [
      { k: "Frame", v: "Nickel silver, satin, 31g" },
      { k: "Lens", v: "Mineral glass, category 4, 6% transmission" },
      { k: "Shields", v: "Vegetable-tanned kip, 41 perforations a side" },
      { k: "Temple", v: "Cable, 150mm" },
      { k: "Fit", v: "Shields removable, two screws" }
    ],
    care: "Rinse salt off the shields with fresh water and dry them away from direct heat.",
    sizes: ["One size"],
    colors: [{ name: "Glace", hex: "#c8d4dc", palette: "platinum" }, { name: "Cuir Fauve", hex: "#8a6a45", palette: "gold" }],
    rating: 4.9, reviews: 52, stock: 2, badges: ["Rare","Last Pieces"], tags: ["sun","glacier","leather","glass"] },

  { id: "aur-718", name: "Quiberon Marine", cat: "eyewear", sub: "Sun", price: 82600,
    shape: "glasses", palette: "lapis", year: 2025, edition: "Open series",
    materials: "Washed-navy acetate, keyhole bridge, gradient grey CR-39",
    blurb: "A navy panto sun in the blue of a washed marinière, with a shallow keyhole bridge.",
    story: "The blue was matched against a Breton jersey that had been through roughly two hundred washes, not the navy it left the mill as but the greyed one it becomes. Getting that into acetate took four blocks, because pigment this dilute goes purple under fluorescent light unless the mill adds a trace of green, which our supplier at Lauro does by eye and not by formula. The keyhole bridge is cut two millimetres shallower than our standard so it clears a low nose.",
    details: [
      { k: "Frame", v: "Acetate, washed navy, 25g" },
      { k: "Bridge", v: "Keyhole, 2mm shallow" },
      { k: "Lens", v: "CR-39, cat 3, gradient grey" },
      { k: "Shape", v: "Panto, 48mm eye" },
      { k: "Width", v: "140mm, 48-21" }
    ],
    care: "Cool water only. Hot water dulls the surface of this acetate permanently.",
    sizes: ["46-21","48-21","50-21"],
    colors: [{ name: "Marine Lave", hex: "#3a4b6b", palette: "lapis" }, { name: "Ecru", hex: "#e5e0d3", palette: "ivory" }],
    rating: 4.5, reviews: 119, stock: 18, badges: ["New"], tags: ["sun","navy","panto","acetate"] },

  { id: "aur-719", name: "Shore Road Aviator", cat: "eyewear", sub: "Sun", price: 47950,
    shape: "glasses", palette: "platinum", year: 2019, edition: "Open series",
    materials: "Polished steel, double bar, green mineral glass at 15 per cent transmission",
    blurb: "A small aviator in polished steel with a double bar and green glass.",
    story: "Drawn at the classic-car line-up that runs beside the Ragamuffin Parade in Bay Ridge, where the chrome is the entire point of the afternoon. The eye is kept small at fifty-two millimetres, the size the 1950s originals were before the shape grew through the seventies, and the frame is steel rather than the usual monel so it holds a mirror polish instead of going cloudy. The green glass runs at fifteen per cent transmission, the old aviation figure, which is noticeably darker than anything sold as category three today.",
    details: [
      { k: "Frame", v: "Polished steel, double bar, 28g" },
      { k: "Lens", v: "Mineral glass, green, 15% transmission" },
      { k: "Eye", v: "52mm, teardrop" },
      { k: "Pads", v: "Silicone, adjustable arms" },
      { k: "Temple", v: "Bayonet, 140mm" }
    ],
    care: "Polished steel marks against anything harder than cloth. The case is not optional.",
    sizes: ["52-14","55-14"],
    colors: [{ name: "Acier Poli", hex: "#c2c6cc", palette: "platinum" }, { name: "Verre Vert", hex: "#3f4f42", palette: "jade" }],
    rating: 4.1, reviews: 312, stock: 0, badges: [], tags: ["sun","aviator","steel","glass"] },

  /* ---- JEWELLERY ---- */
  { id: "aur-105", name: "Amarna Band", cat: "jewellery", sub: "Rings", price: 486300,
    shape: "ring", palette: "gold", year: 2023, edition: "Numbered to 110",
    materials: "18k yellow gold over a fine-silver core, hand-planished",
    blurb: "A broad Egyptian-profile band in gold, its crown left flat where the hand closes.",
    story: "Our first bench, Theo Wenger, took the profile from a New Kingdom finger ring he was allowed to measure at the Musee d'Art et d'Histoire on a Monday closing day: 8.6mm across the crown, tapering to 3.0mm behind the finger. We kept the silver core the Egyptian goldsmiths used to spare gold. It is invisible once the ring is on and it is the reason the Amarna sits heavier in the hand than its width suggests.",
    details: [
      { k: "Metal", v: "18k yellow gold on fine-silver core, 9.8g" },
      { k: "Profile", v: "8.6mm crown tapering to 3.0mm" },
      { k: "Finish", v: "Hand-planished, no machine polish" },
      { k: "Interior", v: "Silver core exposed at the rim, year-stamped" },
      { k: "Hallmark", v: "Geneva assay, maison punch" }
    ],
    care: "Planished gold holds fingerprints. A dry cloth is enough; do not take polishing compound to the matte crown.",
    sizes: ["48","50","52","54","56","58"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "Pale Gold", hex: "#e3d2a4", palette: "ivory" }],
    rating: 4.7, reviews: 96, stock: 14, badges: ["Atelier"], tags: ["gold","band","egyptian","ring"] },

  { id: "aur-106", name: "Kourion Cabochon", cat: "jewellery", sub: "Rings", price: 322750,
    shape: "ring", palette: "gold", year: 2023, edition: "Numbered to 90",
    materials: "18k yellow gold, 3.40ct Cypriot sard cabochon",
    blurb: "A gold hoop carrying one domed cabochon in a closed bezel.",
    story: "The hoop follows a ring lifted at Kourion, where the shank was rolled from a single strip and closed with a lap joint rather than a solder seam. Elena Chrysanthou rolls ours cold over a boxwood mandrel so the joint finishes underneath the stone and never shows on the finger. The sard is domed by hand to 4.1mm, high enough that the ring will not pass under a glove, which is why we sell it with the dome height on the card.",
    details: [
      { k: "Metal", v: "18k yellow gold, 7.2g" },
      { k: "Stone", v: "Cypriot sard cabochon, 3.40ct" },
      { k: "Setting", v: "Closed-back bezel, hand-burnished" },
      { k: "Shank", v: "Rolled strip, lap joint under the bezel" },
      { k: "Dome", v: "4.1mm above the bezel line" }
    ],
    care: "Sard is porous at the girdle. Remove before swimming and dry the bezel before it goes back in the pouch.",
    sizes: ["46","48","50","52","54","56"],
    colors: [{ name: "Sard", hex: "#a75a3d", palette: "oxblood" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.8, reviews: 61, stock: 8, badges: ["Numbered"], tags: ["cabochon","sard","gold","cypriot"] },

  { id: "aur-107", name: "Garnet Oath", cat: "jewellery", sub: "Rings", price: 268400,
    shape: "ring", palette: "oxblood", year: 2022, edition: "Numbered to 60",
    materials: "18k yellow gold, 2.05ct almandine garnet ring stone",
    blurb: "A gold ring set with one flat-topped garnet, cut to be read rather than admired.",
    story: "Reinhold Bosch cuts the ring stones for this piece in Idar-Oberstein with a flat table and a twelve degree back slope, so the garnet can be pressed into wax without chipping at the girdle. We ask him to leave the stone about a third of a millimetre proud of the gold. The Hellenistic rings we took the setting from were worn until the metal wore down to the stone, never the other way round, and this one is built to go the same way.",
    details: [
      { k: "Metal", v: "18k yellow gold, 8.9g" },
      { k: "Stone", v: "Almandine garnet, 2.05ct, flat table" },
      { k: "Setting", v: "Rub-over collet, closed back" },
      { k: "Back slope", v: "12 degrees, cut for wax release" },
      { k: "Engraving", v: "Left blank, cut to order in Geneva" }
    ],
    care: "Wax leaves a film on the table. Warm water and a soft brush, then dry the ring face-down.",
    sizes: ["48","50","52","54","56","58"],
    colors: [{ name: "Garnet", hex: "#7d1f2b", palette: "oxblood" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.9, reviews: 44, stock: 11, badges: ["Atelier"], tags: ["garnet","seal","gold","ring"] },

  { id: "aur-108", name: "Aquileia Intaglio", cat: "jewellery", sub: "Rings", price: 967400,
    shape: "ring", palette: "oxblood", year: 2021, edition: "One of 12",
    materials: "Roman carnelian intaglio, 18k yellow gold mount in an 18th-century pattern",
    blurb: "A Roman carnelian oval, engraved in antiquity, held in a gold mount cut to an eighteenth-century pattern.",
    story: "The stone is Roman, first or second century, bought as a group of twelve from the estate of a Trieste notary who kept them in a matchbox. Our gem specialist Helene Barraud rebuilt the mount to match the ring this one arrived in, holding the collet walls at 0.6mm so the carnelian could be closed cold. The engraving is a standing figure with a palm, and the tip of the palm runs off the edge of the stone. That is how we know the cutter worked it before it was trimmed, and it is the only one of the twelve that shows it.",
    details: [
      { k: "Stone", v: "Roman carnelian intaglio, 14.2 x 11.0mm" },
      { k: "Subject", v: "Standing figure holding a palm" },
      { k: "Mount", v: "18k yellow gold, 18th-century pattern" },
      { k: "Collet", v: "0.6mm walls, cold-closed, no heat" },
      { k: "Provenance", v: "Private collection, Trieste, acquired 2021" }
    ],
    care: "Never clean ultrasonically; the collet is cold-closed and will loosen. Return for a seat check every third year.",
    sizes: ["52","54","56"],
    colors: [{ name: "Carnelian", hex: "#b1462f", palette: "oxblood" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 5, reviews: 12, stock: 2, badges: ["Rare","Last Pieces"], tags: ["intaglio","carnelian","roman","gold"] },

  { id: "aur-109", name: "Antiquary's Carnelian", cat: "jewellery", sub: "Rings", price: 615200,
    shape: "ring", palette: "gold", year: 2021, edition: "One of 12",
    materials: "Roman carnelian intaglio, plain 18k yellow gold hoop",
    blurb: "An antique carnelian oval reset in a plain gold hoop, the shoulders left bare so the stone carries the ring.",
    story: "Also out of the Trieste twelve, and the plainest of them. The engraving is a bird on a branch, cut so shallow that it only reads in raking light, so Gabriel Ferrand set the stone 1.2mm proud of the shoulders instead of flush and gave the hoop no decoration at all. There is an old bruise on the girdle at four o'clock. We did not polish it out; the collet wall hides it, and a stone that has been knocked once in eighteen centuries has earned the mark.",
    details: [
      { k: "Stone", v: "Roman carnelian intaglio, 12.6 x 9.4mm" },
      { k: "Subject", v: "Bird on a branch, shallow cut" },
      { k: "Mount", v: "18k yellow gold, 10.6g, undecorated" },
      { k: "Table height", v: "1.2mm above the shoulder line" },
      { k: "Condition", v: "Old girdle bruise at four o'clock, unpolished" }
    ],
    care: "The girdle bruise is old but stable. Avoid knocks to the four o'clock side of the collet.",
    sizes: ["50","52","54"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "Carnelian", hex: "#b1462f", palette: "oxblood" }],
    rating: 4.9, reviews: 8, stock: 0, badges: ["Rare"], tags: ["carnelian","oval","antique","ring"] },

  { id: "aur-110", name: "Praeneste Oval", cat: "jewellery", sub: "Rings", price: 559600,
    shape: "ring", palette: "oxblood", year: 2022, edition: "One of 12",
    materials: "Roman carnelian intaglio cut 0.9mm deep, 18k yellow gold",
    blurb: "A deep-cut Roman oval in carnelian, seated low in gold so it can still take an impression.",
    story: "The third of the Trieste stones and the only one that still works as a seal: the intaglio runs 0.9mm deep and releases from wax cleanly without oil. Ferrand seats it 0.4mm above the bezel line so the finger takes the pressure rather than the girdle. Every mount is tested on a stick of red sealing wax at the bench before it leaves, and the first impression goes into the file card that travels with the ring.",
    details: [
      { k: "Stone", v: "Roman carnelian intaglio, 13.1 x 10.2mm" },
      { k: "Depth of cut", v: "0.9mm, releases without oil" },
      { k: "Mount", v: "18k yellow gold, 12.1g" },
      { k: "Seat", v: "0.4mm above the bezel line" },
      { k: "Supplied with", v: "First wax impression on the file card" }
    ],
    care: "Lift wax from the intaglio with a wooden pick, never steel. We re-cut the wax card at no charge.",
    sizes: ["52","54","56","58"],
    colors: [{ name: "Carnelian", hex: "#b1462f", palette: "oxblood" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.8, reviews: 19, stock: 5, badges: ["Atelier"], tags: ["intaglio","seal","carnelian","wax"] },

  { id: "aur-111", name: "Twin Rib Band", cat: "jewellery", sub: "Rings", price: 147800,
    shape: "ring", palette: "gold", year: 2025, edition: "Open series",
    materials: "18k yellow gold, two ribs turned from the solid",
    blurb: "A plain gold hoop cut with two raised ribs that run the full circumference.",
    story: "The ribs are not applied wire. Ines Roulet turns them out of the solid on a hand lathe, taking 0.35mm off the field on either side until the two ribs stand at 0.7mm. It is a subtractive way to make a decoration and it throws away gold, which is why almost nobody does it any more. The ribs catch on cloth for about a month and then stop, and after a year they are the only bright part of the ring.",
    details: [
      { k: "Metal", v: "18k yellow gold, 6.1g" },
      { k: "Ribs", v: "Two, 0.7mm proud, turned from solid" },
      { k: "Width", v: "5.4mm overall" },
      { k: "Interior", v: "Mirror-polished, comfort curve" },
      { k: "Hallmark", v: "Geneva assay, maison punch" }
    ],
    care: "The ribs burnish bright with wear while the field stays matte. Leave them, or ask us to re-matte at any service.",
    sizes: ["46","48","50","52","54","56","58","60"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "White Gold", hex: "#c3cbd6", palette: "platinum" }, { name: "Rose Gold", hex: "#e0a4a9", palette: "rose" }],
    rating: 4.5, reviews: 173, stock: 27, badges: [], tags: ["band","ribbed","gold","turned"] },

  { id: "aur-112", name: "Amathus Swivel", cat: "jewellery", sub: "Rings", price: 838400,
    shape: "ring", palette: "ivory", year: 2020, edition: "One of 40",
    materials: "Sterling silver hoop, banded agate scarab, 18k gold cage and pivot",
    blurb: "A silver hoop carrying an agate scarab in a gold cage that turns to show either face.",
    story: "The scarab is banded agate, carved on the back and cut flat on the belly with a lion, and it turns on a gold pin 1.1mm thick driven through the body. Phoenician workshops at Amathus built them this way and the pin was the only part that ever failed. Nikolas Aristidou draws ours rather than casting it and peens both ends cold, so a jeweller in fifty years can open it again without cutting the hoop. Turn it once for the beetle, twice for the lion.",
    details: [
      { k: "Hoop", v: "Sterling silver, 9.4g" },
      { k: "Scarab", v: "Banded agate, 15.5 x 11.2mm" },
      { k: "Setting", v: "18k gold cage, hand-formed" },
      { k: "Pivot", v: "Drawn gold pin, 1.1mm, cold-peened" },
      { k: "Underside", v: "Lion, intaglio-cut" }
    ],
    care: "Turn the scarab slowly. If the pivot stiffens do not force it; the pin is made to be reopened by a jeweller.",
    sizes: ["54","56","58"],
    colors: [{ name: "Agate", hex: "#cfc3ae", palette: "ivory" }, { name: "Silver", hex: "#c9ccd1", palette: "platinum" }],
    rating: 5, reviews: 27, stock: 1, badges: ["Rare","Last Pieces"], tags: ["scarab","agate","silver","swivel"] },

  { id: "aur-113", name: "Filigree Scaraboid", cat: "jewellery", sub: "Rings", price: 394500,
    shape: "ring", palette: "gold", year: 2024, edition: "Numbered to 45",
    materials: "18k yellow gold filigree, plain carnelian scaraboid",
    blurb: "A plain carnelian scaraboid on a gold shank, the shoulders built up in filigree wire.",
    story: "The scaraboid is left uncut on both faces, which is rarer than an engraved one and usually meant a stone held in reserve for a name that never came. Sofia Kalogera draws the filigree down to 0.4mm in eleven passes and lays it as a running spiral on each shoulder, seventeen turns a side, counted. She solders with a cadmium-free paste that flows at 690 degrees, twenty below the melting point of the shank, which gives her about four seconds to place each spiral.",
    details: [
      { k: "Metal", v: "18k yellow gold, 9.7g" },
      { k: "Stone", v: "Carnelian scaraboid, plain, 4.80ct" },
      { k: "Filigree", v: "0.4mm wire, 17 turns per shoulder" },
      { k: "Solder", v: "Cadmium-free, flows at 690 degrees" },
      { k: "Swivel", v: "None; stone fixed in the setting" }
    ],
    care: "Filigree traps soap. Rinse under running water and blot dry rather than rubbing.",
    sizes: ["48","50","52","54","56"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "Carnelian", hex: "#b1462f", palette: "oxblood" }],
    rating: 4.7, reviews: 38, stock: 6, badges: ["Atelier"], tags: ["filigree","scaraboid","carnelian","gold"] },

  { id: "aur-114", name: "Thera Carnelian", cat: "jewellery", sub: "Rings", price: 231700,
    shape: "ring", palette: "rose", year: 2019, edition: "Numbered to 26",
    materials: "18k rose gold, 1.35ct carnelian ring stone",
    blurb: "A small carnelian ring stone in a rose gold hoop, sized for a hand rather than a case.",
    story: "Cut from a single nodule Reinhold Bosch bought for us at Idar-Oberstein in 2019, good for thirty-one stones of which twenty-six passed. The colour runs clear orange at the top of the nodule and goes smoky brown towards the base, so we number the rings in the order the stones were cut: 01 is the palest and 26 the darkest. The bezel is 1.9mm wide, the narrowest wall our bench will close by hand.",
    details: [
      { k: "Metal", v: "18k rose gold, 5.4g" },
      { k: "Stone", v: "Carnelian, 1.35ct, oval" },
      { k: "Bezel", v: "1.9mm wall, hand-closed" },
      { k: "Series", v: "Numbered 01 to 26 by depth in the nodule" },
      { k: "Band", v: "2.6mm, half-round" }
    ],
    care: "Carnelian pales in strong sun. Keep it in the pouch rather than on a window sill.",
    sizes: ["44","46","48","50","52","54"],
    colors: [{ name: "Carnelian", hex: "#b1462f", palette: "oxblood" }, { name: "Rose Gold", hex: "#e0a4a9", palette: "rose" }],
    rating: 4.4, reviews: 118, stock: 19, badges: [], tags: ["carnelian","bezel","rose","oval"] },

  { id: "aur-115", name: "Attic Hoop", cat: "jewellery", sub: "Rings", price: 96400,
    shape: "ring", palette: "gold", year: 2026, edition: "Open series",
    materials: "18k yellow gold, drawn rod, butt-jointed and planished",
    blurb: "A plain gold hoop of even round section, without bezel, stone or visible seam.",
    story: "The section never changes: 3.1mm round, the whole way round. Yusuf Demir bends it from drawn rod, butt-joints it and then planishes the joint until it cannot be found, which he proves with a loupe and a drop of ferric chloride. The acid darkens solder and leaves gold alone. If the joint shows, the ring goes back into the crucible, and roughly one in six does.",
    details: [
      { k: "Metal", v: "18k yellow gold, 4.2g" },
      { k: "Section", v: "3.1mm round, constant" },
      { k: "Joint", v: "Butt-jointed, planished, acid-tested" },
      { k: "Finish", v: "Planished, lightly matte" },
      { k: "Hallmark", v: "Geneva assay, maison punch" }
    ],
    care: "Nothing to maintain. Re-planishing is complimentary for the life of the ring.",
    sizes: ["44","46","48","50","52","54","56","58","60","62"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "White Gold", hex: "#c3cbd6", palette: "platinum" }],
    rating: 4.3, reviews: 47, stock: 34, badges: ["New"], tags: ["hoop","plain","gold","band"] },

  { id: "aur-116", name: "Chalcedon Blue", cat: "jewellery", sub: "Rings", price: 372600,
    shape: "ring", palette: "lapis", year: 2023, edition: "Numbered to 30",
    materials: "Roman nicolo onyx, 18k yellow gold collet, oxidised silver liner",
    blurb: "A nicolo, pale blue over black, cut so the engraving comes up dark through the upper layer.",
    story: "A nicolo is sliced so a bluish film sits over a black base, and the engraver cuts through the film until the design reads black on grey. This stone is 2.2mm thick and only 0.3mm of that is blue, which is why the head in the intaglio has no hair: the cutter reached the black layer and stopped. Ferrand lined the collet with oxidised silver so the base colour carries on beneath the stone instead of gold glowing up into it.",
    details: [
      { k: "Stone", v: "Nicolo onyx, 11.4 x 8.6mm, 2.2mm thick" },
      { k: "Upper layer", v: "0.3mm blue-grey over black" },
      { k: "Subject", v: "Male head in profile, unhaired" },
      { k: "Mount", v: "18k yellow gold collet, 8.2g" },
      { k: "Liner", v: "Oxidised silver, closed back" }
    ],
    care: "The blue layer is three tenths of a millimetre thick and will not survive re-polishing. Clean with a cloth only.",
    sizes: ["52","54","56"],
    colors: [{ name: "Nicolo Blue", hex: "#6a7c94", palette: "lapis" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.8, reviews: 22, stock: 3, badges: ["Last Pieces"], tags: ["nicolo","onyx","intaglio","blue"] },

  { id: "aur-117", name: "Legionary Seal", cat: "jewellery", sub: "Rings", price: 428900,
    shape: "ring", palette: "lapis", year: 2022, edition: "Numbered to 55",
    materials: "Roman nicolo onyx, 18k yellow gold, thickened shoulders",
    blurb: "A nicolo seal in a heavy gold ring, the shank thickened at the shoulders to carry the stone.",
    story: "Our archivist Klara Wenner traced the section to a ring recovered on the Rhine limes, where the surviving soldiers' rings are always heavy at the shoulder because a light shank bends under a seal. We hold 2.4mm at the back of the finger and 5.8mm where the metal meets the collet. The intaglio is a standing Mars with the spear crossing to the wrong side, which is what happens when an engraver copies from a wax impression instead of the stone.",
    details: [
      { k: "Stone", v: "Nicolo onyx, 12.0 x 9.1mm" },
      { k: "Subject", v: "Standing Mars, image reversed" },
      { k: "Mount", v: "18k yellow gold, 14.8g" },
      { k: "Shank", v: "2.4mm at rear, 5.8mm at shoulder" },
      { k: "Back", v: "Closed and hand-chased" }
    ],
    care: "A heavy shank takes knocks well; the stone does not. Remove it for manual work.",
    sizes: ["54","56","58","60","62"],
    colors: [{ name: "Nicolo Blue", hex: "#6a7c94", palette: "lapis" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.9, reviews: 66, stock: 9, badges: ["Icon"], tags: ["nicolo","signet","roman","mars"] },

  { id: "aur-118", name: "Ravenna Nicolo", cat: "jewellery", sub: "Rings", price: 356200,
    shape: "ring", palette: "obsidian", year: 2020, edition: "One of 6",
    materials: "Roman nicolo onyx, 18k yellow gold, 0.8mm bezel",
    blurb: "A small nicolo in a narrow gold bezel, made as a day ring rather than a seal.",
    story: "Helene Barraud bought a parcel of thirty-nine nicolos in Ravenna in 2018, and six of them measure under 9mm on the long axis. Stones this small were everyday rings in the provinces; the engraving here is an ear of corn, cut in perhaps twenty minutes by someone who cut a hundred of them that month. We have not improved it. The bezel is 0.8mm of gold and nothing else, because a heavier wall makes a modest stone look like a claim.",
    details: [
      { k: "Stone", v: "Nicolo onyx, 8.7 x 6.4mm" },
      { k: "Subject", v: "Ear of corn, provincial cutting" },
      { k: "Mount", v: "18k yellow gold, 5.9g" },
      { k: "Bezel wall", v: "0.8mm, no shoulder build" },
      { k: "Parcel", v: "Ravenna, 2018; six stones at this size" }
    ],
    care: "Wear it daily. The bezel is thin, so have the seat checked at any boutique once a year.",
    sizes: ["46","48","50","52","54"],
    colors: [{ name: "Onyx Black", hex: "#23262b", palette: "obsidian" }, { name: "Nicolo Blue", hex: "#6a7c94", palette: "lapis" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.6, reviews: 15, stock: 4, badges: ["Rare"], tags: ["nicolo","onyx","ravenna","ring"] },

  { id: "aur-119", name: "Pomponia Signet", cat: "jewellery", sub: "Rings", price: 1274500,
    shape: "ring", palette: "lapis", year: 2021, edition: "One of 1",
    materials: "Roman nicolo onyx, 18k yellow gold, raised collet",
    blurb: "A tall-set nicolo signet, the collet raised so the stone clears the knuckle as the hand turns.",
    story: "Named for the letters cut on the reverse of the collet, POMPONIA, 0.9mm high and added long after the stone itself was engraved. Ferrand found them under the loupe when the old mount was stripped, and we left them where they were instead of polishing the gold flat. The stone stands 2.9mm above the shank, high for a nicolo, so the ring has to be turned into the palm to seal. It is the only ring we sell with somebody else's name inside it.",
    details: [
      { k: "Stone", v: "Nicolo onyx, 13.8 x 10.5mm" },
      { k: "Subject", v: "Fortuna with rudder" },
      { k: "Inscription", v: "POMPONIA, 0.9mm letters, reverse of collet" },
      { k: "Mount", v: "18k yellow gold, 16.3g" },
      { k: "Stand height", v: "2.9mm above the shank" }
    ],
    care: "The inscription inside the collet is never to be polished. It is noted on the file card and on the ring itself.",
    sizes: ["54"],
    colors: [{ name: "Nicolo Blue", hex: "#6a7c94", palette: "lapis" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 5, reviews: 4, stock: 0, badges: ["Rare","Numbered"], tags: ["nicolo","signet","fortuna","roman"] },

  { id: "aur-120", name: "Argive Collar", cat: "jewellery", sub: "Rings", price: 196300,
    shape: "ring", palette: "platinum", year: 2024, edition: "Numbered to 70",
    materials: "Sterling silver shank, 18k gold collar, 1.85ct carnelian",
    blurb: "A carnelian ring stone collared in gold and let into a silver shank.",
    story: "Greek workshops collared a stone in gold and then set the collar into silver, because gold holds a burnish against skin and silver did not have to be paid for twice. Marceline works it the same way: a 0.5mm gold collar rolled around the carnelian, then pressed into a silver seat cut 0.1mm undersize, so the fit is friction before it is ever solder. Nothing joins the two metals but that pressure and a single spot of hard solder at six o'clock.",
    details: [
      { k: "Shank", v: "Sterling silver, 8.1g" },
      { k: "Collar", v: "18k gold, 0.5mm, rolled by hand" },
      { k: "Stone", v: "Carnelian, 1.85ct, flat table" },
      { k: "Seat", v: "Cut 0.1mm undersize, friction fit" },
      { k: "Solder", v: "One hard spot at six o'clock" }
    ],
    care: "The friction fit is deliberate. If the collar lifts at all, stop wearing it and return the ring to us.",
    sizes: ["48","50","52","54","56"],
    colors: [{ name: "Silver", hex: "#c9ccd1", palette: "platinum" }, { name: "Carnelian", hex: "#b1462f", palette: "oxblood" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.5, reviews: 53, stock: 2, badges: ["Last Pieces"], tags: ["carnelian","silver","collar","greek"] },

  { id: "aur-121", name: "Pella Bezel", cat: "jewellery", sub: "Rings", price: 214800,
    shape: "ring", palette: "oxblood", year: 2025, edition: "Numbered to 12",
    materials: "Sterling silver shank with flat interior, 18k gold collar, 2.10ct carnelian",
    blurb: "The same gold-collared carnelian on a wider silver shank, filed flat inside so the ring will not spin.",
    story: "A variant made for hands whose knuckle is wider than the finger: the inside face of the shank is filed flat across 1.6mm and the ring stops turning. The carnelian comes from the base of the same 2019 nodule that gave us the Thera stones, where the colour goes brown, and we held back the darkest twelve for this ring because a wide silver shank swallows a pale stone. Marceline cuts the flat by hand and checks it against a steel rule held up to the window.",
    details: [
      { k: "Shank", v: "Sterling silver, 10.4g, flat interior face" },
      { k: "Flat", v: "1.6mm across, filed by hand" },
      { k: "Collar", v: "18k gold, 0.5mm, rolled" },
      { k: "Stone", v: "Carnelian, 2.10ct, dark base cut" },
      { k: "Series", v: "Twelve darkest stones of the 2019 nodule" }
    ],
    care: "The flat inside face wears bright against skin. Do not let an outside jeweller round it off.",
    sizes: ["50","52","54","56","58","60"],
    colors: [{ name: "Dark Carnelian", hex: "#8c3a24", palette: "oxblood" }, { name: "Silver", hex: "#c9ccd1", palette: "platinum" }],
    rating: 4.7, reviews: 31, stock: 0, badges: ["Rare"], tags: ["carnelian","silver","shank","dark"] },

  /* ---- HOROLOGY ---- */
  { id: "aur-204", name: "Balancier 17", cat: "horology", sub: "Wristwatches", price: 486200,
    shape: "watch", palette: "platinum", year: 2024, edition: "Numbered to 60",
    materials: "36mm steel case, 17-jewel hand-wound calibre, screwed Glucydur balance",
    blurb: "A hand-wound wristwatch built around a screwed alloy balance you can watch turning through the back.",
    story: "The balance is the only part of this watch AURELIS does not make. Sixty blanks were bought in 1954 from a Bienne turner named Robert Fallet, never used, and found again in 2019 in a drawer of the Geneva timing room. Each has been poised by hand on the same Levin tool, four hours a wheel, and the timing screws are the original brass rather than gold because that is what Fallet supplied. The ebauche these descend from ran at twenty seconds a day; regulated properly, this one holds four. When the sixty are gone the reference ends.",
    details: [
      { k: "Case", v: "36mm steel, 9.1mm, sapphire back" },
      { k: "Movement", v: "AU-17 hand-wound, 17 jewels, 18,000 vph" },
      { k: "Balance", v: "Glucydur, screwed, poised by hand" },
      { k: "Reserve", v: "46 hours, single barrel" },
      { k: "Rate", v: "Within 4 seconds per day, three positions" }
    ],
    care: "Wind once each day at the same hour. Do not open the caseback to admire the balance; the gasket is single use.",
    sizes: ["16cm","17cm","18cm","19cm"],
    colors: [{ name: "Steel", hex: "#c3cbd6", palette: "platinum" }, { name: "Brass Screw", hex: "#c9a227", palette: "gold" }],
    rating: 4.8, reviews: 61, stock: 3, badges: ["Atelier","Numbered"], tags: ["watch","balance","steel","handwound"] },

  { id: "aur-205", name: "Clerkenwell Three-Quarter", cat: "horology", sub: "Pocket Watches", price: 742000,
    shape: "watch", palette: "gold", year: 2021, edition: "One of 40",
    materials: "48mm 18k gold case, English three-quarter plate movement, pierced balance cock",
    blurb: "An English three-quarter plate pocket watch finished to drawings that predate the house by fifty years.",
    story: "The movement is English, not Swiss. In 1974 AURELIS bought forty unfinished three-quarter plate ebauches from the estate of a Clerkenwell finisher, still folded in tissue, and shelved them because nobody in Geneva then wanted an English watch. Delphine Amsler opened the first parcel in 2019 and finished it to the original 1860s drawings, including the pierced balance cock, which takes eleven days with a graver and cannot be milled without losing the undercut. Thirty-nine parcels remain, and she will not be hurried.",
    details: [
      { k: "Calibre", v: "English three-quarter plate, 15 jewels" },
      { k: "Escapement", v: "English lever, jewelled pallets" },
      { k: "Balance cock", v: "Pierced and engraved by hand, 11 days" },
      { k: "Case", v: "48mm 18k yellow gold, hinged open face" },
      { k: "Dial", v: "Fired enamel, Roman numerals, sunk seconds" }
    ],
    care: "Wind gently to the stop. Service at five years, with a watchmaker who knows English lever work.",
    sizes: ["Chain 30cm","Chain 36cm"],
    colors: [{ name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }, { name: "Frosted Silver", hex: "#dfe3e8", palette: "platinum" }],
    rating: 4.9, reviews: 31, stock: 4, badges: ["Rare","Numbered"], tags: ["pocket","english","gold","engraved"] },

  { id: "aur-206", name: "Registre Douze", cat: "horology", sub: "Wristwatches", price: 1345000,
    shape: "watch", palette: "obsidian", year: 2022, edition: "Numbered to 88",
    materials: "40mm steel case, gilt cam-switched chronograph, thirty-minute and twelve-hour registers",
    blurb: "A chronograph with a thirty-minute and a twelve-hour counter, and a reason for the second one.",
    story: "The twelve-hour counter was not a marketing decision. AURELIS fires its enamel dials in a kiln whose full cycle runs eleven hours and forty minutes, and for thirty years the workshop timed it with a wall clock and a chalk mark on the door frame. Pierre-Yves Lacombe, who ran the kiln until he retired in 2019, asked for a chronograph that would carry the whole cycle on one hand rather than two. The hour register is graduated to twelve for him, and the small red index at eleven forty is printed on every dial in the run.",
    details: [
      { k: "Case", v: "40mm steel, 13.2mm, sapphire back" },
      { k: "Movement", v: "AU-31 cam-switched chronograph, 18 jewels" },
      { k: "Counters", v: "30-minute and 12-hour, red index at 11:40" },
      { k: "Reserve", v: "48 hours" },
      { k: "Finish", v: "Gilt bridges, Geneva stripes" }
    ],
    care: "Reset before restarting. Do not run the chronograph beyond a full twelve-hour cycle.",
    sizes: ["17cm","18cm","19cm","20cm"],
    colors: [{ name: "Gilt", hex: "#c8a659", palette: "gold" }, { name: "Slate", hex: "#4a4f57", palette: "noir" }],
    rating: 4.7, reviews: 134, stock: 6, badges: ["Icon"], tags: ["watch","chronograph","gilt","kiln"] },

  { id: "aur-207", name: "Signal Grade 21", cat: "horology", sub: "Pocket Watches", price: 918400,
    shape: "watch", palette: "gold", year: 2023, edition: "Open series",
    materials: "52mm gold-filled case, 21-jewel lever-set movement, swan-neck regulation",
    blurb: "A twenty-one jewel railroad-grade watch, lever set, sold with the twelve weekly rates that certified it.",
    story: "Railroad service allowed a watch thirty seconds a week either way, and the rate was written by an inspector onto a card the man carried in his coat. AURELIS kept the card. Each of these leaves Geneva with twelve consecutive weekly rates taken by Ruth Baumgartner in the timing room, written in ink on linen stock and signed, not printed, and if a piece misses in week nine it goes back to the bench and starts again at week one. The case is gold-filled to the old twenty-year guarantee, and the house sees no reason to claim more than the railroads did.",
    details: [
      { k: "Movement", v: "21 jewels, lever set, adjusted to five positions" },
      { k: "Case", v: "Gold-filled, 20-year guarantee, 52mm" },
      { k: "Rate", v: "Within 30 seconds per week, certified" },
      { k: "Dial", v: "White enamel, bold Arabic, seconds at six" },
      { k: "Regulation", v: "Micrometric swan-neck" }
    ],
    care: "Return the rate card with the watch at every service so the record continues unbroken.",
    sizes: ["Chain 32cm","Chain 38cm"],
    colors: [{ name: "Gold Filled", hex: "#d0b070", palette: "gold" }, { name: "Enamel White", hex: "#f2f5f8", palette: "ivory" }],
    rating: 4.6, reviews: 97, stock: 11, badges: [], tags: ["pocket","railroad","enamel","lever"] },

  { id: "aur-208", name: "Brevet Anonyme", cat: "horology", sub: "Pocket Watches", price: 342800,
    shape: "watch", palette: "platinum", year: 2020, edition: "Open series",
    materials: "46mm nickel silver case, pin-set movement, no maker signature",
    blurb: "An unsigned pin-set pocket watch carrying one mark, and that mark is a patent stamp.",
    story: "The plate bears a single line: Brevete S.G.D.G., the French stamp that recorded a patent and guaranteed nothing about it. The workshop in Besancon that cut these plates never struck its own name into one, and when AURELIS bought the tooling and the last of the plate stock in 2016 the family who sold it asked that the practice hold. So the watch is unsigned, and will stay so. Setting is by the small pin at four, pressed with a fingernail while the crown is turned, which is slower than a crown alone and stops you doing it absently.",
    details: [
      { k: "Movement", v: "Pin-set, 11 jewels, nickel plates" },
      { k: "Marking", v: "Brevete S.G.D.G. only, unsigned" },
      { k: "Case", v: "46mm nickel silver, snap back" },
      { k: "Setting", v: "Push pin at four, crown winds only" },
      { k: "Rate", v: "Within 45 seconds per day, two positions" }
    ],
    care: "Set with a fingernail, never a tool. A pin bent at the shoulder cannot be straightened.",
    sizes: [],
    colors: [{ name: "Nickel", hex: "#b9bec4", palette: "platinum" }],
    rating: 4.3, reviews: 22, stock: 0, badges: [], tags: ["pocket","unsigned","nickel","pinset"] },

  { id: "aur-209", name: "Bascule 18", cat: "horology", sub: "Pocket Watches", price: 512700,
    shape: "watch", palette: "ivory", year: 2021, edition: "Numbered to 150",
    materials: "52mm eighteen-size case, 15-jewel movement on a front hinge, double sunk enamel dial",
    blurb: "An eighteen-size open face whose movement tips out through the front on a hinge.",
    story: "A swing-out case opens forward: lift the bezel and the whole movement tilts out on its hinge, which is how a country jeweller in 1903 could service a watch in eight minutes with the owner still standing at the counter. AURELIS kept the arrangement and cut the bezel thread left-handed, so a watchmaker meeting this case for the first time feels it fight him and stops before he forces it. Fifteen jewels, not seventeen, because the train does not need them and the house dislikes counting jewels for their own sake.",
    details: [
      { k: "Movement", v: "15 jewels, swings out on a front hinge" },
      { k: "Case", v: "52mm, 18-size, left-hand bezel thread" },
      { k: "Dial", v: "Double sunk white enamel, seconds at six" },
      { k: "Winding", v: "Pendant wind and set" },
      { k: "Rate", v: "Within 20 seconds per day" }
    ],
    care: "The bezel unscrews clockwise. If it resists, you are turning it the way you expect rather than the way it is cut.",
    sizes: ["Chain 34cm","Chain 40cm"],
    colors: [{ name: "Enamel White", hex: "#f4f1e8", palette: "ivory" }, { name: "Yellow Gold", hex: "#d8bc85", palette: "gold" }],
    rating: 4.5, reviews: 58, stock: 9, badges: ["Numbered"], tags: ["pocket","hinge","enamel","openface"] },

  { id: "aur-210", name: "Sidewinder Onze", cat: "horology", sub: "Pocket Watches", price: 358600,
    shape: "watch", palette: "oxblood", year: 2019, edition: "Open series",
    materials: "50mm red gold over brass, 11-jewel lever-set movement rehoused from a hunter case",
    blurb: "An eleven jewel movement born in a hunter case and honestly rehoused in an open one.",
    story: "Collectors call this a sidewinder and mark the price down, because the movement was made for a lid and finished its life without one. AURELIS recases deliberately: a movement that runs is worth more than a lid that matches. Georges Emonet, who does the work in the Carouge annex, stamps the inside of every replacement back with the month of transfer and his own two initials, so the watch can never pretend to be untouched. This one reads GE 04.19, and the oxblood grosgrain fob was cut from the same roll as the case lining.",
    details: [
      { k: "Movement", v: "11 jewels, grade 10, lever set" },
      { k: "Case", v: "50mm red gold over brass, open face" },
      { k: "Orientation", v: "Crown at three, dial reset for open face" },
      { k: "Marking", v: "Recase month and initials inside the back" },
      { k: "Rate", v: "Within 60 seconds per day" }
    ],
    care: "Plate over brass wears at the pendant first. Leave the wear; it is the part of the watch that has been used.",
    sizes: [],
    colors: [{ name: "Oxblood Fob", hex: "#6b2b2b", palette: "oxblood" }, { name: "Red Gold", hex: "#c98d76", palette: "rose" }],
    rating: 4.2, reviews: 41, stock: 14, badges: [], tags: ["pocket","recased","lever","fob"] },

  { id: "aur-211", name: "Ecole 218", cat: "horology", sub: "Pocket Watches", price: 297600,
    shape: "watch", palette: "noir", year: 2026, edition: "Open series",
    materials: "52mm blackened brass case, 15-jewel movement rebuilt at the apprentice bench, unsigned dial",
    blurb: "A fifteen jewel watch stripped and rebuilt by a first-year apprentice, and sold at what it cost.",
    story: "Every apprentice at the Geneva bench spends a first winter on a grade 218: fifteen jewels, no shock protection, a train simple enough that a fault has exactly one explanation. The house buys them in trays, and the apprentice strips and rebuilds the same movement until it survives fourteen days on the rack in five positions. Those that pass are cased in blackened brass and sold at cost; the rest go back in the tray for the next winter. The dial carries no signature, because the person who finished it has not yet earned the right to put a name on one.",
    details: [
      { k: "Movement", v: "15 jewels, stripped and rebuilt at the apprentice bench" },
      { k: "Case", v: "52mm blackened brass, swing-out front" },
      { k: "Trial", v: "14 days, five positions, before casing" },
      { k: "Dial", v: "Unsigned white enamel" },
      { k: "Rate", v: "Within 25 seconds per day" }
    ],
    care: "Unsigned enamel shows every mark. Wipe with a dry chamois and nothing wet.",
    sizes: [],
    colors: [{ name: "Blackened Brass", hex: "#2f2c29", palette: "noir" }, { name: "Bone Enamel", hex: "#efe9dd", palette: "ivory" }],
    rating: 4.4, reviews: 165, stock: 22, badges: ["Atelier","New"], tags: ["pocket","apprentice","enamel","swingout"] },

  { id: "aur-212", name: "Crown at Three", cat: "horology", sub: "Pocket Watches", price: 331500,
    shape: "watch", palette: "obsidian", year: 2020, edition: "One of 61",
    materials: "50mm nickel open-face case, 11-jewel grade 10 movement, rebushed and rebarrelled",
    blurb: "One of sixty-one movements revived from a lot nobody at the auction wanted.",
    story: "In March 2018 a Zurich dealer put ninety sidewinders into a single lot, because separately they were unsellable and together they were at least a weight. AURELIS bought the lot for less than the cost of ninety crystals. Each was stripped, the third wheel bushings recut where they had ovalled, and a new mainspring fitted; sixty-one ran again and twenty-nine gave up their parts to the others. The crown sits at three because someone in the 1920s decided a hunter lid was a nuisance, and the house has left that decision standing.",
    details: [
      { k: "Movement", v: "11 jewels, grade 10, pendant wind, lever set" },
      { k: "Case", v: "50mm nickel, open face, snap bezel" },
      { k: "Provenance", v: "Zurich lot of ninety, sixty-one revived" },
      { k: "Service", v: "Stripped, rebushed, new mainspring" },
      { k: "Rate", v: "Within 50 seconds per day" }
    ],
    care: "Nickel spots in humidity. Dry the case after handling in summer.",
    sizes: [],
    colors: [{ name: "Nickel Grey", hex: "#8f959c", palette: "obsidian" }],
    rating: 4.1, reviews: 74, stock: 0, badges: ["Rare"], tags: ["pocket","sidewinder","restored","nickel"] },

  { id: "aur-213", name: "Catalogue 1911", cat: "horology", sub: "Pocket Watches", price: 289400,
    shape: "watch", palette: "ivory", year: 2025, edition: "Open series",
    materials: "47mm nickel case, 7.9mm thin model, seven-jewel nickel-plate movement",
    blurb: "The plainest watch on the first sheet the house ever printed, made again to the same drawing.",
    story: "AURELIS opened in 1911 with one printed sheet and no photographs, because a photograph then cost more than several of the watches on it. Everything was drawn in line engraving by Camille Pertuis, who also cut banknote plates and charged like it. Item four was a thin nickel watch with a flat bow and nothing on the dial but numerals, meant for a man who needed the hour and no opinion about it. This is item four, worked back from the Pertuis plate down to the width of the bow, and the original engraving is printed inside the lid at its drawn size.",
    details: [
      { k: "Movement", v: "Nickel plates, 7 jewels, thin model" },
      { k: "Case", v: "47mm nickel, 7.9mm, snap back" },
      { k: "Dial", v: "Printed white, Arabic numerals, flat bow" },
      { k: "Reference", v: "Item four, house sheet of 1911" },
      { k: "Rate", v: "Within 40 seconds per day" }
    ],
    care: "Nickel plates tarnish in open air. Keep the watch in its box between wearings.",
    sizes: ["Chain 30cm","Chain 34cm","Chain 40cm"],
    colors: [{ name: "Nickel", hex: "#cdd2d6", palette: "platinum" }, { name: "Ivory Print", hex: "#f3eee3", palette: "ivory" }],
    rating: 4.5, reviews: 210, stock: 33, badges: ["Icon"], tags: ["pocket","nickel","thin","archive"] },

  { id: "aur-214", name: "Vitrine No. 4", cat: "horology", sub: "Table Clocks", price: 668900,
    shape: "case", palette: "platinum", year: 2022, edition: "Numbered to 24",
    materials: "Full-plate brass and steel movement in a two-part nickelled screw case, 88mm",
    blurb: "A running full-plate movement held in a screw-together case that was built to be looked at, not opened.",
    story: "The case is not a box, it is a fitting: two nickelled halves on a fine thread, the smaller machined to grip the movement by the edge of its plate so that nothing bears on a wheel. AURELIS had twenty-four made in 1968 to show visiting buyers a movement in motion without letting them put a thumb on it. Number four stood in the Rue du Rhone window from 1968 until the refit of 1979, and the brass on the side that faced the street has gone the colour of weak tea while the shaded side stayed bright. The house will not even that out.",
    details: [
      { k: "Movement", v: "Full-plate, brass and steel, 15 jewels" },
      { k: "Case", v: "Two-part nickelled brass, screw fit, 88mm" },
      { k: "Mounting", v: "Held at the plate, wheels untouched" },
      { k: "Provenance", v: "Rue du Rhone window, 1968 to 1979" },
      { k: "Winding", v: "Lift out to wind, 36 hours" }
    ],
    care: "Do not polish the toned side back to bright. It is the record of eleven years in a window.",
    sizes: [],
    colors: [{ name: "Nickelled Brass", hex: "#b7bcc2", palette: "platinum" }, { name: "Toned Brass", hex: "#a8853f", palette: "gold" }],
    rating: 4.8, reviews: 12, stock: 1, badges: ["Rare","Last Pieces"], tags: ["clock","movement","display","brass"] },

  { id: "aur-215", name: "Counter Demonstrator", cat: "horology", sub: "Table Clocks", price: 448300,
    shape: "case", palette: "gold", year: 2024, edition: "Open series",
    materials: "Full-plate brass movement beating at 12,600 vph in a two-part metal case with a hinged aperture",
    blurb: "A movement geared to run slow enough that a customer can watch the escapement work.",
    story: "A demonstrator is not a clock, it is an argument. The balance in this one beats twelve thousand six hundred an hour instead of eighteen thousand, slow enough that somebody leaning over a counter can follow the lever unlock, the escape wheel take its step, and the balance swing back. It keeps poor time and is supposed to. Yvette Corbaz, who trained the Geneva sales floor for twenty-two years, would not let anyone serve a client until they could name every part visible through the aperture, in order, without looking up.",
    details: [
      { k: "Movement", v: "Full-plate brass and steel, slow beat" },
      { k: "Beat", v: "12,600 vph, escapement visible" },
      { k: "Case", v: "Two-part metal, hinged aperture, 84mm" },
      { k: "Accuracy", v: "Not regulated; a demonstration piece" },
      { k: "Base", v: "Felt-lined, 240g" }
    ],
    care: "Wind no more than half. A slow balance driven hard will knock against the banking pins.",
    sizes: [],
    colors: [{ name: "Brass", hex: "#b58b3c", palette: "gold" }],
    rating: 4.6, reviews: 39, stock: 7, badges: ["Atelier"], tags: ["clock","demonstrator","escapement","brass"] },

  { id: "aur-216", name: "Mouvement Nu", cat: "horology", sub: "Pocket Watches", price: 386700,
    shape: "case", palette: "gold", year: 2023, edition: "Open series",
    materials: "Finished and timed full-plate movement, uncased, with dial, hands and case screws in glassine",
    blurb: "A finished movement sold without a watch around it.",
    story: "The movement is jewelled, finished, timed and then deliberately not cased, because a certain buyer wants the mechanism and regards the case as wrapping. It arrives held in its two display halves, with the dial, hands and a numbered set of case screws in a glassine envelope, so that in fifteen or twenty years the owner can have it cased by whoever they have come to trust. AURELIS has sold movements this way since a Basel engineer named Konrad Wyss asked for one in 1979 and declined, politely and completely, to explain what he wanted it for.",
    details: [
      { k: "Movement", v: "Full-plate, 15 jewels, brass and steel" },
      { k: "State", v: "Finished and timed, left uncased" },
      { k: "Included", v: "Dial, hands and case screws in glassine" },
      { k: "Holder", v: "Two-part metal display halves, 82mm" },
      { k: "Rate", v: "Within 30 seconds per day, dial up" }
    ],
    care: "Keep the glassine envelope. Casing this movement later without its numbered screws means cutting new ones.",
    sizes: [],
    colors: [{ name: "Raw Brass", hex: "#a67c2e", palette: "gold" }, { name: "Steel Blue", hex: "#3d4653", palette: "noir" }],
    rating: 4.7, reviews: 26, stock: 4, badges: [], tags: ["movement","uncased","brass","collector"] },

  { id: "aur-217", name: "Deux Parts", cat: "horology", sub: "Table Clocks", price: 561200,
    shape: "case", palette: "ivory", year: 2021, edition: "One of 40",
    materials: "Paired two-part steel case on a 40 tpi thread, unlacquered full-plate brass movement, 96mm",
    blurb: "Two steel halves cut in one setting, numbered as a pair because no other half will fit.",
    story: "The halves are turned at the same lathe setting and stamped with a matching number, because a forty-per-inch thread will not accept a stranger: put the lid of forty onto the base of thirty-nine and it binds at a quarter turn and galls if you insist. They were cut in Vallorbe by a shop that otherwise made cases for theodolites, which is why the knurling runs straight in a surveyor pattern rather than the diamond a watch case usually gets. The movement inside is left unlacquered and will tone, unevenly, in whatever room it stands.",
    details: [
      { k: "Case", v: "Two-part steel, paired and numbered, 40 tpi" },
      { k: "Knurling", v: "Straight surveyor pattern, Vallorbe" },
      { k: "Movement", v: "Full-plate brass, unlacquered" },
      { k: "Size", v: "96mm assembled, 640g" },
      { k: "Finish", v: "No lacquer; expect toning" }
    ],
    care: "Keep the halves together. A lid from another set will bind on the thread and gall both.",
    sizes: [],
    colors: [{ name: "Bright Steel", hex: "#d5d8dc", palette: "ivory" }, { name: "Unlacquered Brass", hex: "#9d7b30", palette: "gold" }],
    rating: 4.5, reviews: 18, stock: 3, badges: ["Numbered"], tags: ["clock","case","vallorbe","brass"] },

  { id: "aur-218", name: "Chaine et Fusee", cat: "horology", sub: "Pocket Watches", price: 2118000,
    shape: "watch", palette: "gold", year: 2024, edition: "One of 12",
    materials: "54mm 18k gold pair case, verge fusee movement, 385-link hand-riveted chain",
    blurb: "A fusee movement whose chain is made by one person, by hand, in about six weeks.",
    story: "The chain is the watch. Three hundred and eighty-five links, each stamped, deburred and riveted with a pin two hundredths of a millimetre across, all of it made by Solange Perret in Sainte-Croix under a bench magnifier she has used since 1994. She finishes fourteen chains a year and AURELIS takes twelve. The fusee is the tapering cone the chain climbs as the mainspring weakens, an eighteenth-century answer to a problem a modern barrel only conceals, and the reason the rate on the second day matches the rate on the first.",
    details: [
      { k: "Movement", v: "Fusee and chain, verge escapement, gilt" },
      { k: "Chain", v: "385 links, hand riveted, six weeks of work" },
      { k: "Case", v: "54mm 18k gold pair case, hinged" },
      { k: "Cock", v: "Pierced and chased, French pattern" },
      { k: "Reserve", v: "30 hours, constant force through the fusee" }
    ],
    care: "Never let the chain go slack. If the watch stops while fully wound, do not wind further; take it to a watchmaker.",
    sizes: [],
    colors: [{ name: "Gilt Brass", hex: "#c9a44c", palette: "gold" }, { name: "Rose Case", hex: "#d3a08c", palette: "rose" }],
    rating: 5, reviews: 8, stock: 0, badges: ["Rare","Atelier"], tags: ["pocket","fusee","chain","verge"] },

  { id: "aur-219", name: "Uhrwerk Westfalen", cat: "horology", sub: "Table Clocks", price: 1867400,
    shape: "atelier", palette: "obsidian", year: 2023, edition: "One of 6",
    materials: "Turret going train on a cast iron frame, 410mm cast brass great wheel, seconds pendulum",
    blurb: "A church tower going train, taken down when the parish went electric, set on a frame for a hall.",
    story: "When a parish converts its tower to an electric drive the old movement usually goes for scrap, because it weighs a hundred and forty kilos and nobody wants that in a house. AURELIS has taken six, from four parishes in North Rhine-Westphalia, and mounted them on cast frames for halls and stairwells where the pendulum has the drop it needs. The great wheel is four hundred and ten millimetres across. The going train is wound by crank, eighty-four turns, once a week, and Karl-Heinz Vosskuhl, who kept the Dulmen tower for thirty-one years, taught the Geneva team to count them aloud.",
    details: [
      { k: "Movement", v: "Turret going train, iron frame, brass wheels" },
      { k: "Great wheel", v: "410mm diameter, cast brass" },
      { k: "Winding", v: "Crank, 84 turns, weekly" },
      { k: "Mass", v: "140kg on a cast frame" },
      { k: "Escapement", v: "Recoil anchor, seconds pendulum" }
    ],
    care: "Wind on the same day each week. A turret train left run down for a month needs its pivots re-oiled before restarting.",
    sizes: [],
    colors: [{ name: "Iron Black", hex: "#22242a", palette: "obsidian" }, { name: "Brass Wheel", hex: "#9c7c37", palette: "gold" }],
    rating: 4.9, reviews: 5, stock: 1, badges: ["Rare"], tags: ["clock","turret","iron","pendulum"] },

  { id: "aur-220", name: "Rack and Snail", cat: "horology", sub: "Table Clocks", price: 1392500,
    shape: "atelier", palette: "noir", year: 2025, edition: "Numbered to 9",
    materials: "Tower striking train on a painted iron frame, twelve-step snail cam, coiled steel gong",
    blurb: "The striking half of a tower movement, fitted with a gong because a house cannot hang a bell.",
    story: "This is the striking train and it arrives without a bell. The tower it served hung nine hundred kilos of bronze pitched at E flat; no floor in a private house will take that, so AURELIS fits a coiled steel gong tuned to the same note by Ines Haldemann, who tunes the house table clocks by ear and refuses to have a meter in the room. The rack falls onto a snail cut in twelve steps, so the count is mechanical rather than electronic: stop the movement at ten past three, start it a year later, and it still strikes three.",
    details: [
      { k: "Train", v: "Striking train, rack and snail, twelve steps" },
      { k: "Gong", v: "Coiled steel, tuned to E flat by ear" },
      { k: "Frame", v: "Painted iron, 62 by 48cm" },
      { k: "Strike", v: "Quarter and hour, silenceable" },
      { k: "Mass", v: "96kg with gong stand" }
    ],
    care: "Engage the silencing lever before the frame is moved. A free gong will ring against the ironwork and flatten.",
    sizes: [],
    colors: [{ name: "Painted Iron", hex: "#1f2124", palette: "noir" }, { name: "Steel Gong", hex: "#9aa3ab", palette: "platinum" }],
    rating: 4.8, reviews: 9, stock: 2, badges: ["Atelier","New"], tags: ["clock","striking","gong","iron"] }
];

export const PRODUCTS = RAW_PRODUCTS.map((p) => ({
  ...p,
  colors: p.colors || [],
  sizes: p.sizes || [],
  badges: p.badges || [],
  tags: p.tags || [],
  was: (p.badges || []).includes('Icon') ? Math.round(p.price * 1.18) : null
}));

export const STORES = [
  { id: 'gva', name: 'Geneva &mdash; Rue du Rhone', city: 'Geneva', country: 'Switzerland',
    address: ['14 Rue du Rhone', '1204 Geneva', 'Switzerland'], phone: '+41 22 501 88 00',
    x: 52, y: 40, flagship: true, opens: '10:00', closes: '19:00',
    services: ['Atelier &amp; Repairs', 'Private Salon', 'Watchmaker On Site', 'Engraving', 'Perfume Bar'],
    note: 'The founding house. The workshop on the third floor has been in continuous use since 1911.',
    hours: [['Monday', '10:00 &ndash; 19:00'], ['Tuesday', '10:00 &ndash; 19:00'], ['Wednesday', '10:00 &ndash; 19:00'], ['Thursday', '10:00 &ndash; 20:00'], ['Friday', '10:00 &ndash; 20:00'], ['Saturday', '10:00 &ndash; 18:00'], ['Sunday', 'By appointment']] },
  { id: 'par', name: 'Paris &mdash; Place Vendome', city: 'Paris', country: 'France',
    address: ['9 Place Vendome', '75001 Paris', 'France'], phone: '+33 1 42 60 55 12',
    x: 44, y: 36, flagship: true, opens: '10:30', closes: '19:00',
    services: ['Private Salon', 'Engraving', 'Perfume Bar', 'Bespoke Commissions'],
    note: 'Our perfume library sits behind the salon; all 214 formulae in the archive can be sampled here.',
    hours: [['Monday', 'Closed'], ['Tuesday', '10:30 &ndash; 19:00'], ['Wednesday', '10:30 &ndash; 19:00'], ['Thursday', '10:30 &ndash; 19:00'], ['Friday', '10:30 &ndash; 19:30'], ['Saturday', '10:30 &ndash; 19:30'], ['Sunday', 'Closed']] },
  { id: 'lon', name: 'London &mdash; Mount Street', city: 'London', country: 'United Kingdom',
    address: ['52 Mount Street', 'Mayfair, London W1K', 'United Kingdom'], phone: '+44 20 7499 3300',
    x: 40, y: 30, flagship: false, opens: '10:00', closes: '18:30',
    services: ['Atelier &amp; Repairs', 'Engraving', 'Private Salon'],
    note: 'Leather goods are finished on site; monogramming takes under an hour.',
    hours: [['Monday', '10:00 &ndash; 18:30'], ['Tuesday', '10:00 &ndash; 18:30'], ['Wednesday', '10:00 &ndash; 18:30'], ['Thursday', '10:00 &ndash; 19:00'], ['Friday', '10:00 &ndash; 19:00'], ['Saturday', '11:00 &ndash; 18:00'], ['Sunday', 'Closed']] },
  { id: 'nyc', name: 'New York &mdash; Madison Avenue', city: 'New York', country: 'United States',
    address: ['744 Madison Avenue', 'New York, NY 10065', 'United States'], phone: '+1 212 555 0188',
    x: 24, y: 42, flagship: true, opens: '10:00', closes: '19:00',
    services: ['Private Salon', 'Watchmaker On Site', 'Perfume Bar', 'Engraving'],
    note: 'Two private salons on the mezzanine, bookable for evening appointments.',
    hours: [['Monday', '10:00 &ndash; 19:00'], ['Tuesday', '10:00 &ndash; 19:00'], ['Wednesday', '10:00 &ndash; 19:00'], ['Thursday', '10:00 &ndash; 20:00'], ['Friday', '10:00 &ndash; 20:00'], ['Saturday', '10:00 &ndash; 19:00'], ['Sunday', '12:00 &ndash; 17:00']] },
  { id: 'mil', name: 'Milan &mdash; Via Montenapoleone', city: 'Milan', country: 'Italy',
    address: ['21 Via Montenapoleone', '20121 Milano', 'Italy'], phone: '+39 02 7600 4411',
    x: 48, y: 44, flagship: false, opens: '10:00', closes: '19:00',
    services: ['Silk Atelier', 'Engraving', 'Private Salon'],
    note: 'The silk archive is held here &mdash; over 1,900 screens dating to 1946.',
    hours: [['Monday', '15:00 &ndash; 19:00'], ['Tuesday', '10:00 &ndash; 19:00'], ['Wednesday', '10:00 &ndash; 19:00'], ['Thursday', '10:00 &ndash; 19:00'], ['Friday', '10:00 &ndash; 19:00'], ['Saturday', '10:00 &ndash; 19:00'], ['Sunday', 'Closed']] },
  { id: 'tyo', name: 'Tokyo &mdash; Ginza', city: 'Tokyo', country: 'Japan',
    address: ['5-4-1 Ginza, Chuo City', 'Tokyo 104-0061', 'Japan'], phone: '+81 3 6274 6100',
    x: 82, y: 44, flagship: true, opens: '11:00', closes: '20:00',
    services: ['Watchmaker On Site', 'Private Salon', 'Perfume Bar', 'Atelier &amp; Repairs'],
    note: 'Our largest watch service centre outside Geneva.',
    hours: [['Monday', '11:00 &ndash; 20:00'], ['Tuesday', '11:00 &ndash; 20:00'], ['Wednesday', '11:00 &ndash; 20:00'], ['Thursday', '11:00 &ndash; 20:00'], ['Friday', '11:00 &ndash; 20:30'], ['Saturday', '11:00 &ndash; 20:30'], ['Sunday', '11:00 &ndash; 19:00']] },
  { id: 'dxb', name: 'Dubai &mdash; DIFC', city: 'Dubai', country: 'United Arab Emirates',
    address: ['Gate Village 8, DIFC', 'Dubai', 'United Arab Emirates'], phone: '+971 4 355 7700',
    x: 66, y: 52, flagship: false, opens: '10:00', closes: '22:00',
    services: ['Private Salon', 'Perfume Bar', 'Bespoke Commissions'],
    note: 'Open late; the perfume bar runs until closing.',
    hours: [['Monday', '10:00 &ndash; 22:00'], ['Tuesday', '10:00 &ndash; 22:00'], ['Wednesday', '10:00 &ndash; 22:00'], ['Thursday', '10:00 &ndash; 23:00'], ['Friday', '14:00 &ndash; 23:00'], ['Saturday', '10:00 &ndash; 23:00'], ['Sunday', '10:00 &ndash; 22:00']] },
  { id: 'sin', name: 'Singapore &mdash; Orchard', city: 'Singapore', country: 'Singapore',
    address: ['2 Orchard Turn', 'Singapore 238801', 'Singapore'], phone: '+65 6735 2200',
    x: 76, y: 60, flagship: false, opens: '11:00', closes: '21:00',
    services: ['Private Salon', 'Engraving', 'Atelier &amp; Repairs'],
    note: 'Climate-controlled leather vault for long-term storage of client pieces.',
    hours: [['Monday', '11:00 &ndash; 21:00'], ['Tuesday', '11:00 &ndash; 21:00'], ['Wednesday', '11:00 &ndash; 21:00'], ['Thursday', '11:00 &ndash; 21:00'], ['Friday', '11:00 &ndash; 22:00'], ['Saturday', '11:00 &ndash; 22:00'], ['Sunday', '11:00 &ndash; 21:00']] }
];

export const JOURNAL = [
  { id: 'j1', kicker: 'The Atelier', title: 'Nine Months in a Tanning Pit',
    excerpt: 'Why we still pit-tan in Tuscany when the rest of the industry moved to chrome in 1958.',
    shape: 'bag', palette: 'amber', read: '7 min' },
  { id: 'j2', kicker: 'Craft', title: 'Seven Firings, One Dial',
    excerpt: 'Grand feu enamel fails more often than it succeeds. Our enameller explains why that is the point.',
    shape: 'watch', palette: 'platinum', read: '11 min' },
  { id: 'j3', kicker: 'The Nose', title: 'Elise Roux on Subtraction',
    excerpt: 'Three years, eleven submissions, and a perfume built by taking things away.',
    shape: 'flacon', palette: 'violet', read: '9 min' }
];

export const VALUES = [
  { no: '01', icon: 'scissors', title: 'Made by Hand, Signed by Name',
    body: 'Every object leaves our benches with the mark of the artisan who finished it. Fourteen makers, no production line, and a ledger that records who made what since 1911.' },
  { no: '02', icon: 'leaf', title: 'Materials With a Provenance',
    body: 'Recycled precious metals, pit-tanned hides, single-origin cashmere. We publish our supply chain in full and audit it twice a year. Nothing enters the house unnamed.' },
  { no: '03', icon: 'refresh', title: 'Repaired, Never Replaced',
    body: 'Every piece is serviceable for its lifetime. We hold parts for models discontinued forty years ago, and we will restore an AURELIS object regardless of who owns it now.' },
  { no: '04', icon: 'shield', title: 'A Guarantee Without an Expiry',
    body: 'Manufacturing defects are corrected for as long as the object exists. No registration, no receipt required &mdash; the hallmark is the record.' },
  { no: '05', icon: 'crown', title: 'Scarce by Design',
    body: 'We cap production at what fourteen pairs of hands can finish properly. Waiting lists are real, and we will not shorten one by lowering a standard.' },
  { no: '06', icon: 'globe', title: 'Circular From the Start',
    body: 'Refillable flacons, re-waxable leather, re-polished metal. We buy back any AURELIS piece at a fair valuation and re-home it through the Archive programme.' }
];

export const MEMBER_PERKS = [
  'First refusal on numbered editions, forty-eight hours before public release',
  'Private salon appointments in any boutique, after hours',
  'Complimentary lifetime servicing, restoration and re-polishing',
  'An annual commission credit towards a bespoke piece',
  'Direct line to a named concierge &mdash; not a queue',
  'Invitations to the Geneva atelier and the annual archive viewing'
];

export const SHIPPING_METHODS = [
  { id: 'std', name: 'Signature Delivery', eta: '3&ndash;5 business days', price: 0, note: 'Insured, signature required. Complimentary on every order.' },
  { id: 'exp', name: 'Express Courier', eta: '1&ndash;2 business days', price: 2900, note: 'Dedicated courier, full insurance, tracked hourly.' },
  { id: 'hand', name: 'Hand Delivery by Concierge', eta: 'Same day, selected cities', price: 9900, note: 'Presented in person by a member of the boutique team.' },
  { id: 'pick', name: 'Collect in Boutique', eta: 'Ready in 2 hours', price: 0, note: 'Reserved under your name at the boutique of your choosing.' }
];

export const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit or Debit Card', icon: 'card', note: 'Visa, Mastercard, American Express' },
  { id: 'wire', name: 'Bank Transfer', icon: 'doc', note: 'Details issued on order; items reserved for 5 days' },
  { id: 'wallet', name: 'Digital Wallet', icon: 'lock', note: 'Apple Pay, Google Pay, PayPal' },
  { id: 'split', name: 'Instalments over 12 months', icon: 'clock', note: '0% APR on orders above ₹1,65,000' }
];

export const FAQS = [
  { cat: 'Orders', q: 'How long will my order take to arrive?',
    a: 'Signature Delivery arrives in three to five business days, complimentary on every order. Express Courier arrives in one to two. Made-to-order and engraved pieces add seven to fourteen days; the product page states the lead time before you buy.' },
  { cat: 'Orders', q: 'Can I change or cancel an order?',
    a: 'Yes, until the piece enters the finishing bench. Contact your concierge or write to us within twelve hours and we will hold it. Once engraved or resized, a piece becomes final sale.' },
  { cat: 'Returns', q: 'What is the return window?',
    a: 'Thirty days from delivery, unworn and in its original packaging, with the hallmark tag attached. Returns are collected from you at no cost. Engraved, resized and bespoke pieces are excluded.' },
  { cat: 'Returns', q: 'Do you offer exchanges?',
    a: 'Yes, including size exchanges on rings and eyewear. The first exchange on any order is complimentary and we ship the replacement before the original reaches us.' },
  { cat: 'Care', q: 'What does the lifetime guarantee cover?',
    a: 'Manufacturing and material defects, for as long as the object exists, regardless of who owns it. It does not cover accidental damage, though we will always quote a repair.' },
  { cat: 'Care', q: 'How often should a watch be serviced?',
    a: 'Every seven years for mechanical calibres, or sooner if the reserve falls noticeably. Servicing is complimentary for Cercle members.' },
  { cat: 'Sizing', q: 'How do I find my ring size?',
    a: 'Request a complimentary sizing set and we will post it within a day. Any boutique will also size you in person, and the first resize on any ring is free.' },
  { cat: 'Membership', q: 'How does Le Cercle work?',
    a: 'Membership is by application and is capped. Members receive first refusal on numbered editions, lifetime servicing, private salon access and a named concierge. There is no fee.' },
  { cat: 'Payment', q: 'Can I pay in instalments?',
    a: 'Yes, over twelve months at 0% on orders above ₹1,65,000. The option appears at checkout and involves a soft credit check only.' },
  { cat: 'Payment', q: 'Is my payment information stored?',
    a: 'Card details are tokenised by our payment processor. We never hold a full card number, and stored cards can be removed at any time from Payment Settings.' }
];

export const LEGAL_SECTIONS = [
  { id: 'terms', title: 'Terms of Sale', body: [
    'These terms govern every purchase made from AURELIS through this site, by telephone, or in any of our boutiques. By placing an order you accept them. We may revise them; the version in force is the one published on the date of your order.',
    'Prices are shown in Indian Rupees and include GST at the standard rate of 18%. For delivery within India, all duties on import are settled by us before the piece is dispatched to you. For delivery outside India, local duties are assessed on arrival and are the responsibility of the recipient.',
    'An order becomes binding when we issue a confirmation number, not when payment is authorised. If a piece proves unavailable after confirmation &mdash; which happens occasionally with numbered editions &mdash; we will contact you within one business day and refund in full.'
  ] },
  { id: 'returns', title: 'Returns &amp; Refunds', body: [
    'You may return any piece within thirty days of delivery, provided it is unworn, complete, and carries its hallmark tag. Collection is arranged and paid for by us.',
    'Engraved, resized, monogrammed and bespoke pieces are final sale. Perfume may be returned only if the seal is unbroken, for reasons of hygiene and applicable law.',
    'Refunds are issued to the original payment method within five business days of the piece reaching our returns atelier and passing inspection.'
  ] },
  { id: 'privacy', title: 'Privacy Policy', body: [
    'We collect what we need to sell you an object and support it afterwards: your name, contact details, delivery addresses, order history and the pieces you have saved. We do not sell personal data, and we do not share it with advertising networks.',
    'Payment card details are tokenised by our payment processor and never stored on our systems. We retain the last four digits and expiry only, so that you can recognise a stored card.',
    'You may request a copy of everything we hold, ask for it to be corrected, or ask for it to be erased, by writing to the address in Help &amp; Contact. We respond within thirty days.'
  ] },
  { id: 'cookies', title: 'Cookies', body: [
    'We use strictly necessary cookies to keep your bag and session working. These cannot be disabled without breaking the site.',
    'Analytics cookies are optional and are off until you consent. They tell us which pages are read and where people abandon a checkout. They do not identify you individually.',
    'We do not run third-party advertising cookies on this site.'
  ] },
  { id: 'ip', title: 'Intellectual Property', body: [
    'The AURELIS name, the maison punch, all product designs, photographs, silk prints and written material on this site are our property or licensed to us. The silk archive in particular is protected design.',
    'You may not reproduce, resell or use any of it commercially without written permission. Personal, non-commercial reference is fine.'
  ] },
  { id: 'law', title: 'Governing Law', body: [
    'These terms are governed by the law of Switzerland. Disputes fall to the courts of Geneva, without prejudice to any mandatory consumer protection you enjoy where you live.',
    'If any clause is found unenforceable, the rest stands.'
  ] }
];

export const PROMOS = {
  CERCLE10: { label: 'Cercle Welcome', type: 'pct', value: 10, min: 0 },
  ATELIER20K: { label: 'Atelier Credit', type: 'flat', value: 20000, min: 165000 }
};

export const SEED_ADDRESSES = [
  { id: 'a1', label: 'Residence', first: 'Alexandra', last: 'Sorensen', line1: '18 Cheyne Walk',
    line2: 'Chelsea', city: 'London', region: 'Greater London', post: 'SW3 5RA',
    country: 'United Kingdom', phone: '+44 7700 900118', isDefault: true },
  { id: 'a2', label: 'Studio', first: 'Alexandra', last: 'Sorensen', line1: '4 Rue de Turenne',
    line2: 'Atelier 3', city: 'Paris', region: 'Ile-de-France', post: '75003',
    country: 'France', phone: '+33 6 12 34 56 78', isDefault: false }
];

export const SEED_CARDS = [
  { id: 'c1', brand: 'Visa', last4: '4242', exp: '08 / 29', name: 'A SORENSEN', isDefault: true },
  { id: 'c2', brand: 'American Express', last4: '1005', exp: '11 / 27', name: 'A SORENSEN', isDefault: false }
];

export const SEED_ORDERS = [
  { id: 'AUR-4471902', date: '2026-06-14', status: 'Delivered', stage: 4,
    items: [{ id: 'aur-201', qty: 1, variant: 'Enamel White', size: null },
            { id: 'aur-502', qty: 2, variant: null, size: '380g' }],
    addressId: 'a1', method: 'exp', payment: 'Visa 4242', tracking: 'AUR-EX-88213904',
    totals: { subtotal: 1592500, discount: 0, shipping: 2900, tax: 286650, total: 1882050, count: 3 } },
  { id: 'AUR-4468118', date: '2026-04-02', status: 'Delivered', stage: 4,
    items: [{ id: 'aur-601', qty: 1, variant: 'Bleu Astral', size: null }],
    addressId: 'a1', method: 'std', payment: 'Visa 4242', tracking: 'AUR-SD-77104522',
    totals: { subtotal: 49000, discount: 0, shipping: 0, tax: 8820, total: 57820, count: 1 } },
  { id: 'AUR-4459930', date: '2026-01-19', status: 'In Transit', stage: 3,
    items: [{ id: 'aur-401', qty: 1, variant: 'Cognac', size: null },
            { id: 'aur-403', qty: 1, variant: 'Noir', size: null }],
    addressId: 'a2', method: 'hand', payment: 'Amex 1005', tracking: 'AUR-HD-51229087',
    totals: { subtotal: 354000, discount: 0, shipping: 9900, tax: 63720, total: 427620, count: 2 } }
];

/* ---------------- query helpers ---------------- */
export function productById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

export function categoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export function relatedTo(product, n = 4) {
  const score = (p) =>
    (p.cat === product.cat ? 10 : 0) + p.tags.filter((t) => product.tags.includes(t)).length;
  return PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

const stripEntities = (s) => String(s || '').replace(/&[a-z]+;/g, ' ').toLowerCase();

export function searchProducts(q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const terms = query.split(/\s+/);
  return PRODUCTS.map((p) => {
    const hay = stripEntities(`${p.name} ${p.cat} ${p.sub} ${p.materials} ${p.blurb} ${p.tags.join(' ')}`);
    let s = 0;
    terms.forEach((t) => {
      if (stripEntities(p.name).includes(t)) s += 8;
      if (p.tags.includes(t)) s += 5;
      if (hay.includes(t)) s += 2;
    });
    return { p, s };
  }).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.p);
}

export function filterProducts({ cat, sub, q, min, max, sort, badges }) {
  let list = q ? searchProducts(q) : [...PRODUCTS];
  if (cat) list = list.filter((p) => p.cat === cat);
  if (sub) list = list.filter((p) => stripEntities(p.sub).trim() === stripEntities(sub).trim());
  if (min != null) list = list.filter((p) => p.price >= Number(min));
  if (max != null) list = list.filter((p) => p.price <= Number(max));
  if (badges && badges.length) list = list.filter((p) => badges.some((b) => p.badges.includes(b)));

  switch (sort) {
    case 'price-asc': list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating': list.sort((a, b) => b.rating - a.rating); break;
    case 'newest': list.sort((a, b) => b.year - a.year); break;
    default: if (!q) list.sort((a, b) => b.reviews * b.rating - a.reviews * a.rating);
  }
  return list;
}
