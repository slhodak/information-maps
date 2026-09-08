import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================================
   Atlas Drill — South American Climates
   Single file. No network, no storage, no forms, no heavy dependencies.
   Grid: Köppen–Geiger at 1/9°, majority-vote resampled, cropped to South
   American land. 65 regions across 11 collapsed zone types.
   ========================================================================== */

const GRID = { W: 420, H: 616, LON0: -81.4444444444, LAT1: 12.5000000000, PPD: 9 };
const GW = GRID.W, GH = GRID.H, PPD = GRID.PPD, LON0 = GRID.LON0, LAT1 = GRID.LAT1;

const SUMMIT = 6961;          // Aconcagua, metres
const CAMPS = [
  ["Horcones", 0], ["Confluencia", 0.18], ["Plaza de Mulas", 0.38],
  ["Plaza Canadá", 0.58], ["Nido de Cóndores", 0.72], ["Cólera", 0.86],
  ["Independencia", 0.94], ["Cumbre", 1],
];

const C = {
  page: "#12161f", panel: "#1b212e", ocean: "#0c1219", land: "#39445a",
  amber: "#e3a542", cream: "#f3e9d8", green: "#5fbf7a", red: "#e2645a",
  natl: "#7c88a3", clim: "#c8bda4", ink: "#8d97ad", rule: "#2a3244",
};

const ZONES = [
  { k: "Af", n: "Tropical rainforest", c: "#1f7a52", kop: "Af", wwf: "Amazon & Chocó moist forests", d: "Rain in every month and no dry season worth the name. It covers the Amazon core, the Chocó, and the last strips of Atlantic Forest on the Brazilian coast.",
    al: ["af", "tropical rainforest", "rainforest", "equatorial", "tropical wet", "selva", "amazon", "jungle"] },
  { k: "Am", n: "Tropical monsoon", c: "#35a06a", kop: "Am", wwf: "Napo & Tocantins moist forests", d: "A dry season exists but is short and mild, and the annual total is high enough to carry the forest through it. In South America this is the seasonal collar around the rainforest rather than a wind-driven monsoon.",
    al: ["am", "tropical monsoon", "monsoon", "monsoonal", "tropical monsoonal"] },
  { k: "Aw", n: "Tropical savanna", c: "#93a840", kop: "Aw / As", wwf: "Cerrado & Llanos", d: "Wet summer, hard dry winter, grass and fire-tolerant trees. The As variant, folded in here, is the same climate with the dry season on the other solstice — the Upper Magdalena is the clearest case.",
    al: ["aw", "as", "tropical savanna", "tropical savannah", "savanna", "savannah", "cerrado", "wet and dry tropical", "llanos"] },
  { k: "BSh", n: "Hot semi-arid", c: "#d59a4a", kop: "BSh", wwf: "Caatinga & Chaco dry forests", d: "Too dry for forest, too wet for desert, and hot all year. The Caatinga and the Gran Chaco are the two great examples, and both are thorn scrub rather than grassland.",
    al: ["bsh", "hot semi arid", "hot semiarid", "hot steppe", "caatinga", "semi arid", "semiarid", "chaco"] },
  { k: "BSk", n: "Cold semi-arid", c: "#b9a179", kop: "BSk", wwf: "Patagonian steppe", d: "The same aridity with a cold season. Almost all of it is the Patagonian rain shadow, plus the drier margins of the Bolivian Altiplano.",
    al: ["bsk", "cold semi arid", "cold semiarid", "cold steppe", "steppe", "patagonian steppe"] },
  { k: "BWh", n: "Hot desert", c: "#cf6440", kop: "BWh", wwf: "Sechura & Monte deserts", d: "True desert with a warm annual mean. On this continent it is mostly the Peruvian coast, where the desert runs to the surf line, plus the closed basins of western Argentina.",
    al: ["bwh", "hot desert", "hot arid", "sechura", "subtropical desert"] },
  { k: "BWk", n: "Cold desert", c: "#b3766b", kop: "BWk", wwf: "Atacama & Puna deserts", d: "Desert kept cool by altitude or by a cold current. The Atacama is the type case: as dry as the Sahara but sitting at about 18 °C, because the Humboldt water offshore never warms up.",
    al: ["bwk", "cold desert", "cool desert", "atacama", "high desert"] },
  { k: "Cs", n: "Mediterranean", c: "#e0c64c", kop: "Csa / Csb / Csc", wwf: "Chilean matorral", d: "Wet winters and dry summers. Central Chile is the only place in South America with this pattern and one of only five regions on Earth, which is why its plant list looks like California's.",
    al: ["cs", "mediterranean", "mediteranean", "matorral", "dry summer", "chilean matorral", "csb"] },
  { k: "Cw", n: "Dry-winter highland", c: "#5fa08c", kop: "Cwa / Cwb / Cwc", wwf: "Andean & Brazilian montane forests", d: "Temperate with rain concentrated in summer and a dry winter. In the Andes it is the inhabited altitude band — Bogotá's neighbours, the Mantaro, Cochabamba, Titicaca — and in Brazil it is the Minas highlands.",
    al: ["cw", "dry winter highland", "dry winter", "subtropical highland", "highland", "cwa", "cwb"] },
  { k: "Cf", n: "Humid subtropical", c: "#3f8fb8", kop: "Cfa / Cfb / Cfc", wwf: "Pampas & Valdivian temperate forests", d: "Temperate with rain in every month. It spans an enormous range here: the Pampas and São Paulo at one end, the Valdivian rainforest and the Strait of Magellan at the other.",
    al: ["cf", "humid subtropical", "oceanic", "temperate oceanic", "pampas", "valdivian", "subtropical", "marine west coast", "cfa", "cfb"] },
  { k: "ET", n: "Alpine tundra", c: "#cbd6e4", kop: "ET / EF", wwf: "Central Andean puna & Patagonian ice", d: "Too cold for trees. Nowhere else on Earth carries this much tropical alpine ground: the páramo and the puna together, plus the Patagonian icefields at the far end of the range.",
    al: ["et", "alpine tundra", "tundra", "alpine", "puna", "paramo", "ef", "ice cap", "polar", "high andes"] },
];

const PATCHES = [
  { i: 1, z: "Af", n: "The Catatumbo Basin", km: 16343, mk: [-72.5, 8.4444], pc: 1, isl: 0, cs: ["Venezuela", "Colombia"],
    d: "Rainforest at the southern end of Lake Maracaibo, hemmed in by three mountain ranges. Warm lake air rising into the cold Andean downdraught gives the river mouth roughly 250 nights of lightning a year." },
  { i: 2, z: "Af", n: "The Amazon Rainforest", km: 2802718, mk: [-68.0556, -0.7778], pc: 1, isl: 0, cs: ["Brazil", "Peru", "Colombia", "Venezuela", "Guyana"],
    d: "One connected object from the Peruvian foothills to the Guiana coast. Rain every month, no dry season worth the name, and about half of it recycled from the forest's own transpiration rather than the Atlantic." },
  { i: 3, z: "Af", n: "The Chocó", km: 199250, mk: [-76.5, 4.7778], pc: 1, isl: 0, cs: ["Colombia", "Ecuador"],
    d: "The wettest place on Earth outside a monsoon. Pacific air runs into the Western Cordillera and has nowhere to go but up; Quibdó and Lloró take more than eight metres of rain a year." },
  { i: 4, z: "Af", n: "Marajó and the North Channel", km: 30436, mk: [-50.3889, -1.2222], pc: 1, isl: 0, cs: ["Brazil"],
    d: "The Amazon's mouth, including an island the size of Switzerland. Tides push a bore wave upriver twice a day and salt never quite wins against the outflow." },
  { i: 5, z: "Af", n: "The Pará Coast", km: 18197, mk: [-48.1667, -1.5556], pc: 1, isl: 0, cs: ["Brazil"],
    d: "Belém and the estuary shore, where the afternoon storm is punctual enough that people set appointments by it. Rain every month, over 3,000 mm a year." },
  { i: 6, z: "Af", n: "Madre de Dios", km: 56628, mk: [-70.7222, -12.4444], pc: 1, isl: 0, cs: ["Peru"],
    d: "The southwestern Amazon, where the forest meets the Andean foot. Once or twice a winter a friaje sweeps up from Patagonia and drops the temperature to single digits, which the ecosystem is not built for." },
  { i: 7, z: "Af", n: "The Bahian Atlantic Forest", km: 46944, mk: [-39.2778, -13.4444], pc: 1, isl: 0, cs: ["Brazil"],
    d: "A strip of rainforest along the Bahia coast, cut off from Amazonia by the dry Caatinga for millions of years and full of species found nowhere else. Under a tenth of the original Mata Atlântica survives." },
  { i: 8, z: "Af", n: "The Chapare", km: 28016, mk: [-65.0556, -16.4444], pc: 1, isl: 0, cs: ["Bolivia"],
    d: "Where the Andes catch the Amazon head-on. Some stations here record six metres of rain a year, making this the wettest ground in Bolivia by a wide margin." },
  { i: 9, z: "Am", n: "The Maracaibo Lowlands", km: 13599, mk: [-73.0556, 9.2222], pc: 1, isl: 0, cs: ["Colombia", "Venezuela"],
    d: "The rim around Venezuela's great brackish lake. A short dry season separates it from the true rainforest at the Catatumbo end." },
  { i: 10, z: "Am", n: "The Guaviare and Upper Orinoco", km: 422257, mk: [-71.9444, 4.3333], pc: 1, isl: 0, cs: ["Colombia", "Venezuela"],
    d: "The Colombian and Venezuelan Amazon, where the savanna of the Llanos gives way to forest. The dry season is real but brief, and the rivers run black with tannin." },
  { i: 11, z: "Am", n: "The Lower Magdalena and Urabá", km: 40482, mk: [-74.3889, 7.3333], pc: 1, isl: 0, cs: ["Colombia"],
    d: "The Magdalena floodplain and the Gulf of Urabá, a wetland mosaic of swamp forest and seasonal marsh at the elbow where the Andes meet the Caribbean." },
  { i: 12, z: "Am", n: "The Amazon Monsoon Belt", km: 2154596, mk: [-53.8333, -3.6667], pc: 1, isl: 0, cs: ["Brazil", "Bolivia", "Peru", "Suriname", "Guyana"],
    d: "The seasonal collar around the rainforest core, from Guyana round to Rondônia. A dry season arrives but never long or hard enough to strip the canopy; this is where the forest starts negotiating with the savanna." },
  { i: 13, z: "Am", n: "The Esmeraldas Coast", km: 17746, mk: [-79.3889, 0.1111], pc: 1, isl: 0, cs: ["Ecuador"],
    d: "Ecuador's wet northern shore. The warm Panama Current keeps it soaked, and a couple of hundred kilometres south the cold Humboldt water turns it into desert." },
  { i: 14, z: "Am", n: "The Alto Paraná", km: 63778, mk: [-54.3889, -22.8889], pc: 1, isl: 0, cs: ["Brazil", "Paraguay"],
    d: "The interior Atlantic Forest of eastern Paraguay and Mato Grosso do Sul, the largest remaining block of the Bosque Atlântico. Rain is heavy year-round with a pronounced summer maximum." },
  { i: 15, z: "Aw", n: "The Llanos and the Caribbean Coast", km: 639326, mk: [-67.8333, 8.4444], pc: 3, isl: 0, cs: ["Venezuela", "Colombia"],
    d: "Venezuela's great flood-and-burn grassland plus the Caribbean shore. Half the year the Llanos are under water and half the year they crack; the cattle economy is built entirely around that switch." },
  { i: 16, z: "Aw", n: "The Upper Magdalena Valley", km: 12980, mk: [-74.9444, 4.0], pc: 1, isl: 0, cs: ["Colombia"],
    d: "A rain shadow trapped between the Central and Eastern Cordilleras. Its dry season straddles the wrong solstice, which is the technical difference between the As and Aw variants of tropical savanna." },
  { i: 17, z: "Aw", n: "The Rupununi and Roraima Savannas", km: 32526, mk: [-60.3889, 3.3333], pc: 1, isl: 0, cs: ["Brazil", "Guyana"],
    d: "Grassland stranded inside the forest, running from Guyana across to Roraima under the tepui sandstone towers. It drains to both the Amazon and the Orinoco depending on the season." },
  { i: 18, z: "Aw", n: "The Guayas Lowlands", km: 56276, mk: [-79.9444, -1.3333], pc: 1, isl: 0, cs: ["Ecuador"],
    d: "Ecuador's agricultural heartland and the last savanna before the Peruvian desert begins. In an El Niño year the rainfall can quadruple and the whole coast floods." },
  { i: 19, z: "Aw", n: "The Great Cerrado Belt", km: 4745670, mk: [-51.9444, -15.3333], pc: 1, isl: 0, cs: ["Brazil", "Bolivia", "Paraguay", "Peru"],
    d: "One connected object of nearly five million square kilometres, running from the Bolivian Beni across the Cerrado to the Atlantic in the northeast. That it is a single region and not several is the lesson: the savanna wraps the rainforest rather than bordering it." },
  { i: 20, z: "Aw", n: "The Chapada Diamantina", km: 19925, mk: [-40.6111, -11.8889], pc: 1, isl: 0, cs: ["Brazil"],
    d: "A highland island of savanna standing above the surrounding Caatinga, wet enough for waterfalls and cloud forest in the valleys. Diamond prospectors gave it the name." },
  { i: 21, z: "Aw", n: "The Apolobamba Foothills", km: 13349, mk: [-68.9444, -13.6667], pc: 1, isl: 0, cs: ["Bolivia", "Peru"],
    d: "The step between the Bolivian Yungas and the Beni plains, where the last Andean spurs flatten into flooded savanna." },
  { i: 22, z: "Aw", n: "The Alto Beni", km: 11046, mk: [-67.6111, -15.4444], pc: 1, isl: 0, cs: ["Bolivia"],
    d: "Savanna on the lower Yungas benches north of La Paz, a corridor that has moved coca, quinine and timber down out of the mountains for four centuries." },
  { i: 23, z: "Aw", n: "The Rio de Janeiro Coast", km: 65298, mk: [-42.2778, -21.7778], pc: 1, isl: 0, cs: ["Brazil"],
    d: "The Serra do Mar and the bays behind it. The mountains wring out the summer onshore flow so hard that landslides, not drought, are the recurring disaster." },
  { i: 24, z: "BSh", n: "The Guajira Peninsula", km: 11822, mk: [-71.7222, 12.0], pc: 1, isl: 0, cs: ["Colombia", "Venezuela"],
    d: "South America's northernmost point and its driest Caribbean coast. The trade winds run parallel to the shore instead of onto it, so the moisture keeps going." },
  { i: 25, z: "BSh", n: "The Paraguaná Peninsula", km: 12146, mk: [-70.0556, 11.8889], pc: 1, isl: 0, cs: ["Venezuela"],
    d: "The Venezuelan coast around Coro, dry enough to carry a genuine dune field. The Médanos de Coro sit at eleven degrees north." },
  { i: 26, z: "BSh", n: "The Tumbesian Dry Forest", km: 12362, mk: [-79.9444, -3.3333], pc: 1, isl: 0, cs: ["Peru", "Ecuador"],
    d: "Equatorial dry forest on the Peru-Ecuador border, unique on the continent: deciduous forest almost on the equator, kept dry by the cold current offshore. El Niño years turn it briefly green." },
  { i: 27, z: "BSh", n: "The Caatinga", km: 459426, mk: [-41.3889, -8.8889], pc: 1, isl: 0, cs: ["Brazil"],
    d: "The only large semi-arid region in the tropical Americas, and the one Brazilian biome found nowhere else. The thorn scrub goes leafless and grey for most of the year, then greens within days of rain." },
  { i: 28, z: "BSh", n: "The Seridó", km: 35869, mk: [-36.6111, -6.7778], pc: 1, isl: 0, cs: ["Brazil"],
    d: "The hard core of the Caatinga on the Rio Grande do Norte and Paraíba border. Crystalline bedrock holds no groundwater, so the drought here bites earlier and lasts longer than anywhere around it." },
  { i: 29, z: "BSh", n: "The Gran Chaco", km: 217949, mk: [-61.8333, -20.5556], pc: 1, isl: 0, cs: ["Bolivia", "Paraguay", "Argentina"],
    d: "A vast thorn forest across Paraguay, Bolivia and northern Argentina, and the hottest place in South America; readings above 45 C are routine. Quebracho wood is so dense it barely floats." },
  { i: 30, z: "BSh", n: "The Northern Monte", km: 144733, mk: [-65.8333, -30.1111], pc: 1, isl: 0, cs: ["Argentina"],
    d: "The semi-arid plains of La Rioja, Catamarca and San Luis, in the lee of the Sierras Pampeanas. Creosote bush country, grazed rather than farmed." },
  { i: 31, z: "BSk", n: "The Bolivian Altiplano Rim", km: 105512, mk: [-67.6111, -18.5556], pc: 1, isl: 0, cs: ["Bolivia", "Argentina"],
    d: "The valleys and puna edges around Sucre and Potosí. Cold, high and dry, and the reason Potosí could hold 160,000 people at 4,000 metres in 1600 on the back of one silver mountain." },
  { i: 32, z: "BSk", n: "The Norte Chico", km: 18309, mk: [-71.2778, -31.3333], pc: 1, isl: 0, cs: ["Chile"],
    d: "Chile's transitional zone between the Atacama and the vineyards. Rain is rare and irregular, and after an unusually wet winter the desert flowers en masse." },
  { i: 33, z: "BSk", n: "The Patagonian Steppe", km: 697601, mk: [-69.7222, -49.0], pc: 1, isl: 0, cs: ["Argentina", "Chile"],
    d: "The Andes take the Pacific westerlies apart and this is what is left on the far side: 700,000 square kilometres of wind-scoured grass and scrub on under 200 mm of rain." },
  { i: 34, z: "BWh", n: "The Sechura Desert", km: 68083, mk: [-80.3889, -5.7778], pc: 1, isl: 0, cs: ["Peru", "Ecuador"],
    d: "Northern Peru's desert coast, where the Andes come close enough to the sea to leave almost no room. Sand sheets march north-east across it on the year-round trade wind." },
  { i: 35, z: "BWh", n: "The Peruvian Coastal Desert", km: 37638, mk: [-75.9444, -14.1111], pc: 1, isl: 0, cs: ["Peru"],
    d: "Lima's desert. Under 15 mm of rain a year, yet overcast for months at a stretch: the cold Humboldt water condenses a low deck of garúa that never quite becomes rain." },
  { i: 36, z: "BWh", n: "The Arequipa Coast", km: 11576, mk: [-72.3889, -16.4444], pc: 1, isl: 0, cs: ["Peru"],
    d: "The desert between the Andean foot and the sea south of Nazca, where irrigation from Andean rivers supports agriculture in ground that gets no rain at all." },
  { i: 37, z: "BWh", n: "The Arica Coast", km: 10036, mk: [-70.6111, -17.8889], pc: 1, isl: 0, cs: ["Peru", "Chile"],
    d: "The far northern Chilean and southern Peruvian shore. Arica averages under a millimetre of rain a year, which puts it among the driest inhabited places on the planet." },
  { i: 38, z: "BWh", n: "The Bolsón de Pipanaco", km: 20824, mk: [-66.7222, -28.1111], pc: 1, isl: 0, cs: ["Argentina"],
    d: "A closed basin in Catamarca ringed by mountains, so any moisture that reaches it has already been squeezed dry. Its floor is salt flat." },
  { i: 39, z: "BWh", n: "The San Juan Desert", km: 39852, mk: [-67.9444, -32.0], pc: 1, isl: 0, cs: ["Argentina"],
    d: "The Cuyo lowlands in the deep lee of the highest Andes. Every drop of agriculture here comes from snowmelt canals, a system running since well before the Spanish arrived." },
  { i: 40, z: "BWk", n: "The Nazca Uplands", km: 21410, mk: [-73.1667, -16.0], pc: 1, isl: 0, cs: ["Peru"],
    d: "The dry terraces above the Peruvian coast. The Nazca lines have survived nearly two thousand years because the ground is windless, stoneless and essentially rainless." },
  { i: 41, z: "BWk", n: "The Atacama Desert", km: 231193, mk: [-69.2778, -23.2222], pc: 1, isl: 0, cs: ["Chile", "Peru"],
    d: "The driest non-polar desert on Earth. It is a cold desert, not a hot one: the Humboldt current holds the coast near 18 C while the ground goes decades between measurable rain." },
  { i: 42, z: "BWk", n: "The Salar de Uyuni and the Southern Altiplano", km: 59977, mk: [-67.3889, -20.5556], pc: 1, isl: 0, cs: ["Bolivia", "Chile"],
    d: "Salt flats at 3,650 metres, the largest on Earth, left behind by a lake that dried out after the last glacial. Cold, blindingly bright, and holding a large share of the world's lithium." },
  { i: 43, z: "BWk", n: "The Cuyo Piedmont", km: 88879, mk: [-68.9444, -30.3333], pc: 1, isl: 0, cs: ["Argentina"],
    d: "The high Andean apron above Mendoza and San Juan. Cold, arid and windy, cut by rivers that carry meltwater down to the vineyards below." },
  { i: 44, z: "BWk", n: "The Payunia", km: 16269, mk: [-68.3889, -38.8889], pc: 1, isl: 0, cs: ["Argentina"],
    d: "A basalt desert in southern Mendoza with one of the densest concentrations of volcanic cones anywhere. Black ground, no water, persistent wind." },
  { i: 45, z: "BWk", n: "The Valdés Coast", km: 33666, mk: [-65.2778, -42.5556], pc: 1, isl: 0, cs: ["Argentina"],
    d: "Central Patagonia's Atlantic shore. Cold desert right down to the beach, which is why the elephant seals and right whales that breed here have the place largely to themselves." },
  { i: 46, z: "BWk", n: "The Deseado Massif", km: 15030, mk: [-69.6111, -46.6667], pc: 1, isl: 0, cs: ["Argentina"],
    d: "An old ridge of Jurassic rock in Santa Cruz, dry and stony, where the petrified araucaria forests record a much wetter Patagonia." },
  { i: 47, z: "Cs", n: "The Chilean Matorral and Andean Lee", km: 323286, mk: [-71.5, -38.0], pc: 1, isl: 0, cs: ["Argentina", "Chile"],
    d: "South America's only Mediterranean climate, one of just five such regions worldwide, and the reason Chilean wine exists. Wet winters, bone-dry summers, and a long southward tail into the Andean rain shadow." },
  { i: 48, z: "Cw", n: "The Callejón de Huaylas", km: 12894, mk: [-78.2778, -7.2222], pc: 1, isl: 0, cs: ["Peru"],
    d: "The corridor between the Cordillera Blanca and the Cordillera Negra, one of the most striking valleys in the Andes and one of the most hazardous; glacial lake outburst floods have destroyed towns here twice in living memory." },
  { i: 49, z: "Cw", n: "The Mantaro Valley", km: 25937, mk: [-73.8333, -13.0], pc: 1, isl: 0, cs: ["Peru"],
    d: "The central Peruvian highlands, dry-winter country at 3,000 metres that has fed Lima for centuries. Summer rain, frosty cloudless winter nights." },
  { i: 50, z: "Cw", n: "The Lake Titicaca Basin", km: 56223, mk: [-69.5, -15.8889], pc: 1, isl: 0, cs: ["Bolivia", "Peru"],
    d: "The northern Altiplano around the highest large lake on Earth. The water body is big enough to moderate its own climate, which is why crops grow at 3,800 metres here and not on the plain beyond." },
  { i: 51, z: "Cw", n: "The Cochabamba Valleys", km: 12805, mk: [-65.7222, -17.5556], pc: 1, isl: 0, cs: ["Bolivia"],
    d: "Temperate basins in the Andean interior at around 2,500 metres, warm enough to farm year-round and dry enough in winter to store the harvest. Bolivia's granary." },
  { i: 52, z: "Cw", n: "The Minas Gerais Highlands", km: 101210, mk: [-44.2778, -21.3333], pc: 1, isl: 0, cs: ["Brazil"],
    d: "The Brazilian shield country above 800 metres, with a sharp wet summer and a dry, cool winter. The gold and iron here financed the Portuguese empire's last century." },
  { i: 53, z: "Cw", n: "The Sierras and the Northwest", km: 564426, mk: [-64.2778, -33.7778], pc: 1, isl: 0, cs: ["Argentina", "Bolivia", "Paraguay"],
    d: "From Salta down through Tucumán to the Sierras de Córdoba: summer monsoon rain against the eastern Andean flank, dry winters, and a rapid drop into the Chaco to the east." },
  { i: 54, z: "Cf", n: "The Bogotá Savanna and the Eastern Cordillera", km: 47636, mk: [-73.5, 5.4444], pc: 1, isl: 0, cs: ["Colombia", "Venezuela"],
    d: "A high flat basin at 2,600 metres that was a lake until the last ice age. Twelve degrees north yet cool all year, with no real seasons at all, only wetter and drier months." },
  { i: 55, z: "Cf", n: "The Inter-Andean Sierra", km: 123041, mk: [-79.5, -4.1111], pc: 1, isl: 0, cs: ["Ecuador", "Colombia", "Peru"],
    d: "The valleys and slopes between Ecuador's two cordilleras and their Colombian and Peruvian extensions. Spring-like year-round, which is why the pre-Columbian population concentrated here rather than in the lowlands." },
  { i: 56, z: "Cf", n: "The Ceja de Selva", km: 66706, mk: [-78.0556, -6.4444], pc: 1, isl: 0, cs: ["Peru"],
    d: "The eyebrow of the jungle: Peru's eastern Andean flank, where cloud sits against the slope almost permanently. Extraordinary endemism, and nearly impossible to build a road through." },
  { i: 57, z: "Cf", n: "The Vilcabamba Cloud Forest", km: 16543, mk: [-72.0556, -12.5556], pc: 1, isl: 0, cs: ["Peru"],
    d: "The forested Andean spurs northwest of Cusco. Warm, wet and steep, and the reason the Inca could grow coca and maize within a few days' walk of the puna." },
  { i: 58, z: "Cf", n: "The Bolivian Yungas", km: 18690, mk: [-63.8333, -18.0], pc: 1, isl: 0, cs: ["Bolivia"],
    d: "The steep wet flank between the Altiplano and the Amazon, dropping three thousand metres in a few tens of kilometres. Cloud forest all the way down." },
  { i: 59, z: "Cf", n: "The Pampas and the Plata Basin", km: 1762104, mk: [-55.7222, -29.0], pc: 1, isl: 0, cs: ["Argentina", "Brazil", "Uruguay", "Paraguay"],
    d: "One connected humid subtropical region holding both the Pampas grassland and the São Paulo and Paraná highlands: Buenos Aires, Montevideo, Asunción, São Paulo and Porto Alegre all sit inside it. Rain in every month, no dry season, and some of the deepest topsoil on Earth." },
  { i: 60, z: "Cf", n: "The Valdivian Rainforest", km: 215396, mk: [-72.3889, -41.0], pc: 3, isl: 0, cs: ["Chile", "Argentina"],
    d: "Temperate rainforest on the Chilean coast, taking two to four metres of rain off the westerlies. The alerce trees here live over three thousand years." },
  { i: 61, z: "Cf", n: "The Strait of Magellan", km: 50993, mk: [-71.0556, -52.2222], pc: 1, isl: 0, cs: ["Chile", "Argentina"],
    d: "Subpolar oceanic country at the continent's tail. Cool summers, mild wet winters and wind that essentially never stops; trees grow bent permanently to the east." },
  { i: 62, z: "ET", n: "The Northern Páramo", km: 33700, mk: [-78.7222, -1.6667], pc: 29, isl: 0, cs: ["Ecuador", "Colombia", "Peru", "Venezuela"],
    d: "Twenty-nine separate patches of tropical alpine tundra, from the Sierra Nevada de Santa Marta through the Colombian and Ecuadorian volcanoes to the Cordillera Blanca. Each one is too small to hunt for on its own, so they are quizzed as a single region. Frailejón rosettes here store water for the cities below." },
  { i: 63, z: "ET", n: "The Puna and the High Andes", km: 572740, mk: [-67.9444, -25.6667], pc: 36, isl: 0, cs: ["Peru", "Argentina", "Chile", "Bolivia"],
    d: "The largest tropical alpine surface on Earth: the Altiplano and the puna from Peru down to the Argentine-Chilean cordillera, most of it above 3,500 metres. Ojos del Salado, the highest volcano on the planet, stands in it." },
  { i: 64, z: "ET", n: "The Patagonian Icefields", km: 163456, mk: [-67.7222, -54.6667], pc: 79, isl: 0, cs: ["Chile", "Argentina"],
    d: "Ice and tundra broken into scores of fragments among the southern fjords. The Southern Patagonian Ice Field is the largest ice mass outside the poles and Greenland, and it is losing volume faster than almost any other." },
  { i: 65, z: "Cf", n: "The Falkland Islands", km: 18369, mk: [-58.7222, -51.6667], pc: 2, isl: 1, cs: ["Falkland Islands"],
    d: "Treeless, peaty and windswept, at the same latitude as London but several degrees colder in summer. Tussac grass and moorland, and no native trees at all." },
];

const RLE = "A87Y4A414Y7A411Y10A9Z1A400Y10A8Z4A397Y11A7Z5A396Y11A8Z5A393P1Y12A9Z5A392P3Y10A10Z6A389P8Y3A15Z2A1Z4P3A383P11Y1A15Z6P7A371P21A12Z8P10A368P23A7Z10P14A360P4A2P24A4P2Z10P14A36P2A1P2A318P40Z9P13A25P2A7P6A317P12-4P16A1P13Z4P13A25P3A7P5A316P14-2P31Z2P15A45P8A1P3A298P15-2P48A10P9A16P22A297P68A1P17A15P19A300P86A15P14A304P36A2P51A11P17A302P36A3P54A6P21A301P34A5P80A301P33A7P80A1P2A297P23J1P9A7P84A2K2A291P24J2P8A8P84K4A290P24J1P9A8P84K5A290P22J2P10A7P84K8A284P25J3P1J1P8A6P83K10A282P25J9P6A4P84K10A281P25J12P4A3P85K11A279P25J15P90K10A280P25J7B7J3P88K7C3A278P27J6B9J2P6-2P80K6C3A278L2P26J4B1J1B10J1P4-5P79K6C1A273D1A4L4P26J4B12P7-2P81K5C1A6C3A263D3A2L6P25J4B10P8-2P82K5C12A261D4A2L5P25J4B10P91K6C13A261D4A1L7P6L7P11J3B12P88K6C17A258D8L17P2L3P6J3B10P89K8C17A258D8L17P2L2P6J2$3B8P5K1P83K9C18A256D9L16P1L3P7$4B7P3K4P85K8C18A255D9L2D1L17P8$3B2K2B3P3K3P87K8C18A253D13L17P8$4B2K1B3K6P88K7C19A248D18L1D1L15P1L2P5$3B2K10P88K7C20A248D21L17P4$8K7P89K6C21A246D25L15P3$8K8P89K5C22A244D19%3D5L14P2L1$2-1$5K8P90K5C21A244D16%4D8L17$1-1$4K10P89K5C21A245D14%4D9L17$1-1$4K10P57K2P28K5C23A246D15%2D2%3D4L16$3-1$4K9P57K8P21K5C24A246D16%1D1%4D5L8D2L1D3L2$7K9P43K2P11K10P19K5C29A243D12%1D2%7D4L6D8L1$5-1$3K9P41K3P6K2P2K12P16K6C31A243D11%4D1%5D5L3D10L2$4-3$2K8P41K4P4K19P5K12C35A243D11%3D2%3D7L1D11L2$5-3$2K7P41K5P1K37C37A242D11%3D2%3D20L1$5-2$3K7P20K1P17K2P1K42C39A241D10%4D2%4D20$5-1$3K9P15K12P10K43C43A238D12%2D4%4D18$2-1$5K11P13K18P4K47C42A237D12%2D4%4D11$1D6$2-1$5K11P11K71C43A237D11%2D3%4D12$2D3$10K11P6K75C50A5C13A214D10%2D4%3D11$11-2$1K14P2K72C2K3C72A211D11%1D5%2D12$10-1$1K90C1K3C76A206D12%1D5%2D11$13K89C2K3C77A204D13%4D2%2D11$12K89C88A199D14%2D3%3D10$11K86C93A199D18%3D9$10K87C95A198D18%3D9$1-1$7K86C99A196D18%3D8$10K82C104A195D17%2-1%1D7$10K82C107A193D17%1-2%1D6$11K78C36M1C75A193D16%1-2%1D6$9K80C33M5C75A192D16%1-2%1D5Q2$9K45C7K27C33M6C39M2C35A189D17%4D5Q1$9K43C11K3C2K21C33M7C37M4C34A189D16%4D5Q2$2-1$5K33C23K1C2K21C32M7R1M2C34M6C34M1A187D17%3D5Q3$2-1$4K33C26K22C30M7R3M13C20M10C33M1A1M2A184D15%4D3Q5$2-2$3K33C28K19C31M8R9M10C15M12C33M5A183D13%3-1%2D2Q6$2-2$2K33C29K16C32M9R11M9C15M13C31M7A183D12%3-1%2D2Q5$3-3$1K32C32K4C41M10R12M1R1M6C14M15C14M3C12M8A184D11%2-1%3D2Q5$2-3$1K32C76M12R15M4C15M1C1M31C1M2C7M9A185D9%2-2%3D2Q4$3-2$2K31C76M12R16M4C19M36C2M11A183D11%1-1%3D4Q2K1$7K31C75M12R17M4C16M2C1M49A183D11%1-1%3D2Q1D1Q1K3$5K31C75M12R18M4C14M54A182D12-1%3D3Q3K3$4K31C76M11R19M5C12M55A182D12-1%3D3Q3K37C77M12R12M2R2M7C11M56A181D13%4D3Q6K34C76M13R11M3R1M8C9M58A180D13%1-1%4D1Q5C1K34C77M13R12M12C8M58A179D13%2-1%4D1Q4C3K31C79M14R11M1R2M10C7M59A178D12%8Q4C4K30C80M14R13M12C5M60A177D12%9Q3C6K28C81M14R9M1R2M14C3M62A173D1A1D12%3-1%5Q4C3K30C82M15R8M82A172D12%6-1%2Q1%1Q5C2K29C84M15R6M84A170D14%5-2%2Q4C5K28C85M15R2M89A168D16%4-2%2Q4C5K27C86M106A168D17%2-2%4Q2C6K26C87M107A1M1A165D16%2-2%5C9K25C87M110A164D16%2-1%4C10K25C89M109A162D17%3-1%3C12K23C91M108A161D18%8C12K21C93M109A158D18%10C13K18C97M107A158D12%2D2%11C14K17C97M107A159D11%3D1%4C4%2C16K15C97M109A157D12%9C23K13C97M109A156D10%11C25K10C100M36C1M2C1M68A152N3D11%2-1%8C138M30C9M65A151S2N3D10%11C141M20C5M3C12M61A149S5N4D7%3-2%7C143M19C24M56A150S5N5D7%2-2%6C144M19C25M54A151S4N7D5%3-2%5C146M17C28M51A1M2A149S3N7D4%7-2%2C148M15C30M53A149S2N8D3%2-2%8C149M13C32M52A149S2N11%10C153M11C33M50A1M3A146S2N12%4-2%2C156M7C36M53A146S2N12%2-1%1-2%1C202M3C2M1C4M31A1M12A142S3N10%6-2%2C212M28A1M14A141S4N10%5-3%2C212M46A137S6N9%5-1%3C213M26A1M24A131S7N9%4-2%2C2%1C212M24A3M24A130S9N4%7-2%5C213M23A5E3M19A130S11N2%3-7%4C213M25A3E5M16A131S14%2-6%3C215M25A2E8M14A3M1A1M7A118S14%3-1%1-3%3C216M23E2A2E9M13A2M13A114S15%1-3%2-2%1C1%1C217M20E4A1E11M12A1M16A111S16%1-2%3-1%2C220M18E4A1E13M10A1F4M16A107S17%1-3%2-1%3C198M3C17M18E19M9A2F6M16A106S16%1-3%2-2%1C198M6C14M18E20M8A2F8M16T2A6T1A96S16%1-3%5C196M9C11M20E21M7A2F8M17T3A3T3A95S16%1-4%3C180M9C1M20C4M23E21M6F12M16T4A1T3A96S16%1-4%3C178M33C1M26E20M4F15M16T7A96S16%1-6%1C176M63E17M3A1M1A3F13M17T8A94S16%2-4%2C176M67E11M7A1F16M16T9A94S15%2-5%2C175M68E6A1E1M10F16M16T10A92S16%2-5%2C175M70E4M13F14M16T11A91S18%1-4%3C175M89F7M21T11A91S18%1-4%2C176M117T12A90S15%1S2%1-4%2C176M116T13A8T3A82S10%3S1%2-4%2C177M115T12A1T2A4T7A81S6A1S2%6-1%5C177M116T27A80S7%4-2%5C180M115T30A78S8%1-3%5C180M115T36A8T7A57S3A1S1%4-2%6C180M115T53A55S2A1a1S3%2-1%6C181M112T58A56a2S1%10C181M9C2M97T64A53a3S1%10C181M8C6M78T2M13T66A50a6%9C182M7C8M1C4M70T9M2T74A46a8%8C184M5C15M69T86A44a7%10C184M4C15M69T89A41a7%5-1%4C185M3C16M68T92A38i1a6%11C185M2C16M69T93A36i2a4%13C185M2C16M69T94A34i4a4%11C186M1C17M69T95A32i4a5%11C1%2C183M1C16M69T97A30i5a8%10C200M70T98A29i6a7%10C184M1C14M70T100A28i9a4%9C185M2C12M70T102A26i11a3%10C184M2C10M49T2M5T2M12T105A25i11a2%7C1%3C184M3C8M48T6M3T3M8T111A23i10a2%7C2%1C184M60T101b2T28A24i10a1%7C2%1C183M61T101b3T30A21i10a1%7C185M61T102b3T30c2A5c2A12i12%6C169M1C1M1C9M65T102b3T30c9T4A8i14%5C166M10C3M67T101b4T29c9T5A8i13%4C134M1C20M92T100b6T27c9T7A8i13%3C8&1C124M4C17M93T94b1T5b5T28c9T7A8i13%5C5&4C1&1C120M6C14M93T95b1T4b6T27c10T8A7i12%7C2&8C89M3C27M9C11M94T95b1T4b6T28c10T7A6i13%7C3&9C85M8C24M10C8M97T93b2T4b6T27c10T8A5i14%6C4&10C62M1C20M11C21M12C6M98T93b12T28c11T6A5i14%6C5&10C59M4C18M13C20M115T94b12T27c2T5c5T7A5i14%1-2%1&2C1&1C3&9C58M12C8M17C19M115T94b12T27c2T5c5T7A6i13%1-2%1&5C1&10C58M13C6M21C16M114T95b12T32c7T7A7i12%4&13C2&2C57M17C1M25C13M113T96b13T28c5T1c4T7A9i10%1i1%2&13C3&2C56M45C9M83T3M26T99b13T26c7T13A10i12w1&13C2&1C57M47C5M85T4M25T100b11T27c9T11A12i10w1&12C62M136T2M30T97b12T26c9T11A13i9w2&2-1&1-1&7C60M136T4M29T96b15T24c9T11A14i8w4-3&11C56M138T2M25T100b14T25c8T13A14i7w10&9C55M136T4M24T100b15T24c9T13A15i8w8&10C54M136T4M23T97b19T23c11T12A15i10w7&9C53M139T2M22T97b19T28c7T12A16i10w5&2w1&6C54M139T3M22T94b18T30c9T11A16i8w10&6C53M140T2M16T1M6T91b22T30c8T11A17i10w5&7C54M140T3M4T1M10T3M1T93b24T3b1T25c8T11A17i10w6&7C38M4C10M140T5M1T3M1T2M6T3M3T91b26T2b3T4b1T17c9T11A18i6-2i2w6/1&5C37M8C6M140T6M2T6M6T4M1T90b39T15c8T12A18i6-2w8/1&5C20M2C13M11C3M141T6M2T7M5T89b1T6b40T14c8T12A19i6w2-2w3/1w1/1&6C19M6C7M154T9M2T7M5T88b2T6b40T18c4T12A20i5w2-2w3/3&7C18M6C6M41T5M109T18M4T88b4T4b43T6b4T8c2T12A21i7-1/7&7C16M52T9M109T16M2T91b3T4b53T21A23i6-1/8&6C17M50T12M109T15M1T90b4T3b54T21A23i7/8&6C17M50T13M110T103b5T1b54T23A24i6/9&5C17M50T15M109T102b60T22A26i5/8&6C18M48T18M94T9M6T100b60T22A26i5/9&6C18M46T26M70T1M2T1M11T13M6T95b1T1b60T23A26i5/10&5C18M45T28M68T5M1T3M1T4M1T15M5T94b4T1b57T23A27i5/10&5C18M44T31M63T35M2T96b3T1b56T24A28i5/9&4C19M45T32M58T136b3T2b55T23A29i5/10&4C18M45T34M53T139b1T5b52T25A30i4/11&3C23M39T36M51T145b55T22A31i5/10&6C4&1C16M34T41M47T147b59T18A33i5/9&2-1&4C3&2C19M28T45M43T149b59T17A34/15&2-1&4C2&1C21M26T47M40T151b58T17A36/14&11C19M24T51M37T152b59T16A37/14&10C20M23T55M15T1M17T152b60T15A38/16&8C20M22T57M13T4M13T153b60T16A39/17&2/1&4C19M21T62M9T171b59T15A40/1j3/14&1/1&4C19M21T63M7T174b34U1b21T15A42j5/11&2/1&6C16M22T64M6T177b30U2b20T15A43j5/12&1/2&5C11M27T68M1T179b28U3b20T14A45j4/16&5C10M27T68M1T179b28U3b18T15A47j4/14&6C10M27T248b27U4b17T14A49j4/14&4C10M29T248b27U4b17T13A51j3/15&3C5M1C3M32T246b27U4b17T12A52j4/15&2C3&1C1M27G6M4T244b29U3b17T11A53j5/15&2C1&3M27G7M4T242b30U3b17T10A55j4/14&3C1&3M26G9M4T241b31U2b17T10A55j6/11&4C1&3M26G12M3T15M4T222b28U3b16T10A57j5/13&8M24G13M3T12M7T221b25U6b14T11A60j3/15&3/1&3M23G14M5T5M11T222b19U2b1U8b13T12A60j2/17&6M23G15M21T221b20U10b12T12A62j3/12x2/2&5M24G15M23T218b20U10b10T9H4T1A62j2/14x2/2&6M2x2M18G16M23T217b18U12b9T9H5A63j4/12x3/1&4M1&1M2x1M19G18M22T216b17U13b8T8H7A63j4/13x2/2&3M4x1M18G19M22T214b1T2b16U13b3T1b2T9H7A65j3/14x4&3M2x2M16(2G20M22T213b2T1b16U13b3T11H8A66j3/13x4&1x3M2x2M12(6G20M21T213b2T1b17U11b4T11H7A68j3/13x1/1x9M10(11G19M20T212b2T1b23U3b7T10H6A70j3/13x3/1x7M10(10G19M20T211b8T1b28T9H7A70j4/3o1/11x9M12(6G21M19T211b8T1b28T9H6A72j3/2o2/12x1/1x7M4(4M1(8G21M19T211b8T1b27T6H9A73j4o3/11x2/3x6M1(11/1(3G22M19T210b8T1b24T7H10A75j4o1/13x1/2x18/3(2G22M19T210b7T3b22T7H10A76j4o2/13x1/2x9/1x1/2x2/6(5G18M19T210b7T3b22T6H8A80j3o3/12x12/4x2/6(7G16M19T210b8T3b21T6H7A82j4o2/11x13/12(7G14M20T210b7T4b21T5H7A83j4o2/13x3/1x6/13(2/4(4G10M2V5M15T209b8T3b21T5H7A84j3o3/12x2/2x6/22(2G9M1V7M14T209b8T4b20T5H7A83j5o3/10x2/1x9/22(5G4M2V7M1V1M12T209b8T5b19T6H6A83j5o4/12x5/26(6M6V8M13T206b10T1b1T3b19T5H6A83j8o1/13x1/1x1/31(1/1(2M6V8M13T205b12T4b19T4H6A84j7o2/12x1/1x2/33(3M5V7M15T202b13T3b19T5H7A83j7o2/2o1/9x1/2x2/32(4M3V9M17T199b13T2b20T5H7A83j8o4/12x1/35M5V1M2V7M19T7M4T185b13T2b20T5H7A84j8o1j1o1/49M7V3M37T182b13T2b20T5H6A86j9o2/50M5V3M38T182b12T2b19T6H6A87j8o3/51M3V3M39T181b13T1b17T8H6A87j10o1/51M3V4M39T180b13T1b14T10H7A88j9o2/51M2V4M39T182b10T3b12T12H6A90j8o1/40y1/10M3/1V3M1W2M35T183b5T2b2T2b13T13H5A91j7o2/37y1/1y1/11M2/2V4W2M34T183b5T1b3T2b5T3b2T16H5A92j4o6/35y6/7M4/3V3W2M32T184b5T1b2T6b1T22H5A93j5o7/33y7/5M2/5V3W4M30T185b4T32H5A94j5o4/36y6/6M3/4W7M29T186b6T29H6A94j5o3/34y9/3M6/4W7M28T186b6T30H5A95j5o4/7o3/23y9/2M2/1M5/3W7M27T186b5T31H5A97j5o5/3o3/4p1/1p2/16y11/5M3/3W8M26T187b1T2b1T32H4A99j4o11/3p4/17y10/11W4y1W4M10I8M8T222H5A99j4o11/1o1k1p2/21y8/9y2W3y1W5M8I11M7T220H6A102j1o13k1p5/17y11/6y4W2y2W5M6I14M6T219H5A104o3k1o9k3p6/14y11/6y8W6M4I16M5T218H6A106k3o8k2p7/15y12/5y7W1)2W1M6I16M6T217H6A108k5o3k4p2k1p5/15y1/2y7/6y6)3W3M5I16M7T215H5A112k3o2k8p4/18y7/6y6)3W1)1W1)1M5I15M8T214H5A114k10p5/4p1/12y9/2y2/2y4)8M1)1M4I14M9T213H5A116k7p12/12y5/2y13)1y3)6M1I17M8T212H5A119k2p14/12y6/2y3/1y2/3y8)6I18M8T211H5A120k2p3k2p7/12y8/2y2/1y1/2y2/1y8)5I15M11T212H3A122k7p6/13f2y5/3y2/3y2/2y8)5I13M12T212H3A124k5p7/13f2y5/2y8/1y9)6I10M13T212H3A125k4p8/13f2y5/1y2f1y1/1y3/2y6/2)10I4M15T212H3A128k2p11/9f7/1f6y2/2y7/1z5)5I1)1I2M14T213H3A129k1p3l3p6/8f15y2/3y4/3z5)7I1)1M1T7M1T217H3A129k1p3l4p5/8f16y2/3y2/4z7)10T223H3A129k2p2l6p4/9f16/4y2/3z1/1z11)6T220H4A130k2p1l7p3/9f17/2y3/6z3f2z6)9T178!1T37H4A132l9p2/10f16/3y2/1y1/4z2f4z6)8T177!2T37H3A134l8p3/9f2/2f12/3y5/2z2f6z6)7T176!3T38A137l8p4/7q2/3f11/3y8z2f6d4z2)6T176!4T37A139l6p4/7q2/3f12/2y1f1y7z1f7d3z4)4T177!6T33A141l5p4/6q4f14/2y1f1y7z2f6d3z6)2T176!7T32A143l4p5/5q4f14/3f1y7z1f5d7z4)3T175!6T33A143l4p5/4q6f14/2f1y1f4y2z1f5d7z4d1)1d2T174!5T34A143l1p8/4q6f20y8f2d7z4d5T174!3T35A143l3p6/7q3f20y8f2d7z2d1z1d6T173!3T34A144l1p8/8q2f17/2f2y7f2d17T174!2T35A144p9/6q4f14/1f1/2f2y6f3d18T173!2T35A144p8/10q1f12q1f1/1f2/1f3y2f5d20T172!2T35A144p9/6q5f10q3/2f13d20T6d5T161!2T34A144p9/5q7f8q4/4f13d31T159!2T34A144p10/5q7f7q4/4f13d32T158!3T33A145p10/5q5f4q1f1q6/6f2/1f8d33T157!1T34A146p10/5q5f3q10/5f2/2f8d33T156!1T34A146p10/5q6f3q9/2q2f3/2f8d34T154!2T13!1T18A148p10/7q5f2q9/1q4f10#1f1d35T153!2T12!3T17A148p10/7q15/1q5f9#3d36T149!6T11!3T16A149p10/6q22f9#3d37T137!1T6!3T1!7T10!2T6!1T10A149p10/5q16/2q5f2q1f6#3d9#2d26T136!2T5!3T3!6T10!2T1!1T1!4T10A149p10/5q22f3q2f5#2d8#5d25T136!3T5!2T3!6T7!9X1!1X1T9A150p10/5q1/2q19f3q3f4#2d6#8d24T121!1T13!4T3!1T1!11T7!9X4T8A150p11/7q21f1q3f4#1d7#2d1#5d25T119!2T14!3T1!3T2!11T3!1T1!10X4T7A151p11/8q20f1q4f2#6d6#4d27T119!1T14!34X6T2X1T2A152p11/8q24f4#4d7#4d27T119!1T8!1T5!30X2!1X7T2X2A153p11/6q1/1q18f2q3f6#4d6#4d27T119!1T1!6T1!4T2!28X4!1X10A154p12/5q2/1q14f7q1f5#3d9#3d2#1d24T119!14T4!19X3!2X15A155p12/6q16f15#1d9#2d3#2d24T31O2T85!14T1!2T1!18X21A155p12/5q6/1q9f13#8d5#1d4#2d24T30O5T82!34X23A157p11/10q11f14#7d2#5d2#4d22T30O9T82!32X22A157p11/11q10f13#22d21T29O12T80!31X22A157p12/12q9f13#23d20T29O15T77!32X21A157p12/1p2/11q6/2f12#23d19T31O14T77!34X19A157p12/1p3/12q2/4f12#23d18T31O12*1O2T77!34X19A157p11/3p2/17f12#25d17T30O12*3O1T78!30X23A156p12/1p3/16f13#25d17T30O12*3O2T76!28X26A155p19/15f12#25d17T31O10*3O4T1O1T8O2T64*1!23X27A157p20/14f12#25d17T32O9*4O3T1O6T2O3T64*1!22X26A159p20/14f11#26d17T32O9*4O17T62*2!19X26A161p20/14f2/1f7#1/1#25d18T31O10*5O15T62*3!17X25A163p20/15f1/1f7#27d18T32O9*5O15T61*6!11*3X25A164p21/16f6#2/1#25d18T33O10*4O14T41*2T18*11!4*8X22A163p22/16f6#28d18T35O8*3O15T5*16T16*9T14*28X17A164p23/16f5#27d18T36O8*2O15T5*17T14*12T12*29X17A163p24/16f4#4/1#23d18T36O8*2O15T5*19T13*12T11*27X9A1X9A162p25/10#2/2f5#29d17#3T34O8*6O11T5*1T1*17T3*2T4*17T2*1T7*23A2*2A1X1A179p26/9#2/1f6/1#5/1#21d18#5T35O5*5O11T9*17T1*29T4*24A1*3A181p26/9#2/1f1#3f2#27d19#7T32O6*5O15T3*77A185p26/9#7f1#27d17#12T33O2*8O12*77A190p25/9#4/1#8/1#20d17#15T31O2*7O11*78A191p24/12#30d17#17*2T24O8*8O2*5O1*78A192p24/12#7/2#7d2#10d18#14*11T19O7*95A192p24/13#6/2#6d3#9d18#14*14T16O7*88A5*3A192p23/15#3/1#1/1#5d4#9d19#13*16T2*4T7O9*87A7*2A192p22/16#2/1#2/2#6d2#6d21#14*24T3O9*86A204p18/1p2/17#1/1#3/2#6d1#6d21#15*25T1O5*2O1*87A204p18/24#2/2#4d1#1d1#5d22#15*26O5*88A206p17/25#2/2#3d2#1d1#5d22#15*26O5*87A207p17/26#1/1#4d4#5d21#16*27O4*86A208p13/1p3/23#1/1#7d3#6d21#16*28O2*85A210p13/1p3/23#9d3#5d22#16*114A212p12/2p1/24#10d2#5d21#17*112A214p12/27#9d2#4d23#17*111A215p11/28#9d3#2d23#18*110A216p11/28#11d2#1d23#18*110A216p11/26#13d6#2d17#19*109A216p13/24#14d4#8d12#20*108A217p12/24#15d2#12d9#21*106A218p13/25#14d1#14d7#21*107A218p14/24#29d6#21*107A219p13/25#54*108A221p12/25#50*112A220p13/29#45*113A220p15/27#44*115A219p16/24#45*116A219p13/27#45*115A220p11/28#46*115A220p11/27#7/1#21e1#17*114A220p11/28#28e3#16*115A219p11/1p1/22#1/3#27e4#16*115A219p13/14r2/4#11/1#19e6#17*114A218p14/14r3#5r1#7/2#2e2#13e9#17*114A217p14/14r5#2r3#4/4e3#12e11#17*114A217p13/12r1/1r6/1#1r3#3/5e3#11e12#19*111A218p12/13r1/1r5/2#1r2#6/3e4#10e12#22*110A216p12/13r1/1r5/2r4#2m2#2/2e4#9e13#25*107A215p13/13r11m1r2m4#2/1e5#6e16#25*105A216p13/13r10m8#1/2e6#4e17#25*105A215p14/13r9m9#1/2e9#2e16#25*104A216p14/13r9m9#1/1e28#25*104A216p15/13r8m9#1/2e27#25*104A216p14/10r12m9#1/3e26#25*104A216p10/1p1/11r11m11#1/2e26#25*104A216p11/13r14e1m7#1/2e1m1e23#23*107A216p10/12r16e1m7/2m3e22#21*109A216p11/12r15e3m11e19#23*110A216p12/11r9/1r6e1m12e17#24*109A217p15/6r1/2r1/1r7/1r6e1m1e1m10e17#24*107A219p14/6r3/1r8/3r2e1r2e3m10e16#24*107A220p11/9r3/1r9/1r3e1r1e4m10e14#26*106A221p9/10r4/1r9/1r2e2r1e4m4e19#27*105A223p7/11r3/2r12e6m4e20#27*104A224p8/10r3/2r12e6m4e20#27*103A225p7/12r2/1r4n1r2n1r5e5m4e20#29*102A225p7/12r2/2r3n5r4e5m3e21#29*101A226p7/11r4/1r4n2r6e5m2e18#33*100A227p7/1p3/6r10n3r4e26#33*100A227p9/1p2/5r11n2r5e25#33*100A227p7/1p1/8r11n2r6e24#33*99A226p7/12r11n2r6e23#34*99A225p10/10r11n3r5e23#34*98A226p9/11r10n5r4n1e22#34*90A3*5A226p7/14r9n5r3n2e21#34*90A4*4A227p9/11r10n6r3n1e21#33*91A4*4A227p1g1p3g1p5/7r12n6r3n2e19#32*93A3*4A228p1g5p2g1p1g1/8r11n8r2n3e15#1e1#30*94A3*4A229p1g11/7r11n8r2n3e14#28*98A3*4A230g9/10r11n8r3n3e13#24*102A2*5A230g8/11r11n9r1n4e13#24*101A3*4A232g7/11r10n15e13#24*99A5*3A233g7/12r3h1r3n17e13#25*96A6*3A234g7/12r3h1r3n17e14#24*96A4*4A235g8/10r4h1r4n16e14#25*95A3*3A238g8/9r4h1r5n15e15#24*100A239g9/7r5h1r4n13e19#24*97A241g2/2g2/2g1/7r1/2r2h1r4n13e19#24*95A243g2/17r2h1r3n14e19#24*94A244g2/4g1/12r2h2r1n15e16#1e2#24*93A245g8/11r1h3r1n14e13#6e1#23*93A246g8/11r2h2r1n13e13#7e1#23*92A247v2g1v2g1v1g2/10r2h1r2n12e13#31*93A247v7g2/10r1h3r1n12e12#32*92A248v5g5/9h4r1n12e11#32*93A247v6g1v1g4/9h1r1h1r2n4r3n4e7h1e2#33*93A247v8g1v3/9h1r5n1r6n3e6h2e2#33*93A246v8g3v1/10h1r14n1e6h1e3#33*92A247v8g3v2/8h2r14e6h2e3#33*91A248v8g3v2/7h2r15h1e5h1e4#33*90A249v8g4v4/5h1r6h1r8h2e3h2e4#34*88A251v9g2v2/7h1r5h3r7h4e2h1e4#34*87A251v15/6h1r3h6r6h5e1h1e4#35*85A251v17/5h1r3h6r5h9e2h1#36*82A253v13/2v1/6h1r3h7r4h12#36*81A253v14/2v1/6h26#38*80A253v14/9h26#38*79A253v17/6v1h27#37*36A2*40A254v17/6v1h27#37*35A4*38A255v15/1v1/4v1/1v1h27#37*35A5*37A255v15/6v3h27#1h2#33*37A11*28A257v15/6v3h30#33*39A10*26A257v16/6v3h31#32*41A11*21A259v16/4v5h31#32*43A11*5A5*7A260v20/2v2h33#32*45A22*1A263v24h34#31*46A284v24h36*4#25*48A282v25h36*5#24*49A281v25h36*17#11*50A280v26h36*17#11*50A280v26h35*20#7*51A281v26h35*21#4*52A281v26h35*22#4*52A280v28h34*23#3*52A280v28h33*25#1*54A279v28h32*82A278v28h31*87A273v29h30*88A273v30h28*89A271v35h24*90A271v36h22*91A271v37h24*3h3*82A271v34h2v3h32*78A271v31h6v5h34*72A268v35h8v4h35*69A268v37h1v2h46*66A269v38h47*65A269v38h49*63A270v37h51*61A272v37h10s2h4s1h34*59A274v37h3s1h4s9h34*57A275v37h2s15h35*56A275v38h1s7h4s6h19*3h11*56A275v37h2s6h7s4h19*7h8*53A277v37h2s6h32*65A278v37h2s8h31*8h1*53A280v37h3s11h28*3h5*50A283v37h4s1h2s7h37*46A287v36h7s7h37*40A293v36h6s9h36*35A298v37h3s12h36*13A1*14A305v36h4s9h40*11A1*2A317v36h5s4h44*15A316+3v33h4s3h47*12A318+2v34h3s3h48*12A318+2v34h4s2h50*10A317+2v35h5s1h51*8A318+2v8+1v26h5s1h52*7A316+4v6+5v2+1v21h5s1h59A315+5v5+10v19h65A316+5v4+10v20h64A317+4v5+11v19h64A316+5v5+11v19h64A316+4v3+14v20h63A316+5v2+15v18h65A315+22v18h65A314+23v18h65A314+22v18h40A2h23A315+22v18h40A6h18A316+22v18h40A9h12A319+23v17h40A12h5A323+24v16h40A341+22v17h41A340+21v19h39t1A341+7A2+10v20h39t1A338+9A3+11v19h19t3h17t1A338+6A5+8v1+3v20h20t3h14t2A338+6A6+7v2+1v21h20t3h13t3A338+7A7+2:3v24h20t4h5t3h1t8A6t4A325+8A5+7v22h21t25A1t7A324+7A5+6:2v22h21t2h5t18A1t7A324+7A6+9v21h23t1h5t24A324+6A6+11v20h23t2h3t25A324+6A6+11v21h19t5h1t16A4t7A324+7A5+4:1+7v22h16t23A4t7A323+8A5+12v23h13t29A1t3A326+8A5+12v21h1v1h12t11h7t12A329+9A4+13v20h15t9h9t11A330+7A6+17v16h14t7h14t7A333+6A5+19v15h15t2h21t2A345+21v1+1v13h14t1h23A331+2A14+4:1+17v13h37A332+2A14+23v12h36A340+3A6+23v11h37A339+4A4+12:1+13v10h37A347+26v10h37A340+2A5+5:1+19v11h37A339+5A3+26v10h37A338+6A3+8:2+16v5h1v4h37A336+8A3+8:2+2:1+12v5h3v3h37A336+9A1+9:3+14v3h6v3h35A336+36v4h42A339+9A1+8:3+14v3h43A340+7A3+4:1+3:1+2:1+11v4h43A341+6A2+5:2+16v5h43A341+6A2+2:1+3:1+2:1+12v6h36A346+8A1+4:1+2:1+1:1+11v8h4u1h3u3h23A348+3A1+3A3+4:1+14v8h4u2h3u4h19A351+3A1+24v9h4u4h2u3h18A351+12:1+13v12h4u3h2u5h16A351+25v13h5u3h3u4h15A350+15:1+2:3+5v14h6u2h3u4h14A350+18:6+3v14h6u9h13A351+19:6+2:1v12h6u10h12A352+1:1+2:1+12:6v5:2v9h8u8h13A352+16:4+1:3v5:1v8h11u6h13A350+5:1+15:1+2:6v10h6u3h4u1h17A347+17:3+3:1+2:6v6h1v4h3u11h2u1h13A346+19:7+2:1+2v6h10u15h14A343:3+15:7+8:2v4h10u14h15A342:3+1A3+11:8+5:3v10h9u11h15A342:2+1A5+3A1+5:8+5:8v6h7u5h4u3h17A341:1A11+4:8+1:2+4:6v7h2v2h4u2h29A349+3:8+9:1+1:3+1v9h5u2h34A343+5:8+15v6h1v1h4u3h34A342+4:9+14h52A340+4:3+1:6+2:1+10h53A340+5:2+2:3+2:1+2:1+1:3+3h3+5h47A334+3A2+6:2+1:3+5:2+1:4+9h47A334+5A1+7:1+5:4+1:2+5:2+7h45A336+4A3+1:1+2:1+1A1+2:4+1:1+3:1+12h47A332+7A1+8A1+7:2+14h48A331+2:1+8:1+2:2+7:1+3:1+10h1+1h47A334+5:1+7:3+1:1+5:1+13h48A334+6:1+10:1+21h46A335+17:6+6:2+8h44A337+9:1+3:1+2:9+4:3+2:2+2h43A339+5A1+4A1+6:7+2:1+2:7+2h41A341+9:1+4:9+2h2:1h1:5h43A343+2:2+4:3+1:1+2:8h8:3h42A344+2:3+3:3+7:5h2:1h48A346+2:1+2:2+1:2+2:3+1:8h1:3h45A347+6:5+5:13h44A348+2:8+1:2+2:9h2:4h42A349+1:7+3:1+1:9h4:2h43A348+3:7A1+5:6h49A348+5:1+1:5+5:8h47A348+3:1+3:4+5:10h46A351+3A1:3+1A1+2:11h46A351:3+1A1:3+6:10h45A351:3+3A1+7:5h1:1h1:2h43A353:3+3A1+7:5h44A357:3+1A2:2+6:6h41A359:3A3+8:1+2:4h1:1h5:3h28A360:4A3+6:1+3:6h3:8h25A361:3A1+6:1+3:1+3:16h24A363:2A1+2:3+4:2+1:9,1:5h2:1h24A366:1+1:4+6:8,6h28A367:5+7:6,6h29A368:5+2:1+1:1+1:4,4:1,7h25A365:1A1:4+7:6,15h22A364:7A4+3:3,3:1,14h21A76;1A1;5A2;2A3;6A1;3A263:7A5+1:1+1:8,1:1,4:3,7h18A76;12A1;12A262:2A9+3:8,7:3,9h16A76;11A1;13A262:1A2:2A3:1A1:2+2:9,20h15A75;10A2;13A264:4A1:6+3:5,22h16A69;2A3;9A1;14A265:5A1:3A3:9,25h12A67;14A1;12A268:6A2:1A4:8,25h12A68;11A2;12A270:4A2:3A2:9,3:2,23h11A67;7A4;12A271:4A2:16,3:3,21h10A69;4A4;8A277:2A4:13,4:4,20h2A4h6A80;1A286:14,3:2,2:2,18h3A377:13,1:1,26h3A2h3A371:13A2,2:1,18A3,3h8A364:3A7:15,1:2,9A2,10h2,2h5A363:5A4:15,1:1,3A2,4A4,13h6A363:8A1:14,2A4,5A3,14h6A365:21A3,4:3,1A2,13h7A371:5A1:13,1:6A3,14h5A373:25A4,2:2,11h1,5A369:26A5,1:1,2A3,14A367:13A1:13A10,17A368:25A2:2A3,7:4,10A368:13A1:10A1:3A2:3,21A368:20A2:5A1:6,19A367:9A1:9A3:5A1:7,18:2A368:5A2:17A2:15,1:12A374:17A3:29A372:2A3:44A372:23A1:27A368:55A366:61A363:57A362:11A3:43A364:1A2:8A2:37A374:7A2:15A1:11A4:1A383:2A3:26A4:2A391:4A2:7A7:2A5:1A393:4A1:9A415:5A5:1A412:2A4:3A414:4A416:4A294";

const BORDERS = "X@5oSB348828075|ld6wY12D9BD09851H468C2A7A026AA61|vh6YY131F6448087|p@5sR510AEE8715D7|nx5sQIN05B37DD5JHD09H99CL3965O1233935VHF253J35B4D4LRRY2f2638F19BBF99D93H277B37Bx1HP6HBB13X19790b1Y1H3D4Z11HKb12DE5033GLi1h10b1Id14B3HC3s131J57B1PDF3BV7995H0PJ70J9X1TBF714G38767093NFN1B6j1e10E9W1Ny10CX1S5CD4932Am1g14AHS965ABY13Q346W21E4A866C0E6EA84A3G76T473r17P0J4D1H79451b2q2P2Z1CR991n16R39476BSJ47A4i18C3K1ANODm1F43A52D5D314a1w1Ee2GY1QSK8Sk1g1CM89953b19952DALKH914FAB055LTX1FRCH27ML19AFE3UCGI2a11EHUBCBS3O860CK4i1KS6UCEE62G984263Eb157Q8MK8EBAb14B87e14g17g1RCR372B6BA5Q1w2Eg22E509OLK3s1DQ2a2a1Y11A6B6T2735Ag12c11W16O0O4k13a1435V3D9V2L1830761AB277D82640A41Of14268650G80IBGL1IE048SPS7MJ39D3359VBNb10W1HA6G2OAW15E8I0E7|vc5jf3995HJL3DNDDFB277r1JX14DAT2H3P7B0D478d1AVM_11547Eh1c13K8k108E6CG26Bg18G08360K16EG6E0478GU4A3C8C0E5C4AIK284447Y11AE84K0Y2p1EF450NK4KIOHAH858364EBW17MPEBU9G9GX1OHC3CBZ1V5B0l1G7|zt5bW5G5S04513B025M9403C24S461CBB133G535V5H9X174717r18EF91H059D69A06AA36W1IK63A08ME3862|hy5vW5E1MAE560Q286C535z1l1V1BFD5H2RCKCG1a1I0432L374Y1856JA5C40O9|r@5vX5E15D909AC6|ps5nY50772164261|xx5pW5B03CA0C159|lw5dZ5703AC305|df5uGHHBF1H6P194R6517a1l10DJT2D1HJZ17357B15CF29E9590F533Z13LC3119991361GJ0F3151h1A96D4Na1Fa19A9q1N1940CJG5IDE1ICGAW17G46GCU0C406AC723A8E4621Cg1A6e2BU7490K86I2Q1O4U1m17U92JBN|pw6dD157356B1FEd11HHr19V3p1RX1RH59p1Pj1AN0B9971H9PL3H8LN70B35IHA3035BEDAPID0769A5MR0BLTc10i19636L850Fw10a14y1m1A4594F7B0t3A8EBA0Y1Ec13w2v4790797BB0z19HATAHB91BLL3D751FKRBFBNKn187M387JD2FHBNVHB13CD0BFDB1536TBJPBN1p1e1d1Q5QDCNAX1KX1UX18x1W1VAf1SN8HEr1Sh1q1d1QNg1981K78C68S3ERe15GJU7IFC5C945e17CX1Q1Q7Ih1i2Pc2Le19O0CFM9IZ1c1Jg13Cb1s1BCb2a1VM3C2666A362680C5GLW16ENa16Y148Y1a1AEm1a1436J0B4DBBD253134923A0BJ03A184AA62Y1HG2C72DGNQ74468622EMG2A1ECY1EK8c16067621AW1c1s3g1y1g1o1y1I@163A03Q2A04FG7GD824E3E2CA81KBE149E7KJ8RABI3KHK3EJ291925G7C0258N5B27I545C0K4M5I2G880MGK5GBK288G4QD65s1P4315X2b3M7I4A58HKH|tr5_@14DCF2J632H6B2D7F255D2J1F053B25E3A4G7M3A2U7U4CE824147C7e138B2947873JAR0F491F894R63G1M4a1GI7KD774HHh225HV1t13T7N5BB315FB15R57B537J7550HAJ0FB59517872B3P6D3R4f1CX14h133C2686AGC614EK0O8KMIEUIG0E58HIDAH6L2FCJ6j1Md2k1LAD1N6X1AJA3ABAJAd1SPW1FOFINE36c1s30o1a1o1Gg1m5Y1w22y2r14H1F|vz5eGX2g2SS3M3E6CK464G1W1I464A14N2564ABMAAAIE0KIE68EC406HOIF832481k1Rw1r1EL0R9J3X159864GEOC2W19c1V6BK5C9274L3X1BJ4960239937b11FB358F9VBF0729ED6HKF0BA3O2Ap1A9GZ1OZ1E3857352L3H49AJ595BHh175B90J659932935F0D7309AR8TW1B40A960c1B8BW12W1EY11OICCOHS4GDAT6AK4Y1765A9295B1J471|rg5e7826884Ka12I1EKU0EZ1m128563S2A5G0I2ACGQOAQ6882c1LI1c1BEDUPG71FA8GDAJ3F884K60Gf10F955DHFFX1FH9RDP05DLH91393L2BEF7N416b1NT8HC|dh7953D1D413E78FGF03194P9054Hz1n1x1x1f1r3f1Vb1295158507b1DJBX12D19LF1D515733P8FO1EB8F1X1I5199739204CK90143A2464E1CC3E0C5K34G6KGOw11A7C1U572R3B53524KRX1H8LMF69818IA2E0C7I4Q9U6ASEAQI3949MGKIGAG2Q5a146E2GCC0G8u1E8A3GIHo1Va1DC26BI76NS3UB6044M3824E6440M9IHA7G1G9I5|jw7f913B26OEA81A3B9713D|ns7@35136A609|x@6Yb1L7f1BRj1J7PRFX1Dd2Z1v123E4E66149G3El1ON294J7B3h189K3CR85A3S4o15A2SAa1BQ1c2p262A3I8E2K3Q0s1884U3854F39975D0D5B75392D5_1434PCX169A5IR39l1f119A4E36BY1R0BAL15Q_10DJ31i118Nc134F3PRB5949I525D8Bn30L6T71_1s10GJ1D25B3JAVBP11d2GHSH4D1B8FA70949t1l9JI7I96H3L8Y2c32634r1Q56PEF377J1FCJ6LF70F7H1L6J3B036H6186C7O16B0F8162A1ADKJ4JIH49C7SJKD83AD2JC7255H6FAF298HILA30533D71L43350TCR45OH85CB1n1MJGF8HI16DA6EG8M52E5E2U66C68146I362CC6A60EG1GE4EQ604EOi175942E327B5C2IB104GE8W15C3m11ADCME8A9MBI1A804U7C70Ri1988M64261G60CF42IE2EEEJi1788E608DC9KP83550523C0463W13E9C44K8e1SESCAC8E1C4487I8S0C6814D9EICUy1m1c1BC2F517676146ES2G6682c15a12y1g1i1GCI2C868066KCM2O9AH2BHH|Zq7@7115414444029|ds7Zf3H1A8A30110|Xy6fv1O2QCCK5U64C2GE2BEF4FMB374DEZ2o1l1NRCD2937F58L750323QF790HC3OZ12V6D4LA72R8F0V85M1c18KHZ1d3v2Z1NL5B0945614D4353519P05IZ2FJ1BCJGJ0913J5555034D59N53Hl175HL3037DD7L0D7VHD17Ah13VA325BHD152Hr14B7990315f1CR6360873750034H634D631D6HA77D2H67C2812B7J1D4l1J73DHTBd1F925612D454P392H5790FD1BF1F90BDJ8R7H6D3J2BER6d1C95D55B1J7B9130TBVB0538N1D37911525A90395DP076B1n12F39Gb10593F07B13452B792J1L4543S52705D309EF2955CFDH0Ry156505573B9194n15922Bi17GH8729F907J1333D2B834737JBCF6X133JD1H056505D359NF07HT29A389295DD5992D3D99VB9F0BV117751BAL3B2JCB6B6JAH81MAO2C4A3636N1B752763079NEFC3ID1761a61m1DS0g2F25l2GJ5HJR5n1DF1N73B27DP1F4J5JT9d18l1GJG3CCAa12834B7901A46OY1EC6CG0452F6p1Nb1DLF3FH4X1IEC4OGC424323G0Y1GW11K286T6d1291B756L2532537D57B0B95L2FGD6e1EGG36500755D2J7D2J19416463CB2DQ42g1DE42CE7S0W1CEAA305C90505D941408448089I06CA2856LCZ1E313141c1BE76315V5j1LD4DI96923271LAEAE32S38H6L0l1ENS3Ag1244DGEASBMX1Y1B1A8EC4784893DN73LM2CM3j1GJGSMW1362585194DC2IK4K56258JA8I0E8870Jl1DA1y14KGAC062H6F7D41A780SW13e10Y1FE214949ABY1109J95R3D21CL656CEUBA8H6FA8COE3A4AFKD2132551H2TC5C8AF7X155311C3695750D8580848g2k1FG2CU6U1U8883I8882E3Dd1994B57V721U2C68W1E2430LBTBF03A266CK4W1280CF8184EK0SEW1B36NEL24E4CS6Y1I6E2GF4h1O4QG46M9I2EEA6IC00E7A0E6GE0DK04E6A5AH267e1B3B27AGGI2C84E315BB5B4DCF251FJ53R1L6CG9096381C7K1E6AEg1Cc11CQIIa12KTe21E8W1JY10A6C5E6GM3G6Am1C4COAg1KM3IOY1GEGm16Y10CGY1IG2E5A3W1EEEU0C4G9I0e1DW20I3a14SQK8o10K38BG3S26C88A4I8C2W18O2AEE2e1Qs20W17M8OGG2C28Ds18q10OAW1B85C1A4KC2AKQc40OBs16o11q1Bi17s256|js6na53x6f13d14NEV990D6L3f18T2L8d105218C8K5OAK582C268A2A10Dc1324NIL69C0OM65A8684AR67N18DG3E90583U2C6W19A70962MGz2U987E2C44e2M220634N4N1L5L4983A2C46K266NIK4I960I8QO82QH81UAG7|pn6hi597F5FCP7V4543ABAK6s25E729|nc7jd4D3J2PCIa14S3C2MAG6K3822U7M16P4317932745TBABC5CH9DJ70D33|te7nv42F5V03633F9DF15A0A5A2844288ANB3L59N2F8733A68I04CFEEAA3E21AB446OC3E88G4K56b1|_h7hu4903IEQ285GG6Od10J55T7|je7hb5W13e19K7W1Lf1658NCf12RGFG6283G745|_e7xt411X10983EFQ1C44M688811FC96H436P|xZ7Zd549K2K1SL959DF7R3505682A82AL0523707D2741MF1FGJ4GCO085Q31A628165|vf7hX54HE3A9BJ3BF0FO7QA6812882|vv6ph5m29O6K067LBO3A537OD232BH4BAP4P0784E91J8925DIHN4LC1AF15694684II3|Z_6xe5O7E02BDDX1ER255B13ANG8AE6i17G7|jc7tg433J51985AH4J673D5115P22CB6DMRSE61AK881C42K84A089C33B|Xa7zh4N7B2563EGG2C62I3OB23LN|lg7fi450386249|fh7h@43994386C06U3759107|rg7pu417PNB7D4GC38B668k1825|tg7lr4517A64C2G103J7|ff7de4F114A44143|Zc7Xi451BI4AA2470J|_e7dW50753B4B7H49BD916ESC3UCC067|ng7bz4J734D0CW1i1749L9|rc7ze445B053H406S443|rd7fY5J4765CC3MB2015|de7vk4D594B108IO0E88A2493HAF1373|bp6pk5P482M04173|tl6ni5755212C88133|xz6jh587C1c16EF15H5521434B1L456JAJ33624g11|do6fk5R8ICCF13|_m6w3s1j1S2c1KC5473F82CGQOSG80QKI0A68ACW1u1M462Kr14B44I3CHe10c1h1i1FM4460EDc11IJa12E3I4c1X1A0A84Y1C2ICQ5Y1AQ88CC488I1A4AEGACC2A38385482K3C2A6A169853X19JU5E93FIRBNHB2NDX11VCVC70b1A509C3UVS7A980A8G0461AA46AK5A06CI6K0OOO8A9I3M46184k1962420GFK5224AA2A42MBa1444G6A0A6ADG16BA1C9U7c1O25O3G8CDQ1UOAG06EQASGIGY1IG6EA6AI2880E9ABEf12d16JW1r237C329CHS3MB8N1Pd1Vj1z153D3DHH3BVTZ11PJF1D3333J4h1JY10C7Q6UIY1Ie1S6977896PAF1BUPSGC2S7e1IHr15N7DC66AOw1MASY1C0ED2AA4B404188A38EA18CE82068485GAC5C6E9382442E1E9I04380KJK5K005I067K7E780A1AJ4F42AKA4UP6155C6CJ0BBF93AB8EE86JD30759Dz1SQEe186C1199F23QM81E8Q22864i17QB87a1DO0C6G587G3G1C6W12e16q15@2r1Y1PK5i1n1OHIJW1BCJM1MBE3i10I4i15EDGTEz1CL6b14L414P7j14NBf1Jr1HTPTFF71546935HNFDHPZ1JHDFN11520BDJ314I337D293FLh1X1n1LNFB901KHE3BB583257D09JL3L42655D0R454A23Bz16x1Cx1H_1DZ21D6b1BDJFHP7b14_17T55F9DL5N991B7DJLHB3DDJ7P4n1B7v1LRR0F439Fx21B61448167051154D15Z2974U614F4H197L2R53309C795T3PJ91973BJ4V3t2h1RPf2n1938119RP326AL2534753F0984DK18323DLB11360453NB78D1TCn1352B5H4P1P7N9B0Dl1TLJNRTh1Pz1Vl1TZ1NL_1f1NL16281E62A3A6C2OMG8AE2M64C14KG8AC3S4063424C1672TD721AD45G522JCB793D0F781F77152733l1R3L997H4J47LRFh1FPPPj1X1F80m16Ca1W1BCB4NIFY1FATADCLQV8DC5374769INIJHJ30O36DGX2q1J0739DX1238KEIQSIQW148OKIQIG6A8406M0183426OCECA6E46AC6AEG4A6O4GG41SGCO3E8q1DQ7U52565076R994700EIW116Ii23I88JEH8Z1FL3F2543S7A2G3A0G9S4K78381A3636d14B8383271BDT3T891L4F8F374164C062G1K6E168G1E5C1I541KBG3E608AE424ROY1Y2841C30KW2867APy1F0d1S7s1CK2MJ3Z565k2X1c1U21k1Hi18G9Ov1Uh15P2VS18N2VE70PK3E50B392X1K92F5l189ITMH69O700ADK1C380C6A1C9e1CO2C1C2E9G91557054L1X2BD7d1RTBFBDHB2N3NRTB91BAb16f24PBB1B478970u38C3G6A93x1l1Z13v100G765M54h1Ab10MU0CLS965A08HE9QDE6C0494HI460CO87M4IQMIA82AA0C9OQk1Aq1I6Y1Sq1SW14s1AIIe12GDC26584w1s93A0A987G2C3ERIFI2e2Q2W1CK9C4162EFKr102W2U8M5o307C6E61AHA3C6QSG443Ob1272h1K4|Xx4LM086K0s17I525BT512B39BJDB493777B332985H90F81B57L7PA33d1398Fk14CC1241290761C2Q662M68ICM4@19|xf4fe221L534CAC5|vt4lo2115ECA437H|jj4pg20532B134GI6915|Xh4b9994Q861L|Xv3ze13106A82A4327D9|nv3Zg1353238448007|di4Z477524CA103|jx4Q43DL7170B6L00A6AG1O8E3|bz4Y693523A0A84814J|f@4DPHBA4CG4I007|lw4BP1D4CCM6A1250555|nz4E1DH60EGC4O44212V7B|ty4e1931G26K62BBB|_X5l491EQCC0MEMC8G2ABBZ130DJHBJ9|lt4ts2752OCI45BN25|dv6rs10CBE24ICOW1IC1GKE78L478Jo1COCGJS2G864EMM2CCA9I9UAI0@1CCA8088Av2w4a10c15C9A2UCOSO4C1EIGCUCe1SE8Y2CM2638066A2AF1D2B1BBNAd12B590B472BEJ0980ANI5ULAHm17G6A1Y1JA1C4604DQJ80W1DO127W1RQ1i16w1TAN7FIh12j1T1Y1b16j2a55K41LBJ8r1e1RG0Qx18975J_1402B73X1X2SN13D379502G3Ix2s1v21l5X1Ff1Z1n10n1b1r3789Gp2031929155Rp15LRy1d1Cj20VQB4DVZ197HNF19DFn1590760W17G1S983M5E1W1Na1B40I8APG1404867MG6481ABEMW1b1U9EDa23E48LC3GDG1C|_p5f@23317HJ396B0D7B4B39FT87035DDF250J459V4d17BB033Br1Ed10D35736FILq1LMBOFCH2DJL1HCNIFE5K2236Z11B39Z1l1VT9F3H97r1Rn2Nn2FX4Fl10N4L4BAF2358B3H47A1EBB0A75Z1D7BT1F29GL5D97t1JP5d10F0x1Ol1A6652J5771LEj12H5L8Da1F80215705G1W14440AJ044g1AC5692B1T79X17927A1C76F6H1F9F139e1DU5B9d1BDBRR3J6P5B4B9JRH5DA73Bt14b1LZ17VVX1l12J8He2t1C3Y25E5CH3L9DF7H343O483479399b1P_1Rf1X1LR1543Bp1DBLBB0LCHM2917V5c1063CBp1LFJ5RJFG2ET4D39d13E1E5E283QX1UR3516f2GR0l1EZ625228HEB4DGAO085418862C5O5494B3N1L9729I5K5CBC1K4C9M2C8628W120CAGW1CAA4E1EAAE66E1A7A941AIU08OG6AE40656062IKE445Y1BGKC4838741C4E44K208GA1A78FIh181CA1o16A3A24C680656x160SEIBG661ADG0AE40618R67A2M1K8A1C36248CG0A406Fc14A1G2o15C08EQA6049A1626A2482E7O64C0CW10U24CAK8C2AE26BA5e1DS1C4K5E8I7SEK0CGAG22CGEA0681I4A3Q361E5216GACe1IU4EK83m12E8K1C72B1581I8E985I2E543E54181E6048785054BS2O4I42A08A3CIk1060261E2CI16944W19i128IE8W10E8MEE4840IM86Im164AOE6436066K6240AFKBK2CGKHa26O486264343E52360A6COMw2a1a1e3JIEG2AOG8Ia1AEW1C3W1Pk20e1BSx16MSq166A2A142q20MTODGHUh1OJG923UFC949K9Y19O5E2M9e2j1k1LK5GBM1I5E9IH670DHFDTLH7J0NDJ23B59F75154Bi14Y13g1BS3E4Q5C48187626AGCK0I960868K648CS626GC26C4Ea14U2g180A3SA856065618TEP7p14DBNRF32FFN395F39DB559D395DBNB154327L0057359HFHPNJ37PVRHHPJD|ns6jh54y6SNAH96937B4783O0GPc2l1i1H@1Vo1Bc12A083FJD3l10t1Bx1Ej38h13|rf6_g5A1@1213D5X12V9B8MA|hX6jw32552B658K523";

/* ---------------------------------------------------------------- decoding */

const ALPHA =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_`{|}~";
const AIDX = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHA.length; i++) t[ALPHA.charCodeAt(i)] = i;
  return t;
})();

function decodeGrid() {
  const g = new Uint8Array(GW * GH);
  const runs = [];
  let p = 0, i = 0;
  while (i < RLE.length) {
    const v = AIDX[RLE.charCodeAt(i)];
    i++;
    let n = 0;
    while (i < RLE.length) {
      const c = RLE.charCodeAt(i);
      if (c < 48 || c > 57) break;
      n = n * 10 + (c - 48);
      i++;
    }
    let left = n;
    while (left > 0) {
      const row = (p / GW) | 0, col = p - row * GW;
      const len = Math.min(left, GW - col);
      if (v) {
        g.fill(v, p, p + len);
        runs.push(row, col, len, v);
      }
      p += len;
      left -= len;
    }
  }
  return { g, rowRuns: Int32Array.from(runs) };
}

const VA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@_";
const VIDX = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < VA.length; i++) t[VA.charCodeAt(i)] = i;
  return t;
})();

const DEG = 180 / Math.PI;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * DEG;
const mercLat = (y) => (360 / Math.PI) * Math.atan(Math.exp(y / DEG)) - 90;

function decodeBorders() {
  const rings = [];
  for (const part of BORDERS.split("|")) {
    const pts = [];
    let i = 0, x = 0, y = 0, which = 0;
    while (i < part.length) {
      let v = 0, sh = 0;
      for (;;) {
        const d = VIDX[part.charCodeAt(i)];
        i++;
        v |= (d & 31) << sh;
        sh += 5;
        if (d < 32) break;
      }
      const n = v & 1 ? -((v + 1) >> 1) : v >> 1;
      if (which === 0) { x += n; which = 1; }
      else { y += n; which = 0; pts.push(x / 50, mercY(y / 50)); }
    }
    if (pts.length >= 8) rings.push(Float64Array.from(pts));
  }
  return rings;
}

/* ------------------------------------------------------------- static data */

const { g: GRIDDATA, rowRuns: ROWRUNS } = decodeGrid();
const RINGS = decodeBorders();

const YE = (() => {
  const a = new Float64Array(GH + 1);
  for (let i = 0; i <= GH; i++) a[i] = mercY(LAT1 - i / PPD);
  return a;
})();

const MX0 = LON0, MX1 = LON0 + GW / PPD;
const MY1 = YE[0], MY0 = YE[GH];
const MAP_W = MX1 - MX0, MAP_H = MY1 - MY0;
const ASPECT = MAP_W / MAP_H;

const ZBYK = Object.fromEntries(ZONES.map((z) => [z.k, z]));
const ZIDX = Object.fromEntries(ZONES.map((z, i) => [z.k, i + 1]));
const PBYI = (() => {
  const a = new Array(PATCHES.length + 1).fill(null);
  for (const p of PATCHES) a[p.i] = p;
  return a;
})();
const ZONE_OF = (() => {
  const a = new Uint8Array(PATCHES.length + 1);
  for (const p of PATCHES) a[p.i] = ZIDX[p.z];
  return a;
})();
const ISL = (() => {
  const a = new Uint8Array(PATCHES.length + 1);
  for (const p of PATCHES) a[p.i] = p.isl;
  return a;
})();
const ALL_IDS = PATCHES.map((p) => p.i);
const EMPTY = new Set();
const ZONE_COUNT = ZONES.map((z) => PATCHES.filter((p) => p.z === z.k).length);

/* region outlines, derived from the grid at load — never stored */
const OUTLINES = (() => {
  const zi = new Uint8Array(GW * GH);
  for (let i = 0; i < zi.length; i++) zi[i] = ZONE_OF[GRIDDATA[i]];
  const vert = [], horz = [];
  for (let c = 0; c <= GW; c++) {
    let start = -1;
    for (let r = 0; r <= GH; r++) {
      let edge = false;
      if (r < GH) {
        const a = c > 0 ? zi[r * GW + c - 1] : 0;
        const b = c < GW ? zi[r * GW + c] : 0;
        edge = a !== b;
      }
      if (edge && start < 0) start = r;
      else if (!edge && start >= 0) { vert.push(c, start, r); start = -1; }
    }
  }
  for (let r = 0; r <= GH; r++) {
    let start = -1;
    for (let c = 0; c <= GW; c++) {
      let edge = false;
      if (c < GW) {
        const a = r > 0 ? zi[(r - 1) * GW + c] : 0;
        const b = r < GH ? zi[r * GW + c] : 0;
        edge = a !== b;
      }
      if (edge && start < 0) start = c;
      else if (!edge && start >= 0) { horz.push(r, start, c); start = -1; }
    }
  }
  return { vert: Int32Array.from(vert), horz: Int32Array.from(horz) };
})();

/* ------------------------------------------------------------- hit testing */

function cellAt(lon, lat) {
  const c = Math.floor((lon - LON0) * PPD);
  const r = Math.floor((LAT1 - lat) * PPD);
  if (c < 0 || c >= GW || r < 0 || r >= GH) return -1;
  return r * GW + c;
}

function resolveTap(lon, lat, rad, preferZone) {
  const k = cellAt(lon, lat);
  if (k < 0) return 0;
  const here = GRIDDATA[k];
  const r0 = (k / GW) | 0, c0 = k - r0 * GW;

  if (here) {
    if (preferZone === "ET" && ZONE_OF[here] !== ZIDX.ET) {
      const box = 5;
      for (let d = 1; d <= box; d++) {
        for (let dr = -d; dr <= d; dr++)
          for (let dc = -d; dc <= d; dc++) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
            const r = r0 + dr, c = c0 + dc;
            if (r < 0 || r >= GH || c < 0 || c >= GW) continue;
            const v = GRIDDATA[r * GW + c];
            if (v && ZONE_OF[v] === ZIDX.ET) return v;
          }
      }
    }
    return here;
  }

  /* open water: near-miss credit for island regions only */
  let fallback = 0;
  for (let d = 1; d <= rad; d++) {
    for (let dr = -d; dr <= d; dr++)
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || r >= GH || c < 0 || c >= GW) continue;
        const v = GRIDDATA[r * GW + c];
        if (!v || !ISL[v]) continue;
        if (preferZone && PBYI[v].z === preferZone) return v;
        if (!fallback) fallback = v;
      }
    if (fallback && d >= rad) break;
  }
  return fallback;
}

function nearestZonePatch(lon, lat, zoneKey, solved) {
  const zi = ZIDX[zoneKey];
  const cx = (lon - LON0) * PPD, cy = (LAT1 - lat) * PPD;
  let best = 0, bd = Infinity;
  for (let r = 0; r < GH; r++) {
    const dy = r + 0.5 - cy, dy2 = dy * dy;
    if (dy2 > bd) continue;
    const base = r * GW;
    for (let c = 0; c < GW; c++) {
      const v = GRIDDATA[base + c];
      if (!v || ZONE_OF[v] !== zi) continue;
      if (solved && solved.has(v)) continue;
      const dx = c + 0.5 - cx;
      const d = dx * dx + dy2;
      if (d < bd) { bd = d; best = v; }
    }
  }
  return best;
}

/* ------------------------------------------------------------------ answer */

function normalise(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
}
const ALIASES = (() => {
  const m = new Map();
  for (const z of ZONES) for (const a of z.al) m.set(normalise(a), z.k);
  return m;
})();

/* ------------------------------------------------------------------- utils */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => n.toLocaleString("en-US");
function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/* ---------------------------------------------------------- scroll stick */
/* The map is deliberately tall and carries touch-action: none, so a vertical
   swipe over it pans the map and can never scroll the page. This is the way
   out: a fixed, vertical-only joystick that scrolls whatever is underneath it,
   including the map. Deflection sets speed, so a 40 px throw covers any page
   length. Hidden on the two-column layout, where the page fits. */
function ScrollStick() {
  const rootRef = useRef(null);
  const nubRef = useRef(null);
  const [active, setActive] = useState(false);
  const [live, setLive] = useState(false);
  const st = useRef({ down: false, y0: 0, offset: 0, raf: 0 });
  const TRAVEL = 40, TOP_SPEED = 26;

  const scroller = useCallback(() => {
    let el = rootRef.current && rootRef.current.parentElement;
    while (el && el !== document.body) {
      const o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 4)
        return el;
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }, []);

  useEffect(() => {
    const check = () => {
      const el = scroller();
      setLive(el.scrollHeight - el.clientHeight > 8);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, [scroller]);

  const step = useCallback(() => {
    const o = st.current.offset;
    if (o) {
      const f = Math.min(Math.abs(o) / TRAVEL, 1);
      scroller().scrollTop += Math.sign(o) * Math.pow(f, 1.7) * TOP_SPEED;
    }
    st.current.raf = requestAnimationFrame(step);
  }, [scroller]);

  const stop = useCallback(() => {
    st.current.down = false;
    st.current.offset = 0;
    if (st.current.raf) cancelAnimationFrame(st.current.raf);
    st.current.raf = 0;
    if (nubRef.current) nubRef.current.style.transform = "translateY(0px)";
    setActive(false);
  }, []);
  useEffect(() => stop, [stop]);

  const onDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    st.current.down = true;
    st.current.y0 = e.clientY;
    st.current.offset = 0;
    setActive(true);
    if (!st.current.raf) st.current.raf = requestAnimationFrame(step);
  };
  const onMove = (e) => {
    if (!st.current.down) return;
    const d = clamp(e.clientY - st.current.y0, -TRAVEL, TRAVEL);
    st.current.offset = d;
    if (nubRef.current) nubRef.current.style.transform = `translateY(${d}px)`;
  };
  const onKey = (e) => {
    const el = scroller();
    const page = Math.max(120, el.clientHeight * 0.8);
    const by =
      e.key === "ArrowDown" ? 110 : e.key === "ArrowUp" ? -110 :
      e.key === "PageDown" ? page : e.key === "PageUp" ? -page : 0;
    if (!by) return;
    e.preventDefault();
    el.scrollTop += by;
  };

  return (
    <div
      ref={rootRef}
      className={"ad-stick" + (live ? "" : " off")}
      role="button"
      tabIndex={0}
      aria-label="Scroll the page. Drag up or down, or use the arrow keys."
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={onKey}
    >
      <span className="ad-stickarrow" aria-hidden="true">&#9650;</span>
      <span className={"ad-nub" + (active ? " on" : "")} ref={nubRef} aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="ad-stickarrow" aria-hidden="true">&#9660;</span>
    </div>
  );
}

/* =========================================================== the component */

export default function AtlasDrillSouthAmerica() {
  const [style, setStyle] = useState("find");        // find | name
  const [session, setSession] = useState("practice"); // practice | climb
  const [showClim, setShowClim] = useState(false);
  const [showNatl, setShowNatl] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);

  const [queue, setQueue] = useState(() => shuffle(ALL_IDS));
  const [solved, setSolved] = useState(() => new Set());
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [phase, setPhase] = useState("ask");          // ask | right | wrong
  const [result, setResult] = useState(null);
  const [nudge, setNudge] = useState("");
  const [praise, setPraise] = useState(null);
  const [typed, setTyped] = useState("");
  const [flash, setFlash] = useState(null);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const nextRef = useRef(null);
  const viewRef = useRef({ k: 1, ox: MX0, oy: MY1, z: 1 });
  const sizeRef = useRef({ w: 320, h: 480 });
  const [, forceDraw] = useState(0);
  const redraw = useCallback(() => forceDraw((n) => n + 1), []);

  const target = queue[0];
  const targetPatch = PBYI[target] || PATCHES[0];
  const targetZone = targetPatch.z;
  const climb = session === "climb";

  /* ------------------------------------------------------------ view maths */
  const baseK = useCallback(() => {
    const { w, h } = sizeRef.current;
    return Math.min(w / MAP_W, h / MAP_H);
  }, []);

  const clampView = useCallback(() => {
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    const vw = w / v.k, vh = h / v.k;
    if (vw >= MAP_W) v.ox = MX0 + (MAP_W - vw) / 2;
    else v.ox = clamp(v.ox, MX0, MX1 - vw);
    if (vh >= MAP_H) v.oy = MY1 - (MAP_H - vh) / 2;
    else v.oy = clamp(v.oy, MY0 + vh, MY1);
  }, []);

  const resetView = useCallback(() => {
    const v = viewRef.current;
    v.z = 1;
    v.k = baseK();
    v.ox = MX0 + (MAP_W - sizeRef.current.w / v.k) / 2;
    v.oy = MY1 - (MAP_H - sizeRef.current.h / v.k) / 2;
    clampView();
    redraw();
  }, [baseK, clampView, redraw]);

  const zoomAbout = useCallback(
    (px, py, factor) => {
      const v = viewRef.current;
      const nz = clamp(v.z * factor, 1, 14);
      if (nz === v.z) return;
      const mx = v.ox + px / v.k, my = v.oy - py / v.k;
      v.z = nz;
      v.k = baseK() * nz;
      v.ox = mx - px / v.k;
      v.oy = my + py / v.k;
      clampView();
      redraw();
    },
    [baseK, clampView, redraw]
  );

  /* --------------------------------------------------------- size observer */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (!w) return;
      const h = clamp(w / ASPECT, 260, 700);
      el.style.height = h + "px";
      const first = sizeRef.current.w === 320 && sizeRef.current.h === 480;
      sizeRef.current = { w, h };
      if (first || viewRef.current.z === 1) resetView();
      else { viewRef.current.k = baseK() * viewRef.current.z; clampView(); redraw(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseK, clampView, resetView, redraw]);

  /* -------------------------------------------------------------- painting */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = viewRef.current;
    const k = v.k;
    const SX = (mx) => (mx - v.ox) * k;
    const SY = (my) => (v.oy - my) * k;

    ctx.fillStyle = C.ocean;
    ctx.fillRect(0, 0, w, h);

    const highlight = style === "name" && phase === "ask" ? target : 0;
    /* The climb keeps every region it has found; practice hands the slate back. */
    const painted = climb ? solved : EMPTY;
    /* A wrong answer holds its marks until Next: red where they tapped, green
       on the region they were looking for. A flash would be missed. */
    const wantId = phase === "wrong" && result ? result.want : 0;
    const pickId = phase === "wrong" && result ? result.picked : 0;

    for (let i = 0; i < ROWRUNS.length; i += 4) {
      const row = ROWRUNS[i], col = ROWRUNS[i + 1], len = ROWRUNS[i + 2], pid = ROWRUNS[i + 3];
      const y0 = SY(YE[row]);
      if (y0 > h) continue;
      const y1 = SY(YE[row + 1]);
      if (y1 < 0) continue;
      const x0 = SX(LON0 + col / PPD);
      if (x0 > w) continue;
      const x1 = SX(LON0 + (col + len) / PPD);
      if (x1 < 0) continue;

      let fill;
      if (pid === wantId) fill = C.green;
      else if (pid === pickId) fill = C.red;
      else if (flash && flash.ids.has(pid)) fill = flash.ok ? C.green : C.red;
      else if (pid === highlight) fill = C.cream;
      else if (painted.has(pid)) fill = ZBYK[PBYI[pid].z].c;
      else fill = C.land;
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y0, x1 - x0 + 0.7, y1 - y0 + 0.7);
    }

    if (showClim) {
      ctx.save();
      ctx.strokeStyle = C.clim;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 0.9;
      ctx.setLineDash([3, 2.4]);
      ctx.beginPath();
      const { vert, horz } = OUTLINES;
      for (let i = 0; i < vert.length; i += 3) {
        const x = SX(LON0 + vert[i] / PPD);
        if (x < -2 || x > w + 2) continue;
        const a = SY(YE[vert[i + 1]]), b = SY(YE[vert[i + 2]]);
        if (b < -2 || a > h + 2) continue;
        ctx.moveTo(x, a); ctx.lineTo(x, b);
      }
      for (let i = 0; i < horz.length; i += 3) {
        const y = SY(YE[horz[i]]);
        if (y < -2 || y > h + 2) continue;
        const a = SX(LON0 + horz[i + 1] / PPD), b = SX(LON0 + horz[i + 2] / PPD);
        if (b < -2 || a > w + 2) continue;
        ctx.moveTo(a, y); ctx.lineTo(b, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (showNatl) {
      ctx.save();
      ctx.strokeStyle = C.natl;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 0.75;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (const ring of RINGS) {
        for (let i = 0; i < ring.length; i += 2) {
          const x = SX(ring[i]), y = SY(ring[i + 1]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }

    /* locator rings for regions too small to see */
    const ring = (p, colour, r) => {
      ctx.beginPath();
      ctx.arc(SX(p.mk[0]), SY(mercY(p.mk[1])), r, 0, Math.PI * 2);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    if (v.z < 3)
      for (const p of PATCHES)
        if (p.isl && painted.has(p.i)) ring(p, ZBYK[p.z].c, 7);
    if (highlight && targetPatch.km < 40000) ring(targetPatch, C.cream, 9);
    if (wantId && PBYI[wantId].km < 40000) ring(PBYI[wantId], C.green, 9);
    if (pickId && PBYI[pickId].km < 40000) ring(PBYI[pickId], C.red, 9);
    if (flash)
      for (const id of flash.ids)
        if (PBYI[id].km < 40000) ring(PBYI[id], flash.ok ? C.green : C.red, 9);
  });

  /* ------------------------------------------------------------- gestures */
  const gest = useRef({ mode: null, x: 0, y: 0, d: 0, moved: 0, lastTouch: 0 });

  const toLonLat = (px, py) => {
    const v = viewRef.current;
    return [v.ox + px / v.k, mercLat(v.oy - py / v.k)];
  };
  const localPos = (e, t) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [t.clientX - r.left, t.clientY - r.top];
  };
  const isReset = (e) => e.target && e.target.closest && e.target.closest(".ad-reset");

  const onTouchStart = (e) => {
    if (isReset(e)) return;
    const g = gest.current;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      g.mode = "pinch";
      g.d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const r = canvasRef.current.getBoundingClientRect();
      g.x = (a.clientX + b.clientX) / 2 - r.left;
      g.y = (a.clientY + b.clientY) / 2 - r.top;
    } else {
      const [x, y] = localPos(e, e.touches[0]);
      g.mode = "maybe";
      g.x = x; g.y = y; g.moved = 0;
    }
  };
  const onTouchMove = (e) => {
    const g = gest.current;
    if (!g.mode) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (g.mode !== "pinch") { g.mode = "pinch"; g.d = d; return; }
      if (g.d > 0) zoomAbout(g.x, g.y, d / g.d);
      g.d = d;
      return;
    }
    const [x, y] = localPos(e, e.touches[0]);
    if (g.mode === "maybe") {
      g.moved += Math.hypot(x - g.x, y - g.y);
      if (g.moved > 10) g.mode = "pan";
      else { return; }
    }
    if (g.mode === "pan") {
      e.preventDefault();
      const v = viewRef.current;
      v.ox -= (x - g.x) / v.k;
      v.oy += (y - g.y) / v.k;
      g.x = x; g.y = y;
      clampView();
      redraw();
    }
  };
  const onTouchEnd = (e) => {
    const g = gest.current;
    if (g.mode === "maybe" && g.moved <= 10) {
      g.lastTouch = Date.now();
      answerTap(g.x, g.y);
    }
    if (e.touches.length === 0) g.mode = null;
  };

  const onMouseDown = (e) => {
    if (isReset(e)) return;
    const g = gest.current;
    const [x, y] = localPos(e, e);
    g.mode = "mmaybe"; g.x = x; g.y = y; g.moved = 0;
  };
  const onMouseMove = (e) => {
    const g = gest.current;
    if (g.mode !== "mmaybe" && g.mode !== "mpan") return;
    const [x, y] = localPos(e, e);
    if (g.mode === "mmaybe") {
      g.moved += Math.hypot(x - g.x, y - g.y);
      if (g.moved > 6) g.mode = "mpan";
      else return;
    }
    const v = viewRef.current;
    v.ox -= (x - g.x) / v.k;
    v.oy += (y - g.y) / v.k;
    g.x = x; g.y = y;
    clampView();
    redraw();
  };
  const onMouseUp = (e) => {
    const g = gest.current;
    if (g.mode === "mmaybe" && g.moved <= 6 && Date.now() - g.lastTouch > 600) {
      const [x, y] = localPos(e, e);
      answerTap(x, y);
    }
    g.mode = null;
  };
  const onWheel = (e) => {
    if (isReset(e)) return;
    e.preventDefault();
    const [x, y] = localPos(e, e);
    zoomAbout(x, y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  /* Touch and wheel are registered natively: React attaches these as passive
     listeners, where preventDefault is a no-op, and pinch-zoom needs it. */
  const handlers = useRef({});
  handlers.current = { onTouchStart, onTouchMove, onTouchEnd, onWheel };
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const bind = (n) => (e) => handlers.current[n](e);
    const map = [
      ["touchstart", bind("onTouchStart")],
      ["touchmove", bind("onTouchMove")],
      ["touchend", bind("onTouchEnd")],
      ["touchcancel", bind("onTouchEnd")],
      ["wheel", bind("onWheel")],
    ];
    for (const [k, f] of map) cv.addEventListener(k, f, { passive: false });
    return () => { for (const [k, f] of map) cv.removeEventListener(k, f); };
  }, []);

  /* --------------------------------------------------------- quiz plumbing */
  const advance = (correctId) => {
    setQueue((q) => {
      if (climb) {
        const next = q.filter((id) => id !== correctId);
        return next;
      }
      const rest = q.slice(1);
      return rest.length < 2 ? shuffle(ALL_IDS) : rest;
    });
  };

  const flashFor = (ids, ok) => {
    setFlash({ ids: new Set(ids), ok });
    window.setTimeout(() => setFlash(null), 620);
  };

  /* A correct answer never waits for a button. It flashes, names itself, and
     the next question is already up. The name stays put until the next answer
     replaces it — nothing on screen is on a timer the reader has to beat. */
  const markRight = (pid) => {
    setSolved((s) => new Set(s).add(pid));
    setScore((s) => ({ right: s.right + 1, total: s.total + 1 }));
    setPraise({ n: PBYI[pid].n, z: ZBYK[PBYI[pid].z].n });
    setNudge("");
    flashFor([pid], true);
    advance(pid);
    setResult(null);
    setPhase("ask");
    setTyped("");
  };
  const markWrong = (got, wantId, pickedId) => {
    setScore((s) => ({ right: s.right, total: s.total + 1 }));
    setPraise(null);
    setResult({ got, want: wantId, picked: pickedId || 0 });
    setPhase("wrong");
  };

  function answerTap(px, py) {
    if (style !== "find" || phase !== "ask") return;
    const [lon, lat] = toLonLat(px, py);
    const v = viewRef.current;
    const rad = clamp(Math.round(18 / (v.k / PPD)), 1, 20);
    const pid = resolveTap(lon, lat, rad, targetZone);
    const nearest = nearestZonePatch(lon, lat, targetZone, climb ? solved : null);

    if (!pid) {
      markWrong({ n: "Open water", z: "No region here" }, nearest, 0);
      return;
    }
    if (PBYI[pid].z === targetZone) {
      if (climb && solved.has(pid)) {
        setNudge(`${PBYI[pid].n} is already on the map — find another.`);
        window.setTimeout(() => setNudge(""), 2600);
        return;
      }
      markRight(pid);
      return;
    }
    markWrong({ n: PBYI[pid].n, z: ZBYK[PBYI[pid].z].n }, nearest, pid);
  }

  function answerTyped() {
    if (style !== "name" || phase !== "ask") return;
    const key = ALIASES.get(normalise(typed));
    if (!key) {
      setNudge(
        typed.trim()
          ? `Not a zone name I know. Try a Köppen code (${targetZone.toLowerCase()}), a full name, or open the zone key.`
          : "Type a zone name, or open the zone key below."
      );
      window.setTimeout(() => setNudge(""), 3200);
      return;
    }
    if (key === targetZone) markRight(target);
    else markWrong({ n: ZBYK[key].n, z: ZBYK[key].kop }, target, 0);
  }

  const next = () => {
    if (climb) setQueue((q) => (q.length > 1 ? [...q.slice(1), q[0]] : q));
    else
      setQueue((q) => {
        const rest = q.slice(1);
        return rest.length < 2 ? shuffle(ALL_IDS) : rest;
      });
    setPhase("ask");
    setResult(null);
    setTyped("");
  };

  /* Focus moves on the next turn of the event loop, never inside the keydown
     that caused it — otherwise the same Enter that submits an answer also
     activates the Next button that has just appeared under it. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (phase !== "ask" && nextRef.current) nextRef.current.focus();
      if (phase === "ask" && style === "name" && inputRef.current)
        inputRef.current.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [phase, style]);

  const changeStyle = (s) => {
    setStyle(s);
    setPraise(null);
    setPhase("ask");
    setResult(null);
    setTyped("");
    setQueue((q) => (q.length ? q : shuffle(ALL_IDS)));
  };
  const changeSession = (s) => {
    setSession(s);
    setPraise(null);
    setSolved(new Set());
    setScore({ right: 0, total: 0 });
    setQueue(shuffle(ALL_IDS));
    setPhase("ask");
    setResult(null);
    setTyped("");
  };

  const done = climb && queue.length === 0;
  const metres = Math.round((solved.size / ALL_IDS.length) * SUMMIT);
  const frac = solved.size / ALL_IDS.length;
  const camp = CAMPS.filter((c) => frac >= c[1]).pop() || CAMPS[0];

  const remaining = useMemo(() => {
    const m = {};
    for (const z of ZONES)
      m[z.k] = PATCHES.filter(
        (p) => p.z === z.k && !(climb && solved.has(p.i))
      ).length;
    return m;
  }, [solved, climb]);

  /* ------------------------------------------------------------------ view */
  const detail = result ? PBYI[result.want] : null;

  return (
    <div className="ad-root">
      <style>{CSS}</style>
      <div className="ad-panel">
        <header className="ad-head">
          <h1>Atlas Drill</h1>
          <p className="ad-sub">
            South American climates · Köppen–Geiger · {ALL_IDS.length} regions
          </p>
        </header>

        <div className="ad-modes">
          <div className="ad-seg" role="group" aria-label="Answering style">
            {[["find", "Find it"], ["name", "Name it"]].map(([k, l]) => (
              <button key={k} className={style === k ? "on" : ""}
                aria-pressed={style === k} onClick={() => changeStyle(k)}>{l}</button>
            ))}
          </div>
          <div className="ad-seg" role="group" aria-label="Session type">
            {[["practice", "Practice"], ["climb", "Aconcagua"]].map(([k, l]) => (
              <button key={k} className={session === k ? "on" : ""}
                aria-pressed={session === k} onClick={() => changeSession(k)}>{l}</button>
            ))}
          </div>
        </div>

        {climb ? (
          <div className="ad-climb">
            <div className="ad-climbtop">
              <span className="ad-alt">{fmt(metres)} m</span>
              <span className="ad-camp">{camp[0]}</span>
            </div>
            <div className="ad-bar">
              <div className="ad-fill" style={{ width: `${frac * 100}%` }} />
              {CAMPS.map(([n, f]) => (
                <span key={n} className={"ad-tick" + (frac >= f ? " on" : "")}
                  style={{ left: `${f * 100}%` }} />
              ))}
            </div>
            <div className="ad-climbfoot">
              {solved.size} of {ALL_IDS.length} regions · summit {fmt(SUMMIT)} m
            </div>
          </div>
        ) : (
          <div className="ad-score">
            {score.right} / {score.total}
            <span>
              {score.total ? Math.round((score.right / score.total) * 100) : 0}%
            </span>
          </div>
        )}

        <div className="ad-grid">
          {/* --- ask ------------------------------------------------------ */}
          <section className="ad-ask">
            {done ? (
              <div className="ad-summit">
                <h2>Cumbre</h2>
                <p>
                  All {ALL_IDS.length} regions found. The climate map of South
                  America is yours — 6,961 metres.
                </p>
                <dl className="ad-tally">
                  <div><dt>Guesses</dt><dd>{score.total}</dd></div>
                  <div><dt>Misses</dt><dd>{score.total - score.right}</dd></div>
                  <div><dt>Accuracy</dt><dd>
                    {score.total ? Math.round((score.right / score.total) * 100) : 100}%
                  </dd></div>
                </dl>
                <button className="ad-primary" onClick={() => changeSession("climb")}>
                  Climb again
                </button>
              </div>
            ) : style === "find" ? (
              <>
                <p className="ad-prompt-l">Find a region of</p>
                <p className="ad-prompt">{ZBYK[targetZone].n}</p>
                <p className="ad-koppen">{ZBYK[targetZone].kop}</p>
                {phase === "ask" && (
                  <p className="ad-hint">
                    {remaining[targetZone]}{" "}
                    {climb ? "still unfound" : "on the map"} · tap any of them
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="ad-prompt-l">Name the climate of</p>
                <p className="ad-prompt">the highlighted region</p>
                <input
                  ref={inputRef}
                  className="ad-input"
                  value={typed}
                  disabled={phase !== "ask"}
                  placeholder="e.g. savanna, BWk, páramo"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") answerTyped(); }}
                />
                <button className="ad-primary" disabled={phase !== "ask"} onClick={answerTyped}>
                  Answer
                </button>
              </>
            )}
            {praise && !done && (
              <p className="ad-praise">
                <strong>{praise.n}</strong>
                <em>{praise.z}</em>
              </p>
            )}
            {nudge && <p className="ad-nudge">{nudge}</p>}
          </section>

          {/* --- map ------------------------------------------------------ */}
          <section className="ad-mapcol">
            <div className="ad-mapwrap" ref={wrapRef}>
              <canvas
                ref={canvasRef}
                className="ad-canvas"
                role="img"
                aria-label="Map of South America. Every region starts slate grey and takes its true Köppen colour only once you identify it."
                style={{ touchAction: "none" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={() => (gest.current.mode = null)}
              />
              {viewRef.current.z > 1 && (
                <button className="ad-reset" onClick={resetView}>Reset view</button>
              )}
            </div>
            <div className="ad-toggles">
              <button className={showClim ? "on" : ""} aria-pressed={showClim}
                onClick={() => { setShowClim(!showClim); redraw(); }}>
                <svg width="18" height="8" aria-hidden="true">
                  <line x1="1" y1="4" x2="17" y2="4" stroke={C.clim} strokeWidth="1.4"
                    strokeDasharray="3 2.4" />
                </svg>
                Climate outlines
              </button>
              <button className={showNatl ? "on" : ""} aria-pressed={showNatl}
                onClick={() => { setShowNatl(!showNatl); redraw(); }}>
                <svg width="18" height="8" aria-hidden="true">
                  <line x1="1" y1="4" x2="17" y2="4" stroke={C.natl} strokeWidth="1.4" />
                </svg>
                Borders
              </button>
            </div>
          </section>

          {/* --- answer --------------------------------------------------- */}
          <section className="ad-answer">
            {phase !== "ask" && (
              <>
                <button ref={nextRef} className="ad-primary ad-next" onClick={next}>
                  Next
                </button>
                <div className="ad-cards">
                  <div className="ad-card bad">
                    <span className="ad-cardl">You picked</span>
                    <strong>{result.got.n}</strong>
                    <em>{result.got.z}</em>
                  </div>
                  <div className="ad-card good">
                    <span className="ad-cardl">Correct answer</span>
                    <strong>{detail ? detail.n : "—"}</strong>
                    {detail && <em>{ZBYK[detail.z].n}</em>}
                  </div>
                </div>
                {detail && (
                  <div className="ad-detail">
                    <p>{detail.d}</p>
                    <dl>
                      <div><dt>Area</dt><dd>{fmt(detail.km)} km²</dd></div>
                      <div><dt>Zone</dt><dd>{ZBYK[detail.z].n} · {ZBYK[detail.z].kop}</dd></div>
                      <div><dt>Ecoregions</dt><dd>{ZBYK[detail.z].wwf}</dd></div>
                      <div className="wide"><dt>Countries</dt><dd>{detail.cs.join(" · ")}</dd></div>
                    </dl>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="ad-key">
          <button className="ad-keybtn" aria-expanded={keyOpen}
            onClick={() => setKeyOpen(!keyOpen)}>
            Zone key <span>{keyOpen ? "−" : "+"}</span>
          </button>
          {keyOpen && (
            <ul className="ad-keylist">
              {ZONES.map((z, i) => (
                <li key={z.k}>
                  <span className="ad-sw" style={{ background: z.c }} />
                  <span className="ad-kn">{z.n}</span>
                  <span className="ad-kk">{z.kop}</span>
                  <span className="ad-kc">
                    {climb ? `${remaining[z.k]} left` : ZONE_COUNT[i]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="ad-foot">
          Climate grid resampled from the Köppen–Geiger classification of Beck et
          al. (2018) by majority vote to 1/9°. Borders from Natural Earth 1:50m,
          decorative only. The Galápagos and Juan Fernández are absent from the
          source raster used here and so are absent from the drill.
        </footer>
      </div>
      <ScrollStick />
    </div>
  );
}

/* ------------------------------------------------------------------- style */

const CSS = `
.ad-root{background:${C.page};min-height:100%;padding:18px 0 40px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:#dfe4ee;-webkit-font-smoothing:antialiased;}
.ad-panel{background:${C.panel};border:1px solid ${C.rule};border-radius:14px;
  max-width:640px;margin:0 auto;padding:20px;}
.ad-root *{box-sizing:border-box;}
.ad-root button:focus-visible,.ad-root input:focus-visible{outline:2px solid ${C.amber};outline-offset:2px;}
.ad-head h1{font-family:Georgia,"Times New Roman",serif;font-size:26px;margin:0;
  color:${C.cream};font-weight:400;letter-spacing:.2px;}
.ad-sub{margin:4px 0 0;color:${C.ink};font-size:12.5px;}
.ad-modes{display:flex;gap:8px;margin:16px 0 12px;flex-wrap:wrap;}
.ad-seg{display:flex;background:#151a25;border:1px solid ${C.rule};border-radius:9px;padding:2px;}
.ad-seg button{background:none;border:0;color:${C.ink};font-size:13px;padding:6px 12px;
  border-radius:7px;cursor:pointer;transition:background .15s,color .15s;}
.ad-seg button.on{background:${C.amber};color:#151a25;font-weight:600;}
.ad-score{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;
  color:${C.cream};display:flex;gap:10px;align-items:baseline;margin-bottom:12px;}
.ad-score span{color:${C.amber};font-size:13px;}
.ad-climb{margin-bottom:14px;}
.ad-climbtop{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.ad-alt{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:19px;color:${C.amber};}
.ad-camp{font-family:Georgia,serif;font-size:13px;color:${C.cream};}
.ad-bar{position:relative;height:6px;background:#151a25;border-radius:3px;overflow:visible;}
.ad-fill{position:absolute;left:0;top:0;bottom:0;background:${C.amber};border-radius:3px;
  transition:width .35s ease;}
.ad-tick{position:absolute;top:-3px;width:1px;height:12px;background:${C.rule};}
.ad-tick.on{background:${C.cream};opacity:.75;}
.ad-climbfoot{margin-top:7px;color:${C.ink};font-size:11.5px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.ad-grid{display:block;}
.ad-ask{margin-bottom:12px;}
.ad-prompt-l{margin:0;color:${C.ink};font-size:12px;text-transform:uppercase;letter-spacing:.09em;}
.ad-prompt{margin:2px 0 0;font-family:Georgia,serif;font-size:23px;color:${C.cream};line-height:1.2;}
.ad-koppen{margin:3px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:12.5px;color:${C.amber};}
.ad-hint{margin:6px 0 0;color:${C.ink};font-size:12.5px;}
.ad-nudge{margin:9px 0 0;color:${C.amber};font-size:12.5px;line-height:1.45;}
.ad-praise{margin:9px 0 0;padding-left:9px;border-left:3px solid ${C.green};}
.ad-praise strong{display:block;font-family:Georgia,serif;font-weight:400;
  font-size:15px;color:${C.cream};line-height:1.25;}
.ad-praise em{display:block;font-style:normal;color:${C.ink};font-size:12px;margin-top:2px;}
.ad-tally{display:flex;gap:22px;margin:12px 0 0;}
.ad-tally dt{color:${C.ink};font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;}
.ad-tally dd{margin:2px 0 0;font-size:17px;color:${C.amber};
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.ad-input{width:100%;margin-top:10px;background:#151a25;border:1px solid ${C.rule};
  border-radius:9px;padding:11px 12px;color:${C.cream};font-size:16px;
  font-family:Georgia,serif;}
.ad-input::placeholder{color:#5c667c;}
.ad-primary{width:100%;margin-top:8px;background:${C.amber};color:#151a25;border:0;
  border-radius:9px;padding:11px;font-size:15px;font-weight:600;cursor:pointer;}
.ad-primary:disabled{opacity:.4;cursor:default;}
.ad-mapwrap{position:relative;width:100%;}
.ad-canvas{width:100%;height:100%;display:block;border-radius:10px;background:${C.ocean};
  border:1px solid ${C.rule};}
.ad-reset{position:absolute;left:8px;bottom:8px;background:rgba(27,33,46,.92);
  border:1px solid ${C.rule};color:${C.cream};font-size:11.5px;padding:5px 9px;
  border-radius:7px;cursor:pointer;}
.ad-toggles{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
.ad-toggles button{display:flex;align-items:center;gap:7px;background:#151a25;
  border:1px solid ${C.rule};color:${C.ink};font-size:12px;padding:6px 10px;
  border-radius:8px;cursor:pointer;}
.ad-toggles button.on{color:${C.cream};border-color:#3d4761;background:#1f273600;}
.ad-answer{margin-top:12px;}
.ad-next{margin-top:0;}
.ad-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
.ad-card{background:#151a25;border-radius:9px;padding:9px 11px;border-left:3px solid ${C.rule};}
.ad-card.bad{border-left-color:${C.red};}
.ad-card.good{border-left-color:${C.green};}
.ad-cardl{display:block;color:${C.ink};font-size:11px;text-transform:uppercase;letter-spacing:.08em;}
.ad-card strong{display:block;font-family:Georgia,serif;font-weight:400;font-size:15px;
  color:${C.cream};margin-top:3px;line-height:1.25;}
.ad-card em{display:block;font-style:normal;color:${C.ink};font-size:12px;margin-top:2px;}
.ad-detail{margin-top:10px;background:#151a25;border:1px solid ${C.rule};border-radius:10px;padding:12px;}
.ad-detail p{margin:0;font-size:13.5px;line-height:1.55;color:#c8cfdd;}
.ad-detail dl{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin:11px 0 0;}
.ad-detail dl .wide{grid-column:1/-1;}
.ad-detail dt{color:${C.ink};font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;}
.ad-detail dd{margin:2px 0 0;font-size:12.5px;color:#c8cfdd;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.ad-summit h2{font-family:Georgia,serif;font-weight:400;color:${C.amber};font-size:24px;margin:0;}
.ad-summit p{color:#c8cfdd;font-size:14px;line-height:1.5;margin:6px 0 0;}
.ad-key{margin-top:16px;border-top:1px solid ${C.rule};padding-top:12px;}
.ad-keybtn{background:none;border:0;color:${C.ink};font-size:12.5px;cursor:pointer;
  padding:0;display:flex;gap:7px;align-items:center;}
.ad-keybtn span{font-family:ui-monospace,monospace;color:${C.amber};}
.ad-keylist{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px 26px;
  grid-template-columns:repeat(auto-fill,minmax(300px,1fr));}
.ad-keylist li{display:grid;grid-template-columns:12px 1fr auto auto;gap:9px;align-items:center;}
.ad-sw{width:12px;height:12px;border-radius:3px;}
.ad-kn{font-size:12.5px;color:#c8cfdd;}
.ad-kk,.ad-kc{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:${C.ink};white-space:nowrap;}
.ad-kn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ad-kc{color:${C.amber};min-width:44px;text-align:right;}
.ad-foot{margin-top:14px;color:#5c667c;font-size:10.5px;line-height:1.55;}
.ad-stick{position:fixed;right:12px;bottom:16px;z-index:20;width:38px;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;
  padding:5px 0;height:124px;border-radius:19px;background:rgba(27,33,46,.93);
  border:1px solid ${C.rule};box-shadow:0 4px 14px rgba(0,0,0,.4);
  touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;}
.ad-stick.off{display:none;}
.ad-stick:active{cursor:grabbing;}
.ad-stickarrow{color:${C.ink};font-size:8px;line-height:1;opacity:.65;}
.ad-nub{width:28px;height:28px;border-radius:14px;background:${C.amber};
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  transition:transform .18s ease,box-shadow .18s ease;}
.ad-nub.on{transition:none;box-shadow:0 0 0 5px rgba(227,165,66,.22);}
.ad-nub i{display:block;width:11px;height:1.5px;border-radius:1px;background:#151a25;opacity:.75;}
@media (min-width:1000px){.ad-stick{display:none;}}
@media (max-width:999px){.ad-foot{padding-right:54px;}}
@media (max-width:559px){
  .ad-root{padding:0 0 30px;}
  .ad-panel{border:0;border-radius:0;max-width:none;padding:16px 14px 22px;}
  .ad-mapcol{margin:0 -14px;}
  .ad-canvas{border-radius:0;border-left:0;border-right:0;}
  .ad-toggles{padding:0 14px;}
}
@media (min-width:1000px){
  .ad-panel{max-width:820px;}
  .ad-grid{display:grid;grid-template-columns:minmax(0,1fr) 336px;
    grid-template-rows:auto 1fr;gap:16px 20px;align-items:start;}
  .ad-mapcol{grid-column:1;grid-row:1/3;}
  .ad-ask{grid-column:2;grid-row:1;margin-bottom:0;}
  .ad-answer{grid-column:2;grid-row:2;margin-top:0;}
  .ad-cards{grid-template-columns:1fr;}
  .ad-detail dl{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion:reduce){
  .ad-root *{transition:none !important;animation:none !important;}
}
`;
