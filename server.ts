import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

dotenv.config();

const PORT = 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const SEED_IMAGES_DIR = path.join(ROOT_DIR, 'src', 'assets', 'images');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

interface ExifMetadata {
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
}

interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  exif?: ExifMetadata;
}

interface SpotReview {
  id: string;
  authorName: string;
  rating: number;
  conditionTag: string;
  comment: string;
  visitedDate: string;
  createdAt: string;
}

interface PrintOption {
  id: string;
  label: string;
  dimensions: string;
  paper: string;
  price: number;
}

interface LicenseOption {
  id: 'editorial' | 'commercial';
  label: string;
  terms: string;
  price: number;
}

interface PhotoSpot {
  id: string;
  title: string;
  locationName: string;
  country: string;
  region: string;
  category: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  bestTimeToShoot: string;
  accessNotes: string;
  description: string;
  coverUrl: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  photos: GalleryPhoto[];
  exif: ExifMetadata;
  photographer: {
    name: string;
    handle: string;
    homeBase: string;
    payoutAccount: string;
  };
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  reviews: SpotReview[];
  printOptions: PrintOption[];
  licenseOptions: LicenseOption[];
  createdAt: string;
}

interface OrderRecord {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  paymentMethod: 'upi' | 'card' | 'express' | 'bank';
  last4?: string;
  items: Array<{
    id: string;
    spotId: string;
    spotTitle: string;
    photographerName: string;
    coverUrl: string;
    kind: 'print' | 'license';
    optionId: string;
    optionLabel: string;
    unitPrice: number;
    quantity: number;
  }>;
  subtotal: number;
  shippingFee: number;
  platformFee: number;
  photographerPayout: number;
  total: number;
  status: 'Confirmed' | 'Preparing Print' | 'License Issued';
  licenseKeys: Array<{ spotTitle: string; licenseLabel: string; certificateCode: string }>;
}

interface StoreData {
  currency?: 'INR';
  spots: PhotoSpot[];
  orders: OrderRecord[];
  userLikes: Record<string, string[]>;
  userSaves: Record<string, string[]>;
}

function buildPrintOptions(basePrice: number): PrintOption[] {
  return [
    {
      id: 'print-12x18',
      label: '12 × 18 in Archival Rag',
      dimensions: '30 × 45 cm',
      paper: 'Hahnemühle Photo Rag 308gsm',
      price: basePrice,
    },
    {
      id: 'print-20x30',
      label: '20 × 30 in Museum Matte',
      dimensions: '50 × 75 cm',
      paper: 'Canson Platine Fibre Rag',
      price: Math.round(basePrice * 1.9),
    },
    {
      id: 'print-30x45',
      label: '30 × 45 in Gallery Framed',
      dimensions: '76 × 114 cm',
      paper: 'Oak Frame · Anti-Reflective Museum Glass',
      price: Math.round(basePrice * 3.4),
    },
  ];
}

function buildLicenseOptions(editorialPrice: number, commercialPrice: number): LicenseOption[] {
  return [
    {
      id: 'editorial',
      label: 'Editorial Single-Use License',
      terms: 'Editorial print, magazine, or documentary web feature (1-year regional rights)',
      price: editorialPrice,
    },
    {
      id: 'commercial',
      label: 'Commercial Global License',
      terms: 'Unlimited worldwide brand, campaign, OOH, and digital advertising rights',
      price: commercialPrice,
    },
  ];
}

const INITIAL_SPOTS: PhotoSpot[] = [
  {
    id: 'india-pangong-ladakh',
    title: 'Pangong Tso Cobalt Dawn',
    locationName: 'Pangong Tso, Ladakh',
    country: 'India',
    region: 'India',
    category: 'Alpine',
    lat: 33.7595,
    lng: 78.6674,
    elevationMeters: 4225,
    bestTimeToShoot: '05:50 – 06:45 First Himalayan Light',
    accessNotes: 'Requires Inner Line Permit from Leh; acclimate 48 hours in Leh before driving over Chang La pass (5,360 m).',
    description:
      'At 4,225 meters in eastern Ladakh, the brackish waters of Pangong Tso shift from deep sapphire to crystalline turquoise as morning light strikes the barren Karakoram ridges.',
    coverUrl: '/seed-images/spot_india_pangong_1794646501485.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ind-pan-1',
        url: '/seed-images/spot_india_pangong_1794646501485.jpg',
        caption: 'Western shore prayer flags and still reflection near Spangmik.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focalLength: '28mm',
      aperture: 'f/8',
      shutterSpeed: '1/160s',
      iso: '100',
    },
    photographer: {
      name: 'Aarav Kulkarni',
      handle: '@akulkarni',
      homeBase: 'Pune, India',
      payoutAccount: 'acct_akulkarni_verified',
    },
    likesCount: 482,
    savesCount: 356,
    sharesCount: 112,
    reviews: [
      {
        id: 'rev-ind-pan-1',
        authorName: 'Meera Nair',
        rating: 5,
        conditionTag: 'Crisp Himalayan Air',
        comment:
          'Stay overnight in Spangmik or Merak so you can walk down to the shoreline at 05:45 AM before day-trip vehicles arrive from Leh.',
        visitedDate: '2026-06-14',
        createdAt: '2026-06-18T08:30:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4200),
    licenseOptions: buildLicenseOptions(2500, 9500),
    createdAt: '2026-06-05T06:00:00.000Z',
  },
  {
    id: 'india-tajmahal-yamuna',
    title: 'Taj Mahal Across Yamuna Mist',
    locationName: 'Mehtab Bagh Riverbank, Agra',
    country: 'India',
    region: 'India',
    category: 'Architectural',
    lat: 27.1795,
    lng: 78.0421,
    elevationMeters: 169,
    bestTimeToShoot: '06:05 – 06:50 River Mist Dawn',
    accessNotes: 'Shoot from the outer eastern riverbank path just outside Mehtab Bagh gardens for unobstructed water reflections; closed on Fridays for visitors inside.',
    description:
      'Viewed from across the Yamuna River at first light, winter river mist softens the sandstone plinth while warm amber rays illuminate the Makrana marble dome and four minarets.',
    coverUrl: '/seed-images/spot_india_tajmahal_1794646502792.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ind-taj-1',
        url: '/seed-images/spot_india_tajmahal_1794646502792.jpg',
        caption: 'Symmetric reflection framed through riverbank acacias at 06:24 IST.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Sony Alpha 7R V',
      lens: 'FE 50mm f/1.2 GM',
      focalLength: '50mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/250s',
      iso: '160',
    },
    photographer: {
      name: 'Rohan Deshmukh',
      handle: '@rdeshmukh',
      homeBase: 'Mumbai, India',
      payoutAccount: 'acct_rdeshmukh_verified',
    },
    likesCount: 519,
    savesCount: 401,
    sharesCount: 145,
    reviews: [
      {
        id: 'rev-ind-taj-1',
        authorName: 'Ananya Sharma',
        rating: 5,
        conditionTag: 'Dawn Mist',
        comment:
          'November through February gives the best silver mist hovering right above the Yamuna. A 50mm or 85mm prime frames the boatmen cleanly in the foreground.',
        visitedDate: '2026-01-19',
        createdAt: '2026-01-22T09:15:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4500),
    licenseOptions: buildLicenseOptions(2800, 10500),
    createdAt: '2026-01-10T06:00:00.000Z',
  },
  {
    id: 'india-hampi-boulders',
    title: 'Hampi Granite Monoliths at Sunset',
    locationName: 'Hemakuta Hill, Hampi',
    country: 'India',
    region: 'India',
    category: 'Architectural',
    lat: 15.335,
    lng: 76.46,
    elevationMeters: 467,
    bestTimeToShoot: '17:45 – 18:35 Golden Sunset',
    accessNotes: 'Easy 10-minute climb up smooth granite slabs from Hampi Bazaar; bring headlamp for the descent after dusk.',
    description:
      'Balanced Precambrian granite boulders surround the 14th-century Virupaksha gopuram and palm-lined Tungabhadra valley as golden Deccan sunlight rakes across the ruins.',
    coverUrl: '/seed-images/spot_india_hampi_1794646503463.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ind-ham-1',
        url: '/seed-images/spot_india_hampi_1794646503463.jpg',
        caption: 'Overlooking the Virupaksha temple complex from the upper Hemakuta outcrop.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Fujifilm X-T5',
      lens: 'XF 16-55mm f/2.8 R LM WR',
      focalLength: '24mm',
      aperture: 'f/8',
      shutterSpeed: '1/125s',
      iso: '125',
    },
    photographer: {
      name: 'Kavya Subramanian',
      handle: '@kavyasub',
      homeBase: 'Bengaluru, India',
      payoutAccount: 'acct_ksub_verified',
    },
    likesCount: 364,
    savesCount: 278,
    sharesCount: 83,
    reviews: [
      {
        id: 'rev-ind-ham-1',
        authorName: 'Vikramjit Gill',
        rating: 5,
        conditionTag: 'Warm Deccan Light',
        comment:
          'Hemakuta Hill faces west directly into the sunset, while Matanga Hill across the bazaar is unbeatable for sunrise over the river bend.',
        visitedDate: '2026-02-11',
        createdAt: '2026-02-14T18:45:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(3800),
    licenseOptions: buildLicenseOptions(2200, 8500),
    createdAt: '2026-02-08T17:30:00.000Z',
  },
  {
    id: 'india-munnar-tea',
    title: 'Munnar Tea Terraces in Valley Mist',
    locationName: 'Kolukkumalai & Gap Road, Munnar',
    country: 'India',
    region: 'India',
    category: 'Woodland',
    lat: 10.0889,
    lng: 77.0595,
    elevationMeters: 1620,
    bestTimeToShoot: '06:20 – 07:30 Morning Fog',
    accessNotes: 'Accessible via NH85 Gap Road viewpoint; early morning jeep access required for higher Kolukkumalai estate ridges.',
    description:
      'Layered ribbons of emerald tea bushes carve across the Western Ghats ridges while silver monsoon mist floats between shaded valleys.',
    coverUrl: '/seed-images/spot_india_munnar_1794646503213.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ind-mun-1',
        url: '/seed-images/spot_india_munnar_1794646503213.jpg',
        caption: 'Early tea pickers walking contoured ridge paths above low cloud.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 24-105mm f/4 L IS USM',
      focalLength: '42mm',
      aperture: 'f/8',
      shutterSpeed: '1/160s',
      iso: '200',
    },
    photographer: {
      name: 'Siddharth Menon',
      handle: '@smenon',
      homeBase: 'Kochi, India',
      payoutAccount: 'acct_smenon_verified',
    },
    likesCount: 338,
    savesCount: 249,
    sharesCount: 74,
    reviews: [
      {
        id: 'rev-ind-mun-1',
        authorName: 'Priya Venkatesh',
        rating: 5,
        conditionTag: 'Valley Mist',
        comment:
          'Post-monsoon October mornings bring thick cloud inversions below the slopes. Use a 70–200mm lens to isolate the winding estate paths.',
        visitedDate: '2026-10-08',
        createdAt: '2026-10-10T09:20:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(3600),
    licenseOptions: buildLicenseOptions(2200, 8200),
    createdAt: '2026-10-01T07:00:00.000Z',
  },
  {
    id: 'india-varanasi-ghats',
    title: 'Morning Boats at Dashashwamedh Ghat',
    locationName: 'Dashashwamedh & Munshi Ghat, Varanasi',
    country: 'India',
    region: 'India',
    category: 'Coastal',
    lat: 25.3069,
    lng: 83.0104,
    elevationMeters: 81,
    bestTimeToShoot: '05:40 – 06:40 Sunrise on the Ganges',
    accessNotes: 'Walk south from Dashashwamedh toward Munshi Ghat balcony steps for elevated perspective over moored wooden boats.',
    description:
      'Dozens of hand-built wooden rowboats align in rhythmic symmetry beside centuries-old sandstone steps as dawn mist lifts off the Ganges.',
    coverUrl: '/seed-images/spot_india_varanasi_1794646504372.jpg',
    aspectRatio: '3:4',
    photos: [
      {
        id: 'p-ind-var-1',
        url: '/seed-images/spot_india_varanasi_1794646504372.jpg',
        caption: 'Moored boats catching warm morning reflection along Munshi Ghat.',
        aspectRatio: '3:4',
      },
    ],
    exif: {
      camera: 'Leica M11',
      lens: 'Summicron-M 35mm f/2 ASPH',
      focalLength: '35mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/320s',
      iso: '200',
    },
    photographer: {
      name: 'Devika Sen',
      handle: '@devikasen',
      homeBase: 'Kolkata, India',
      payoutAccount: 'acct_dsen_verified',
    },
    likesCount: 447,
    savesCount: 331,
    sharesCount: 109,
    reviews: [
      {
        id: 'rev-ind-var-1',
        authorName: 'Arjun Malhotra',
        rating: 5,
        conditionTag: 'Golden River Haze',
        comment:
          'Walking the ghats on foot from Assi toward Manikarnika between 05:30 and 07:00 gives endless layered frames from both boat decks and upper stone balconies.',
        visitedDate: '2026-03-03',
        createdAt: '2026-03-06T08:00:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(3900),
    licenseOptions: buildLicenseOptions(2400, 8900),
    createdAt: '2026-03-02T06:00:00.000Z',
  },
  {
    id: 'patagonia-fitzroy-laguna',
    title: 'First Light on Cerro Fitz Roy',
    locationName: 'Laguna de los Tres, El Chaltén',
    country: 'Argentina',
    region: 'South America',
    category: 'Alpine',
    lat: -49.2713,
    lng: -73.0432,
    elevationMeters: 1185,
    bestTimeToShoot: '05:45 – 06:30 Sunrise Alpenglow',
    accessNotes: '4-hour steep alpine trek from El Chaltén trailhead; bring headlamp and windproof tripod weight.',
    description:
      'Captured at the eastern shore of Laguna de los Tres twenty minutes before local sunrise. When Patagonian katabatic winds briefly pause, the glacial tarn turns into an unbroken mirror reflecting the granite spires of Fitz Roy and Poincenot.',
    coverUrl: '/seed-images/hero_patagonia_sunrise_1794645831776.jpg',
    aspectRatio: '16:9',
    photos: [
      {
        id: 'p-fitz-1',
        url: '/seed-images/hero_patagonia_sunrise_1794645831776.jpg',
        caption: 'Eastern moraine reflection at 06:12 ART during calm wind window.',
        aspectRatio: '16:9',
      },
      {
        id: 'p-fitz-2',
        url: '/seed-images/spot_dolomites_seceda_1794645832383.jpg',
        caption: 'Companion ridge study from high alpine pass elevation.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 28mm f/4 P',
      focalLength: '28mm',
      aperture: 'f/11',
      shutterSpeed: '1/15s',
      iso: '64',
    },
    photographer: {
      name: 'Mateo Valdivia',
      handle: '@mvaldivia',
      homeBase: 'Mendoza, Argentina',
      payoutAccount: 'acct_mvaldivia_verified',
    },
    likesCount: 418,
    savesCount: 289,
    sharesCount: 94,
    reviews: [
      {
        id: 'rev-fitz-1',
        authorName: 'Claire Moreau',
        rating: 5,
        conditionTag: 'Calm Mirror Water',
        comment:
          'Started hiking from Río Blanco camp at 03:30 AM. The scramble up the final moraine is rocky, but arriving 30 minutes before civil twilight gave us dead-calm water before the wind picked up.',
        visitedDate: '2026-03-14',
        createdAt: '2026-03-19T11:20:00.000Z',
      },
      {
        id: 'rev-fitz-2',
        authorName: 'Kenji Takahashi',
        rating: 5,
        conditionTag: 'Crisp Alpenglow',
        comment:
          '24–35mm is essential here to include both the foreground boulders and the full Fitz Roy massif without distorting the central spire.',
        visitedDate: '2026-02-08',
        createdAt: '2026-02-12T08:10:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4400),
    licenseOptions: buildLicenseOptions(2600, 9800),
    createdAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'lofoten-reine-bluehour',
    title: 'Reinebringen Fjord Blue Hour',
    locationName: 'Reine, Lofoten Archipelago',
    country: 'Norway',
    region: 'Europe',
    category: 'Coastal',
    lat: 67.9325,
    lng: 13.0886,
    elevationMeters: 140,
    bestTimeToShoot: '21:30 – 22:45 Nordic Blue Hour',
    accessNotes: 'Park south of Reine bridge along E10; paved pull-out overlooking Sakrisøy and Olstinden.',
    description:
      'Long-exposure twilight study looking across the sheltered harbour toward Olstinden peak. Warm tungsten light inside the historic red rorbuer fishing cabins balances the deep Arctic cobalt of late winter dusk.',
    coverUrl: '/seed-images/spot_lofoten_fjord_1794645831771.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-lof-1',
        url: '/seed-images/spot_lofoten_fjord_1794645831771.jpg',
        caption: 'Olstinden reflection from the lower granite outcrop above Reine harbour.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Leica SL3',
      lens: 'APO-Summicron-SL 35mm',
      focalLength: '35mm',
      aperture: 'f/8',
      shutterSpeed: '4.0s',
      iso: '100',
    },
    photographer: {
      name: 'Soren Lindqvist',
      handle: '@slindqvist',
      homeBase: 'Tromsø, Norway',
      payoutAccount: 'acct_slindqvist_verified',
    },
    likesCount: 312,
    savesCount: 204,
    sharesCount: 61,
    reviews: [
      {
        id: 'rev-lof-1',
        authorName: 'Hannah Abbott',
        rating: 5,
        conditionTag: 'Still Fjord',
        comment:
          'Much safer in icy winter conditions than climbing the full Reinebringen ridge, and the lower E10 granite ledge gives an even cleaner reflection of the red cabins.',
        visitedDate: '2026-02-22',
        createdAt: '2026-02-25T16:40:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(3900),
    licenseOptions: buildLicenseOptions(2400, 8900),
    createdAt: '2026-02-20T14:00:00.000Z',
  },
  {
    id: 'kyoto-arashiyama-lanterns',
    title: 'Cedar Mist & Mossy Lanterns',
    locationName: 'Saga Toriimoto Path, Kyoto',
    country: 'Japan',
    region: 'Asia',
    category: 'Woodland',
    lat: 35.0218,
    lng: 135.6672,
    elevationMeters: 92,
    bestTimeToShoot: '06:00 – 07:15 Dawn Sunbeams',
    accessNotes: 'Walk 18 minutes north of main bamboo grove before 06:30 to avoid foot traffic; tripods prohibited on narrow shrine stairs.',
    description:
      'Early morning fog drifts through tall Cryptomeria cedar and bamboo stalks along the stone lantern approach in western Kyoto, catching angled golden sunbeams just as temple caretakers sweep the path.',
    coverUrl: '/seed-images/spot_kyoto_dawn_1794645832433.jpg',
    aspectRatio: '3:4',
    photos: [
      {
        id: 'p-kyo-1',
        url: '/seed-images/spot_kyoto_dawn_1794645832433.jpg',
        caption: 'Morning light shafts cutting across wet flagstones at 06:28 JST.',
        aspectRatio: '3:4',
      },
    ],
    exif: {
      camera: 'Fujifilm GFX 100 II',
      lens: 'GF 45mm f/2.8 R WR',
      focalLength: '45mm',
      aperture: 'f/4.5',
      shutterSpeed: '1/125s',
      iso: '320',
    },
    photographer: {
      name: 'Haruka Sato',
      handle: '@harukasato',
      homeBase: 'Kyoto, Japan',
      payoutAccount: 'acct_hsato_verified',
    },
    likesCount: 386,
    savesCount: 342,
    sharesCount: 118,
    reviews: [
      {
        id: 'rev-kyo-1',
        authorName: 'David Park',
        rating: 5,
        conditionTag: 'Dawn Mist',
        comment:
          'Arrive right after light rain the night before—the mist lingers under the canopy until nearly 07:30 and the moss glows emerald.',
        visitedDate: '2026-04-04',
        createdAt: '2026-04-06T07:15:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4100),
    licenseOptions: buildLicenseOptions(2500, 9200),
    createdAt: '2026-04-01T06:00:00.000Z',
  },
  {
    id: 'dolomites-seceda-ridge',
    title: 'Seceda Limestone Crest',
    locationName: 'Seceda Ridge, Val Gardena',
    country: 'Italy',
    region: 'Europe',
    category: 'Alpine',
    lat: 46.6004,
    lng: 11.7244,
    elevationMeters: 2519,
    bestTimeToShoot: '17:30 – 19:00 Late Afternoon',
    accessNotes: 'Ortisei–Furnes–Seceda cable car operates until 17:30 in summer; stay at Rifugio Firenze or hike down via Col Raiser for sunset.',
    description:
      'Standing at 2,519 meters along the Odle massif knife-edge, low clouds sweep across the vertical pale dolomite walls while late afternoon warmth rakes across the steep alpine pasture.',
    coverUrl: '/seed-images/spot_dolomites_seceda_1794645832383.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-dol-1',
        url: '/seed-images/spot_dolomites_seceda_1794645832383.jpg',
        caption: 'Odle peaks catching golden cross-light from the western ridgeline trail.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Sony Alpha 7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLength: '32mm',
      aperture: 'f/9',
      shutterSpeed: '1/200s',
      iso: '100',
    },
    photographer: {
      name: 'Lorenzo Bellini',
      handle: '@lbellini',
      homeBase: 'Bolzano, Italy',
      payoutAccount: 'acct_lbellini_verified',
    },
    likesCount: 274,
    savesCount: 198,
    sharesCount: 54,
    reviews: [
      {
        id: 'rev-dol-1',
        authorName: 'Nina Kowalski',
        rating: 4,
        conditionTag: 'Drifting Clouds',
        comment:
          'Walk 15 minutes past the main viewpoint cross toward Pieralongia to get the clean S-curve trail leading your eye into the spires.',
        visitedDate: '2026-07-11',
        createdAt: '2026-07-14T19:05:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4200),
    licenseOptions: buildLicenseOptions(2400, 8800),
    createdAt: '2026-07-02T12:00:00.000Z',
  },
  {
    id: 'marrakech-medina-archway',
    title: 'Afternoon Geometry in the Medina',
    locationName: 'Riad Zitoun Quarter, Marrakech',
    country: 'Morocco',
    region: 'North Africa',
    category: 'Architectural',
    lat: 31.6229,
    lng: -7.9854,
    elevationMeters: 466,
    bestTimeToShoot: '14:30 – 16:00 High Directional Sun',
    accessNotes: 'Respect local courtyard privacy—request permission from riad hosts before setting up a lens inside residential thresholds.',
    description:
      'High North African afternoon sunlight slices diagonally across earthen lime plaster and hand-cut zellige mosaic tilework, framing a quiet courtyard fountain in deep shadow.',
    coverUrl: '/seed-images/spot_marrakech_arch_1794645833304.jpg',
    aspectRatio: '3:4',
    photos: [
      {
        id: 'p-mar-1',
        url: '/seed-images/spot_marrakech_arch_1794645833304.jpg',
        caption: 'Threshold study showing contrast between sun-baked sandstone and shaded interior.',
        aspectRatio: '3:4',
      },
    ],
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 50mm f/1.4 ASPH',
      focalLength: '50mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/500s',
      iso: '125',
    },
    photographer: {
      name: 'Yasmine El-Fassi',
      handle: '@yelfassi',
      homeBase: 'Marrakech, Morocco',
      payoutAccount: 'acct_yelfassi_verified',
    },
    likesCount: 229,
    savesCount: 164,
    sharesCount: 47,
    reviews: [
      {
        id: 'rev-mar-1',
        authorName: 'Tomasz Zielinski',
        rating: 5,
        conditionTag: 'Harsh Sun Contrast',
        comment:
          'Expose for the sunlit sandstone doorway and pull shadows gently in post; the tilework detail holds up remarkably well.',
        visitedDate: '2026-05-03',
        createdAt: '2026-05-05T15:30:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(3700),
    licenseOptions: buildLicenseOptions(2200, 8200),
    createdAt: '2026-05-01T10:30:00.000Z',
  },
  {
    id: 'iceland-reynisfjara-basalt',
    title: 'Reynisfjara Basalt & Atlantic Surf',
    locationName: 'Reynisfjara Beach, Vík',
    country: 'Iceland',
    region: 'Europe',
    category: 'Coastal',
    lat: 63.4057,
    lng: -19.0716,
    elevationMeters: 4,
    bestTimeToShoot: 'Overcast Midday or Low Tide',
    accessNotes: 'Stay at least 30 meters back from breaking sneaker waves; waterproof tripod legs and microfiber lens cloths required for sea spray.',
    description:
      'Hexagonal volcanic basalt columns rise beside wet obsidian sand as North Atlantic swells sweep past the Reynisdrangar sea stacks under low storm clouds.',
    coverUrl: '/seed-images/spot_iceland_basalt_1794645832897.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ice-1',
        url: '/seed-images/spot_iceland_basalt_1794645832897.jpg',
        caption: 'Receding wave sheen mirroring the basalt sea stacks at low tide.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Nikon Z8',
      lens: 'NIKKOR Z 14-24mm f/2.8 S',
      focalLength: '20mm',
      aperture: 'f/11',
      shutterSpeed: '1/15s',
      iso: '64',
    },
    photographer: {
      name: 'Elena Rostova',
      handle: '@erostova',
      homeBase: 'Reykjavík, Iceland',
      payoutAccount: 'acct_erostova_verified',
    },
    likesCount: 341,
    savesCount: 251,
    sharesCount: 79,
    reviews: [
      {
        id: 'rev-ice-1',
        authorName: 'Marcus Vance',
        rating: 5,
        conditionTag: 'Stormy Swell',
        comment:
          'Check the Icelandic Met Office tide chart before going. A 1/10s to 1/4s shutter retains surf texture without turning the ocean completely flat.',
        visitedDate: '2026-09-12',
        createdAt: '2026-09-15T13:00:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4000),
    licenseOptions: buildLicenseOptions(2400, 8900),
    createdAt: '2026-09-04T11:00:00.000Z',
  },
  {
    id: 'amalfi-positano-twilight',
    title: 'Positano Cliffside at Dusk',
    locationName: 'Via Cristoforo Colombo Overlook, Positano',
    country: 'Italy',
    region: 'Europe',
    category: 'Coastal',
    lat: 40.6281,
    lng: 14.485,
    elevationMeters: 68,
    bestTimeToShoot: '19:45 – 20:30 Civil Dusk',
    accessNotes: 'Narrow stone sidewalk along Via Cristoforo Colombo; use a compact travel tripod flush against the parapet wall.',
    description:
      'As twilight settles over the Tyrrhenian Sea, terraced coastal homes ignite along the steep limestone amphitheater while passing headlights trace the winding cliff road above the marina.',
    coverUrl: '/seed-images/spot_amalfi_dusk_1794645834148.jpg',
    aspectRatio: '4:3',
    photos: [
      {
        id: 'p-ama-1',
        url: '/seed-images/spot_amalfi_dusk_1794645834148.jpg',
        caption: 'Headlight trails curving beneath Santa Maria Assunta dome at twilight.',
        aspectRatio: '4:3',
      },
    ],
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 28-70mm f/2 L USM',
      focalLength: '38mm',
      aperture: 'f/8',
      shutterSpeed: '6.0s',
      iso: '100',
    },
    photographer: {
      name: 'Giulia Ferraro',
      handle: '@gferraro',
      homeBase: 'Naples, Italy',
      payoutAccount: 'acct_gferraro_verified',
    },
    likesCount: 295,
    savesCount: 215,
    sharesCount: 68,
    reviews: [
      {
        id: 'rev-ama-1',
        authorName: 'Olivia Bennett',
        rating: 5,
        conditionTag: 'Clear Dusk',
        comment:
          'Arrive 40 minutes before sunset to claim a railing spot; 4 to 6 second exposures capture crisp headlight trails on the bend below.',
        visitedDate: '2026-06-18',
        createdAt: '2026-06-21T20:45:00.000Z',
      },
    ],
    printOptions: buildPrintOptions(4100),
    licenseOptions: buildLicenseOptions(2500, 9200),
    createdAt: '2026-06-10T18:00:00.000Z',
  },
];

function loadStore(): StoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (Array.isArray(parsed.spots) && parsed.spots.length > 0) {
        let changed = false;
        let spots = parsed.spots;

        if (parsed.currency !== 'INR') {
          changed = true;
          spots = spots.map((s) => {
            const seedMatch = INITIAL_SPOTS.find((init) => init.id === s.id);
            if (seedMatch) {
              return {
                ...s,
                printOptions: seedMatch.printOptions,
                licenseOptions: seedMatch.licenseOptions,
              };
            }
            return {
              ...s,
              printOptions: s.printOptions.map((p) => ({
                ...p,
                price: p.price < 500 ? Math.round((p.price * 26) / 100) * 100 : p.price,
              })),
              licenseOptions: s.licenseOptions.map((l) => ({
                ...l,
                price: l.price < 500 ? Math.round((l.price * 26) / 100) * 100 : l.price,
              })),
            };
          });
        }

        const existingIds = new Set(spots.map((s) => s.id));
        const missingSeeds = INITIAL_SPOTS.filter((init) => !existingIds.has(init.id));
        if (missingSeeds.length > 0) {
          changed = true;
          spots = [...missingSeeds, ...spots];
        }

        const data: StoreData = {
          currency: 'INR',
          spots,
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          userLikes: parsed.userLikes ?? {},
          userSaves: parsed.userSaves ?? {},
        };
        if (changed) saveStore(data);
        return data;
      }
    }
  } catch (err) {
    console.error('Failed to read store.json, reinitializing seed store:', err);
  }
  const initial: StoreData = {
    currency: 'INR',
    spots: INITIAL_SPOTS,
    orders: [],
    userLikes: {},
    userSaves: {},
  };
  saveStore(initial);
  return initial;
}

function saveStore(data: StoreData): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '') || '.jpg';
    cb(null, `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/seed-images', express.static(SEED_IMAGES_DIR));

  app.get('/api/config', (_req, res) => {
    const mapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ mapsApiKey });
  });

  app.get('/api/spots', (req, res) => {
    const store = loadStore();
    const clientId = String(req.header('x-client-id') || 'guest');
    const likedIds = new Set(store.userLikes[clientId] ?? []);
    const savedIds = new Set(store.userSaves[clientId] ?? []);

    const q = String(req.query.q || '').trim().toLowerCase();
    const region = String(req.query.region || '').trim();
    const category = String(req.query.category || '').trim();
    const nearLat = req.query.nearLat ? Number(req.query.nearLat) : null;
    const nearLng = req.query.nearLng ? Number(req.query.nearLng) : null;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : null;

    let items = store.spots.map((s) => ({
      ...s,
      likedByMe: likedIds.has(s.id),
      savedByMe: savedIds.has(s.id),
    }));

    if (q) {
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.locationName.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.photographer.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    if (region && region !== 'All') {
      items = items.filter((s) => s.region === region);
    }

    if (category && category !== 'All') {
      items = items.filter((s) => s.category === category);
    }

    if (
      nearLat !== null &&
      nearLng !== null &&
      !Number.isNaN(nearLat) &&
      !Number.isNaN(nearLng) &&
      radiusKm !== null &&
      !Number.isNaN(radiusKm) &&
      radiusKm > 0
    ) {
      items = items.filter((s) => haversineKm(nearLat, nearLng, s.lat, s.lng) <= radiusKm);
    }

    res.json({ spots: items });
  });

  app.post('/api/spots', upload.array('photos', 10), (req, res) => {
    try {
      const store = loadStore();
      const clientId = String(req.header('x-client-id') || 'guest');
      const files = (req.files as Express.Multer.File[]) ?? [];

      if (files.length === 0) {
        return res.status(400).json({ error: 'Please attach at least one high-resolution photograph.' });
      }

      const body = req.body as Record<string, string>;
      const title = (body.title || '').trim();
      const locationName = (body.locationName || '').trim();
      const country = (body.country || '').trim();
      const region = (body.region || 'Europe').trim();
      const category = (body.category || 'Alpine').trim();
      const lat = Number(body.lat);
      const lng = Number(body.lng);

      if (!title || !locationName || Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'Title, location name, and valid GPS coordinates are required.' });
      }

      const basePrintPrice = Math.max(999, Number(body.basePrintPrice) || 3900);
      const editorialPrice = Math.max(750, Number(body.editorialPrice) || 2400);
      const commercialPrice = Math.max(2500, Number(body.commercialPrice) || 8900);

      const photos: GalleryPhoto[] = files.map((file, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url: `/uploads/${file.filename}`,
        caption: idx === 0 ? `${locationName} — primary composition` : `${locationName} — frame ${idx + 1}`,
        aspectRatio: '4:3',
      }));

      const photographerName = (body.photographerName || 'Traveller Photographer').trim();
      const handleBase = photographerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'traveller';

      const newSpot: PhotoSpot = {
        id: `spot-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        title,
        locationName,
        country: country || 'International',
        region,
        category,
        lat,
        lng,
        elevationMeters: Math.round(Number(body.elevationMeters) || 0),
        bestTimeToShoot: (body.bestTimeToShoot || 'Golden Hour').trim(),
        accessNotes: (body.accessNotes || 'Accessible via public trail or roadside turnout.').trim(),
        description: (body.description || 'Field-contributed high-resolution travel photography gallery.').trim(),
        coverUrl: photos[0].url,
        aspectRatio: '4:3',
        photos,
        exif: {
          camera: (body.camera || 'Full-Frame Mirrorless').trim(),
          lens: (body.lens || '35mm f/1.8').trim(),
          focalLength: (body.focalLength || '35mm').trim(),
          aperture: (body.aperture || 'f/8').trim(),
          shutterSpeed: (body.shutterSpeed || '1/125s').trim(),
          iso: (body.iso || '100').trim(),
        },
        photographer: {
          name: photographerName,
          handle: `@${handleBase}`,
          homeBase: (body.homeBase || country || 'Nomadic').trim(),
          payoutAccount: `acct_${handleBase}_verified`,
        },
        likesCount: 1,
        savesCount: 0,
        sharesCount: 0,
        reviews: [],
        printOptions: buildPrintOptions(basePrintPrice),
        licenseOptions: buildLicenseOptions(editorialPrice, commercialPrice),
        createdAt: new Date().toISOString(),
      };

      store.spots.unshift(newSpot);
      const likes = new Set(store.userLikes[clientId] ?? []);
      likes.add(newSpot.id);
      store.userLikes[clientId] = Array.from(likes);
      saveStore(store);

      res.status(201).json({
        spot: {
          ...newSpot,
          likedByMe: true,
          savedByMe: false,
        },
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Unable to publish photography gallery.' });
    }
  });

  app.post('/api/spots/:id/like', (req, res) => {
    const store = loadStore();
    const clientId = String(req.header('x-client-id') || 'guest');
    const spot = store.spots.find((s) => s.id === req.params.id);
    if (!spot) return res.status(404).json({ error: 'Spot not found.' });

    const likes = new Set(store.userLikes[clientId] ?? []);
    let likedByMe = false;
    if (likes.has(spot.id)) {
      likes.delete(spot.id);
      spot.likesCount = Math.max(0, spot.likesCount - 1);
      likedByMe = false;
    } else {
      likes.add(spot.id);
      spot.likesCount += 1;
      likedByMe = true;
    }
    store.userLikes[clientId] = Array.from(likes);
    saveStore(store);

    res.json({ id: spot.id, likesCount: spot.likesCount, likedByMe });
  });

  app.post('/api/spots/:id/save', (req, res) => {
    const store = loadStore();
    const clientId = String(req.header('x-client-id') || 'guest');
    const spot = store.spots.find((s) => s.id === req.params.id);
    if (!spot) return res.status(404).json({ error: 'Spot not found.' });

    const saves = new Set(store.userSaves[clientId] ?? []);
    let savedByMe = false;
    if (saves.has(spot.id)) {
      saves.delete(spot.id);
      spot.savesCount = Math.max(0, spot.savesCount - 1);
      savedByMe = false;
    } else {
      saves.add(spot.id);
      spot.savesCount += 1;
      savedByMe = true;
    }
    store.userSaves[clientId] = Array.from(saves);
    saveStore(store);

    res.json({ id: spot.id, savesCount: spot.savesCount, savedByMe });
  });

  app.post('/api/spots/:id/share', (req, res) => {
    const store = loadStore();
    const spot = store.spots.find((s) => s.id === req.params.id);
    if (!spot) return res.status(404).json({ error: 'Spot not found.' });

    spot.sharesCount += 1;
    saveStore(store);
    res.json({ id: spot.id, sharesCount: spot.sharesCount });
  });

  app.post('/api/spots/:id/reviews', (req, res) => {
    const store = loadStore();
    const spot = store.spots.find((s) => s.id === req.params.id);
    if (!spot) return res.status(404).json({ error: 'Spot not found.' });

    const { authorName, rating, conditionTag, comment, visitedDate } = req.body as {
      authorName?: string;
      rating?: number;
      conditionTag?: string;
      comment?: string;
      visitedDate?: string;
    };

    if (!authorName?.trim() || !comment?.trim()) {
      return res.status(400).json({ error: 'Name and field review comment are required.' });
    }

    const clampedRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const review: SpotReview = {
      id: `rev-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      authorName: authorName.trim(),
      rating: clampedRating,
      conditionTag: (conditionTag || 'Clear Light').trim(),
      comment: comment.trim(),
      visitedDate: visitedDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    spot.reviews.unshift(review);
    saveStore(store);
    res.status(201).json({ review, spot });
  });

  app.post('/api/checkout', (req, res) => {
    const store = loadStore();
    const {
      customerName,
      customerEmail,
      shippingAddress,
      paymentMethod,
      cardNumber,
      items,
    } = req.body as {
      customerName?: string;
      customerEmail?: string;
      shippingAddress?: string;
      paymentMethod?: 'upi' | 'card' | 'express' | 'bank';
      cardNumber?: string;
      upiId?: string;
      items?: OrderRecord['items'];
    };

    if (!customerName?.trim() || !customerEmail?.trim() || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer details and at least one cart item are required.' });
    }

    const hasPrints = items.some((i) => i.kind === 'print');
    if (hasPrints && !shippingAddress?.trim()) {
      return res.status(400).json({ error: 'Shipping address is required for fine art print orders.' });
    }

    const method = paymentMethod || 'upi';
    if (method === 'card') {
      const digits = (cardNumber || '').replace(/\D/g, '');
      if (digits.length < 12) {
        return res.status(400).json({ error: 'Please enter a valid payment card number.' });
      }
    } else if (method === 'upi') {
      if (!(req.body.upiId || '').includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g., name@okicici).' });
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shippingFee = hasPrints ? (subtotal >= 7500 ? 0 : 350) : 0;
    const total = subtotal + shippingFee;
    const photographerPayout = Math.round(subtotal * 0.85);
    const platformFee = Math.round(subtotal - photographerPayout);

    const licenseKeys = items
      .filter((i) => i.kind === 'license')
      .map((i) => ({
        spotTitle: i.spotTitle,
        licenseLabel: i.optionLabel,
        certificateCode: `MRD-LIC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      }));

    const digits = (cardNumber || '').replace(/\D/g, '');
    const order: OrderRecord = {
      orderId: `MRD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      shippingAddress: hasPrints ? shippingAddress?.trim() : undefined,
      paymentMethod: paymentMethod || 'card',
      last4: digits ? digits.slice(-4) : undefined,
      items,
      subtotal,
      shippingFee,
      platformFee,
      photographerPayout,
      total,
      status: hasPrints ? 'Preparing Print' : 'License Issued',
      licenseKeys,
    };

    store.orders.unshift(order);
    saveStore(store);
    res.status(201).json({ order });
  });

  app.get('/api/orders/:orderId', (req, res) => {
    const store = loadStore();
    const order = store.orders.find((o) => o.orderId === req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  });

  const distPath = path.join(ROOT_DIR, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distPath, 'index.html'));

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Meridian server:', err);
  process.exit(1);
});
