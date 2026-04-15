export interface ScoutTake {
  title: string
  metro: string
  paragraphs: string[]
  pipeline: {
    elementary: string
    middle: string
    high: string
  }
}

export const SCOUT_TAKES: Record<string, ScoutTake> = {

  'mar-vista': {
    title: "Scout's Take: Mar Vista",
    metro: 'los-angeles',
    paragraphs: [
      "Mar Vista families face the classic Westside dilemma: excellent elementary schools that feed into middle schools with a significant academic drop-off. Your zoned elementary is likely Mar Vista Elementary — a top-10% LAUSD school with GATE/SAS designation and 86% math proficiency. The challenge starts at 6th grade, when the default feeder is Mark Twain Middle (46% math) or Marina del Rey Middle (12% math). Most families start researching middle school options by 3rd grade.",
      "The three most common strategies: (1) transfer to SMMUSD for the John Adams Middle to Samohi pipeline, (2) apply to LAUSD magnet programs at Palms Middle (Gifted Magnet) or Mark Twain (IHP/Mandarin), or (3) go private for middle school. Our SMMUSD Transfer Blueprint and LAUSD School Choice Blueprint walk through each path.",
      "For elementary, you have strong options beyond your zoned school. Grand View Boulevard offers the only Spanish dual language immersion in the 90066 ZIP. Walgrove is the whole-child, 10-acre outdoor campus. Beethoven has SAS designation with STEAM programs. Charter options like CWC Mar Vista and Ocean Charter offer lottery-based alternatives.",
      "Start with your zoned school's deep dive below, then explore alternatives. The comparison table inside each report shows how they stack up.",
    ],
    pipeline: {
      elementary: "Mar Vista Elementary (zoned) — 86% math, GATE/SAS, top 10% LAUSD",
      middle: "Mark Twain Middle (default feeder) — 46% math, IHP + Mandarin Magnet",
      high: "Venice High (default feeder) — 92% graduation, STEMM + World Languages",
    },
  },

  'playa-vista': {
    title: "Scout's Take: Playa Vista",
    metro: 'los-angeles',
    paragraphs: [
      "Playa Vista families have one of the newest and strongest LAUSD elementaries on the Westside. Playa Vista Elementary posts 70% math and 77% ELA in a modern campus built for the Silicon Beach community. The tech-forward environment (1:1 Chromebooks, VR headsets, coding lab) reflects the neighborhood.",
      "The pipeline challenge is the same as Mar Vista: the default middle school feeder is Marina del Rey Middle (12% math), the steepest elementary-to-middle drop in our coverage. Most Playa Vista families pursue inter-district transfers to SMMUSD or CCUSD, LAUSD magnet programs, or private middle school. Start planning by 3rd grade.",
      "For families considering alternatives at the elementary level, Playa del Rey Elementary is a small gem nearby with strong parent sentiment, and charter options like WISH (TK-12 pipeline, lottery) serve the broader Westchester/Playa area.",
    ],
    pipeline: {
      elementary: "Playa Vista Elementary (zoned) — 70% math, tech-forward, Silicon Beach",
      middle: "Marina del Rey Middle (default) — 12% math — most families transfer out",
      high: "Venice High (default) — 92% graduation, STEMM + World Languages",
    },
  },

  'venice': {
    title: "Scout's Take: Venice",
    metro: 'los-angeles',
    paragraphs: [
      "Venice has the widest range of elementary school personalities on the Westside. Broadway Elementary (79% math) is the academic standout with Mandarin and Spanish dual language tracks. Westminster Avenue is the STEAM magnet on Abbot Kinney where the test scores undersell the experience. Walgrove is the 10-acre whole-child campus. Coeur d'Alene is the small community school families love.",
      "The pipeline: most Venice elementaries feed into Mark Twain Middle and then Venice High School. Venice High offers STEMM and World Languages magnets and graduates students at a 92% rate. The middle school transition is where families need to be proactive — Mark Twain's IHP and Mandarin Magnet tracks offer a very different experience from the general education track.",
      "Venice is also gentrifying rapidly, which means the parent demographics and school fundraising capacity are shifting. Westminster's location on Abbot Kinney and Broadway's dual language programs are increasingly attracting families who would have defaulted to private school a decade ago.",
    ],
    pipeline: {
      elementary: "Varies — Broadway, Westminster, Walgrove, Coeur d'Alene (by address/magnet)",
      middle: "Mark Twain Middle — 46% math, IHP + Mandarin + Dual Language tracks",
      high: "Venice High — 92% graduation, STEMM + World Languages Magnets",
    },
  },

  'palms': {
    title: "Scout's Take: Palms & Cheviot Hills",
    metro: 'los-angeles',
    paragraphs: [
      "The Palms/Cheviot Hills corridor has some of the highest-performing LAUSD elementaries in the city. Overland Avenue (90% math) is the #3 elementary in all of LAUSD. Castle Heights (76% math) combines SAS designation with Spanish dual language immersion. Clover Avenue (72% math) is the community-driven school with the beloved STAR after-school program.",
      "The pipeline question here is about middle school options. Depending on your exact address, you may feed into Palms Middle (SAS, Gifted Magnet), Emerson Community Charter, or Mark Twain Middle. Hamilton High School's Music Academy and Humanities Magnet are strong program tracks. The LACES lottery (gifted 6-12) is a common aspiration for families in this area.",
      "For families who want the pipeline solved: Culver City is right across the border and offers a complete K-12 district pipeline (Farragut to CCMS to CCHS) with no transfer anxiety.",
    ],
    pipeline: {
      elementary: "Overland (90% math), Castle Heights (76%), or Clover (72%) by address",
      middle: "Palms Middle (SAS/Gifted Magnet) or Emerson — varies by address",
      high: "Hamilton High — Music Academy + Humanities Magnet",
    },
  },

  'westchester': {
    title: "Scout's Take: Westchester & Playa del Rey",
    metro: 'los-angeles',
    paragraphs: [
      "Westchester families have access to some unique options that don't exist elsewhere on the Westside. WISH Charter (60% math, TK-12) offers the only continuous charter pipeline from kindergarten through high school graduation in this area — with a 1,300-student waitlist and a full inclusion model. Westchester Enriched Sciences Magnets (WESM) provides a STEM-focused 6-12 pathway.",
      "The neighborhood elementary options include Playa del Rey Elementary (a tiny gem with 64% math and the highest per-student spending on the Westside) and Short Avenue (one of the most improved LAUSD schools in our coverage). The charter lottery is competitive but worth pursuing — apply to WISH, CWC, and Ocean Charter simultaneously.",
      "For Playa del Rey specifically: the pipeline concern is real. PdR Elementary is beloved (4.8/5 parent rating) but feeds into Marina del Rey Middle (12% math). Start middle school planning early.",
    ],
    pipeline: {
      elementary: "Varies — Playa del Rey, Short Ave, or WISH (lottery)",
      middle: "Marina del Rey MS (default) or WISH 6-8 (if enrolled), WESM 6-12 (magnet)",
      high: "Westchester HS, WESM, or WISH Academy (if enrolled)",
    },
  },

  'santa-monica': {
    title: "Scout's Take: Santa Monica",
    metro: 'los-angeles',
    paragraphs: [
      "Santa Monica has the strongest public school pipeline on the Westside. Every SMMUSD elementary feeds into either John Adams Middle (back-to-back California Distinguished School) or Lincoln Middle, and both feed into Samohi (97.4% graduation rate). The pipeline is the product.",
      "The choice within SMMUSD is about personality. Franklin (84% math) and Roosevelt (72%) are the North of Montana schools — highest scores, most affluent. Grant (70%) is the diverse, balanced option with the legendary music program. McKinley (59%) is the most diverse, only Title I school. Will Rogers (48%) is the IB World School with a Regenerative Farm. Edison is the 90/10 Spanish immersion lottery school.",
      "For families outside SMMUSD trying to get in: our SMMUSD Transfer Blueprint is the definitive guide. The permit requires both an LAUSD outgoing permit (February-April) and SMMUSD acceptance (May-June). Grant and Will Rogers may have more transfer capacity than Franklin.",
    ],
    pipeline: {
      elementary: "Franklin, Roosevelt, Grant, McKinley, Will Rogers, or Edison (by address/lottery)",
      middle: "John Adams Middle or Lincoln Middle (by attendance zone)",
      high: "Santa Monica High School (Samohi) — 97.4% graduation rate",
    },
  },

  'malibu': {
    title: "Scout's Take: Malibu",
    metro: 'los-angeles',
    paragraphs: [
      "Malibu families are part of SMMUSD, which means access to the same district pipeline that ends at Samohi. Webster Elementary and Malibu schools serve a small, tight-knit community. The SMMUSD Board voted in late 2025 to explore district separation — if that moves forward, the pipeline could change.",
      "For now, Malibu students benefit from SMMUSD's district-wide enrichment, music programs, and the pipeline to Samohi. Watch the separation discussion closely.",
    ],
    pipeline: {
      elementary: "Webster Elementary or other Malibu campus (by address)",
      middle: "Malibu MS pathway",
      high: "Samohi — for now, pending district separation discussion",
    },
  },

  'culver-city': {
    title: "Scout's Take: Culver City",
    metro: 'los-angeles',
    paragraphs: [
      "Culver City is the Westside's most complete public school pipeline in a single district. Every CCUSD elementary feeds into Culver City Middle School, which feeds into Culver City High School. No lottery, no transfer paperwork, no middle school anxiety. Enroll in kindergarten and the pipeline carries you through 12th grade.",
      "The elementary choice: Farragut (77% math) is the academic leader. El Marino Language School is the dual immersion gem — Japanese and Spanish tracks, lottery admission. La Ballona (38% math) has the lowest scores but the most enthusiastic parent reviews, with a Spanish DL program and a culture families describe as transformative.",
      "For LAUSD families considering a transfer: our CCUSD Transfer Blueprint covers the full process. CCUSD has historically been more welcoming to inter-district transfers than SMMUSD.",
    ],
    pipeline: {
      elementary: "Farragut, El Marino, La Ballona, Linwood Howe, or El Rincon",
      middle: "Culver City Middle School",
      high: "Culver City High School",
    },
  },

  'hollywood': {
    title: "Scout's Take: Hollywood",
    metro: 'los-angeles',
    paragraphs: [
      "Hollywood is where school choice gets complicated — and where the right information is worth the most. Zoned schools range from Cheremoya (22% math, but passionate parents and Community School funding) to Gardner (47% math). The gap between your default assignment and what's possible through permits, magnets, and charters is enormous.",
      "The paths families pursue: Wonderland Gifted Magnet (90% math) and Third Street SAS (89%) are the elite public options, both requiring permits or magnet placement. CWC Hollywood and Larchmont Charter offer progressive alternatives. Our Hollywood Hills School Choice Blueprint maps every pathway.",
      "The middle school question looms: Bancroft and Le Conte are the default feeders, and the drop from elite elementaries is steep. LACES (gifted 6-12) is the common aspiration.",
    ],
    pipeline: {
      elementary: "Cheremoya or Gardner (zoned) — Wonderland/Third St (permit/magnet)",
      middle: "Bancroft or Le Conte (default) — LACES lottery is the alternative",
      high: "Hollywood High or Fairfax High (by address)",
    },
  },

  'hancock-park': {
    title: "Scout's Take: Hancock Park",
    metro: 'los-angeles',
    paragraphs: [
      "Hancock Park families have access to Third Street Elementary (89% math, SAS designation), one of the highest-performing public elementaries in all of LAUSD. SAS permits are available for families outside the attendance zone. Hancock Park Elementary and Larchmont corridor charter options add to the landscape.",
      "The middle school pipeline feeds into Bancroft or Le Conte, with LACES as the gifted 6-12 alternative. Our Hollywood Hills Blueprint covers the full decision tree.",
    ],
    pipeline: {
      elementary: "Third Street Elementary (89% math, SAS permits available)",
      middle: "Bancroft Middle (default feeder)",
      high: "Fairfax High or Hollywood High (by address)",
    },
  },

  'los-feliz': {
    title: "Scout's Take: Los Feliz",
    metro: 'los-angeles',
    paragraphs: [
      "Ivanhoe Elementary (78% math, #17 in LAUSD) is the standout — families buy houses specifically for this attendance zone. Beyond Ivanhoe, Los Feliz families explore the Hollywood charter options (CWC Hollywood, Larchmont) and the NELA schools.",
      "Glenfeliz Elementary is the other Los Feliz option — known for its unique garden/culinary curriculum. The middle school transition is the key planning moment — start researching by 3rd grade.",
    ],
    pipeline: {
      elementary: "Ivanhoe (78% math, #17 LAUSD) or Glenfeliz (by address)",
      middle: "Thomas Starr King or other LAUSD middle (by zone)",
      high: "John Marshall or other LAUSD high (by zone)",
    },
  },

  'silver-lake': {
    title: "Scout's Take: Silver Lake",
    metro: 'los-angeles',
    paragraphs: [
      "Silver Lake families have strong charter options alongside traditional LAUSD schools. CWC Silver Lake offers the CWC model through 8th grade with a brand-new middle school campus. Micheltorena Elementary is the neighborhood Title I school where free before/after care and field trips come with the territory.",
      "The charter lottery landscape is active — CWC Silver Lake, Larchmont, and other options serve central LA families. Apply to multiple simultaneously. Our Charter and Magnet Playbook covers the full strategy.",
    ],
    pipeline: {
      elementary: "Micheltorena (zoned) or CWC Silver Lake (charter, TK-8)",
      middle: "CWC Silver Lake 6-8 (if enrolled) or LAUSD middle by zone",
      high: "LAUSD high by zone or Larchmont 9-12 (charter)",
    },
  },

  'eagle-rock': {
    title: "Scout's Take: Eagle Rock",
    metro: 'los-angeles',
    paragraphs: [
      "Eagle Rock offers strong NELA school options at a fraction of Westside housing costs. Eagle Rock Elementary provides both neighborhood and gifted programming. Dahlia Heights is the community-driven school with active PTA engagement.",
      "The crown jewel is Eagle Rock High School — IB Diploma program, 18 AP courses, strong arts, 73% AP participation. For families who want a rigorous high school without the Westside price tag, Eagle Rock High delivers.",
    ],
    pipeline: {
      elementary: "Eagle Rock Elementary, Dahlia Heights, or others by address",
      middle: "Thomas Starr King Middle — GAT programming available",
      high: "Eagle Rock High — IB Diploma + 18 AP courses",
    },
  },

  'highland-park': {
    title: "Scout's Take: Highland Park",
    metro: 'los-angeles',
    paragraphs: [
      "Highland Park is one of LA's fastest-gentrifying neighborhoods, and the school landscape is evolving with it. The NELA pipeline feeds into Eagle Rock High School's IB program. For families priced out of Silver Lake or Los Feliz, Highland Park offers comparable access to NELA schools at lower housing costs.",
    ],
    pipeline: {
      elementary: "Yorkdale or other LAUSD elementary by address",
      middle: "LAUSD middle school by zone",
      high: "Eagle Rock High (IB, AP) or Franklin High by zone",
    },
  },

  'atwater-village': {
    title: "Scout's Take: Atwater Village",
    metro: 'los-angeles',
    paragraphs: [
      "Atwater Village sits between Silver Lake, Los Feliz, and Eagle Rock school zones. The small-town village feel attracts families who want community-oriented schooling. The NELA pipeline — through Thomas Starr King Middle and Eagle Rock High — is the most common path. Charter options from Silver Lake and Hollywood corridors are also within reach.",
    ],
    pipeline: {
      elementary: "LAUSD elementary by address",
      middle: "Thomas Starr King or LAUSD middle by zone",
      high: "Eagle Rock High or John Marshall by zone",
    },
  },

  'south-pasadena': {
    title: "Scout's Take: South Pasadena",
    metro: 'los-angeles',
    paragraphs: [
      "South Pasadena is the most self-contained school district in our database. Three elementaries feed into one middle school, which feeds into one high school. No lottery anxiety, no transfer paperwork, no middle school drop-off.",
      "South Pasadena High posts a 96% graduation rate and 73% AP participation. Housing averages $1.5-2.5M — significantly less than Manhattan Beach or Santa Monica for comparable school quality.",
    ],
    pipeline: {
      elementary: "Marengo, Arroyo Vista, or Monterey Hills (by address)",
      middle: "South Pasadena Middle School",
      high: "South Pasadena High — 96% graduation, 73% AP participation",
    },
  },

  'brentwood': {
    title: "Scout's Take: Brentwood",
    metro: 'los-angeles',
    paragraphs: [
      "Kenter Canyon Elementary (80% math, 10/10 GreatSchools) is the school that makes Brentwood parents skip private school. This LAUSD charter delivers elite academics at zero tuition. Multiple families describe it as comparable to local privates charging $40-50K.",
      "The pipeline through Paul Revere Middle and Palisades Charter High or University High is stronger than most LAUSD corridors. The Brentwood pipeline doesn't have the middle school cliff that Mar Vista and Venice face.",
      "The private comparison: Brentwood School ($49-53K) and Windward ($53K) are in the neighborhood. Kenter Canyon delivers comparable outcomes for free — if you're in the zone.",
    ],
    pipeline: {
      elementary: "Kenter Canyon Elementary — 80% math, 10/10 GreatSchools",
      middle: "Paul Revere Charter Middle School",
      high: "Palisades Charter High or University High (by address)",
    },
  },

  'palisades': {
    title: "Scout's Take: Pacific Palisades",
    metro: 'los-angeles',
    paragraphs: [
      "Palisades Charter Elementary (73% math) delivers a private-school experience at zero tuition. Parents consistently advise saving tuition money for middle or high school. The Palisades village community rallies around the school like Manhattan Beach rallies around MBUSD.",
      "The pipeline through Paul Revere Middle and Palisades Charter High is one of the strongest LAUSD trajectories. Marquez Charter Elementary is the other Palisades option, serving the canyon communities.",
    ],
    pipeline: {
      elementary: "Palisades Charter Elementary or Marquez Charter (by address)",
      middle: "Paul Revere Charter Middle School",
      high: "Palisades Charter High School",
    },
  },

  'manhattan-beach': {
    title: "Scout's Take: Manhattan Beach",
    metro: 'los-angeles',
    paragraphs: [
      "Manhattan Beach has the highest-performing public elementary schools in our entire database. All four MBUSD elementaries post 85%+ math. The district is funded by MBEF ($4M+ annually) — essentially a private school subsidy at public schools.",
      "The pipeline is solved: any MBUSD elementary feeds into Manhattan Beach Middle, then Mira Costa High (77% AP participation). No middle school anxiety. The trade-off is real estate — homes average $3-4M+. For families outside MBUSD, inter-district transfers are extremely rare.",
    ],
    pipeline: {
      elementary: "Grand View, Meadows, Pacific, or Robinson (by address)",
      middle: "Manhattan Beach Middle School",
      high: "Mira Costa High School — 77% AP participation",
    },
  },

  'hermosa-beach': {
    title: "Scout's Take: Hermosa Beach",
    metro: 'los-angeles',
    paragraphs: [
      "Hermosa Beach runs a unique three-campus K-8 system. All public school kids go through Hermosa View (K-2), Hermosa Vista (3-5), then Hermosa Valley (6-8) together. By 8th grade, they share a remarkably tight cohort bond. Strong academics (80%+ math at elementary) with a beach-town community feel.",
      "After 8th grade, Hermosa students go to Redondo Union High School. The HBCSD-to-RBUSD transition is smooth.",
    ],
    pipeline: {
      elementary: "Hermosa View (K-2) then Hermosa Vista (3-5) — one path for everyone",
      middle: "Hermosa Valley School (6-8)",
      high: "Redondo Union High School (RBUSD)",
    },
  },

  'redondo-beach': {
    title: "Scout's Take: Redondo Beach",
    metro: 'los-angeles',
    paragraphs: [
      "Redondo Beach USD is the quiet achiever of the Beach Cities. The district's lowest-ranked elementary still posts 72% math. Tulita (83%), Birney (82%), and Beryl Heights (80%) are all strong.",
      "The pipeline splits by geography: North Redondo feeds into Parras Middle (possibly the most compassionately led middle school in the South Bay) then Redondo Union High. South Redondo feeds into Adams Middle. The Mira Costa option is only for some North Redondo addresses. Our Beach Cities Blueprint covers the North vs. South distinction in detail.",
    ],
    pipeline: {
      elementary: "Tulita, Birney, Beryl Heights, Jefferson, or Madison (by address)",
      middle: "Parras (North) or Adams (South Redondo)",
      high: "Redondo Union High — Mira Costa possible for some North addresses",
    },
  },

  'el-segundo': {
    title: "Scout's Take: El Segundo",
    metro: 'los-angeles',
    paragraphs: [
      "El Segundo is the smallest and most self-contained Beach Cities district. Two elementaries feed into one middle school, then one high school. The small-town identity is real — teachers live in the community and families know each other across grades.",
      "El Segundo High offers strong varsity opportunities at a smaller scale (250-300 per class vs. 500+ at Mira Costa). Lower test scores than Manhattan Beach but more personal attention and significantly lower housing costs.",
    ],
    pipeline: {
      elementary: "Center Street or Richmond Street (by address)",
      middle: "El Segundo Middle School",
      high: "El Segundo High — small school, strong varsity opportunities",
    },
  },

}

// ZIP to town mapping — 5-digit ZIP → town key
export const ZIP_TO_TOWN: Record<string, string> = {
  '90066': 'mar-vista',
  '90094': 'playa-vista',
  '90292': 'playa-vista',
  '90291': 'venice',
  '90034': 'palms',
  '90064': 'palms',
  '90230': 'culver-city',
  '90232': 'culver-city',
  '90045': 'westchester',
  '90293': 'westchester',
  '90266': 'manhattan-beach',
  '90254': 'hermosa-beach',
  '90277': 'redondo-beach',
  '90278': 'redondo-beach',
  '90245': 'el-segundo',
  '90028': 'hollywood',
  '90046': 'hollywood',
  '90068': 'hollywood',
  '90004': 'hancock-park',
  '90020': 'hancock-park',
  '90036': 'hancock-park',
  '90027': 'los-feliz',
  '90039': 'silver-lake',
  '90026': 'silver-lake',
  '90065': 'eagle-rock',
  '90041': 'eagle-rock',
  '90042': 'highland-park',
  '90032': 'highland-park',
  '90030': 'south-pasadena',
  '90049': 'brentwood',
  '90272': 'palisades',
  '90401': 'santa-monica',
  '90402': 'santa-monica',
  '90403': 'santa-monica',
  '90404': 'santa-monica',
  '90405': 'santa-monica',
  '90265': 'malibu',
}
