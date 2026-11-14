import heroPatagonia from '../assets/images/hero_patagonia_sunrise_1794645831776.jpg';
import spotLofoten from '../assets/images/spot_lofoten_fjord_1794645831771.jpg';
import spotKyoto from '../assets/images/spot_kyoto_dawn_1794645832433.jpg';
import spotDolomites from '../assets/images/spot_dolomites_seceda_1794645832383.jpg';
import spotMarrakech from '../assets/images/spot_marrakech_arch_1794645833304.jpg';
import spotIceland from '../assets/images/spot_iceland_basalt_1794645832897.jpg';
import spotAmalfi from '../assets/images/spot_amalfi_dusk_1794645834148.jpg';
import spotIndiaPangong from '../assets/images/spot_india_pangong_1794646501485.jpg';
import spotIndiaTajMahal from '../assets/images/spot_india_tajmahal_1794646502792.jpg';
import spotIndiaHampi from '../assets/images/spot_india_hampi_1794646503463.jpg';
import spotIndiaMunnar from '../assets/images/spot_india_munnar_1794646503213.jpg';
import spotIndiaVaranasi from '../assets/images/spot_india_varanasi_1794646504372.jpg';

const SEED_IMAGE_MAP: Record<string, string> = {
  '/seed-images/hero_patagonia_sunrise_1794645831776.jpg': heroPatagonia,
  '/seed-images/spot_lofoten_fjord_1794645831771.jpg': spotLofoten,
  '/seed-images/spot_kyoto_dawn_1794645832433.jpg': spotKyoto,
  '/seed-images/spot_dolomites_seceda_1794645832383.jpg': spotDolomites,
  '/seed-images/spot_marrakech_arch_1794645833304.jpg': spotMarrakech,
  '/seed-images/spot_iceland_basalt_1794645832897.jpg': spotIceland,
  '/seed-images/spot_amalfi_dusk_1794645834148.jpg': spotAmalfi,
  '/seed-images/spot_india_pangong_1794646501485.jpg': spotIndiaPangong,
  '/seed-images/spot_india_tajmahal_1794646502792.jpg': spotIndiaTajMahal,
  '/seed-images/spot_india_hampi_1794646503463.jpg': spotIndiaHampi,
  '/seed-images/spot_india_munnar_1794646503213.jpg': spotIndiaMunnar,
  '/seed-images/spot_india_varanasi_1794646504372.jpg': spotIndiaVaranasi,
};

export function resolvePhotoUrl(url: string): string {
  return SEED_IMAGE_MAP[url] ?? url;
}

export const HERO_FALLBACK_IMAGE = spotIndiaPangong;
