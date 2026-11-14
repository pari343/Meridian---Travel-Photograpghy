import { useState, type ChangeEvent, type FormEvent } from 'react';
import exifr from 'exifr';
import { Camera, ImagePlus, MapPin, X } from 'lucide-react';
import type { PhotoSpot, SpotCategory, SpotRegion } from '../types';
import { uploadSpotGallery } from '../lib/api';
import { LocationPickerMap } from './LocationPickerMap';

interface UploadGalleryViewProps {
  hasMapsKey: boolean;
  onSpotCreated: (spot: PhotoSpot) => void;
  onCancel: () => void;
}

interface SelectedFilePreview {
  file: File;
  previewUrl: string;
}

export function UploadGalleryView({
  hasMapsKey,
  onSpotCreated,
  onCancel,
}: UploadGalleryViewProps) {
  const [files, setFiles] = useState<SelectedFilePreview[]>([]);
  const [exifNotice, setExifNotice] = useState('');

  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState<SpotRegion>('India');
  const [category, setCategory] = useState<SpotCategory>('Alpine');
  const [lat, setLat] = useState<number>(32.2432);
  const [lng, setLng] = useState<number>(77.1892);
  const [elevationMeters, setElevationMeters] = useState('2050');
  const [bestTimeToShoot, setBestTimeToShoot] = useState('Golden Hour · 06:15 – 07:00');
  const [accessNotes, setAccessNotes] = useState('');
  const [description, setDescription] = useState('');

  const [photographerName, setPhotographerName] = useState('');
  const [homeBase, setHomeBase] = useState('');
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [focalLength, setFocalLength] = useState('35mm');
  const [aperture, setAperture] = useState('f/8');
  const [shutterSpeed, setShutterSpeed] = useState('1/125s');
  const [iso, setIso] = useState('100');

  const [basePrintPrice, setBasePrintPrice] = useState('3900');
  const [editorialPrice, setEditorialPrice] = useState('2400');
  const [commercialPrice, setCommercialPrice] = useState('8900');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;

    const previews = picked.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...previews].slice(0, 10));

    try {
      const parsed = await exifr.parse(picked[0], {
        gps: true,
        tiff: true,
        exif: true,
      });

      if (parsed) {
        const extractedBits: string[] = [];
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          setLat(Number(parsed.latitude.toFixed(5)));
          setLng(Number(parsed.longitude.toFixed(5)));
          extractedBits.push('GPS coordinates');
        }
        if (parsed.Make || parsed.Model) {
          const cam = [parsed.Make, parsed.Model].filter(Boolean).join(' ').trim();
          setCamera(cam);
          extractedBits.push('camera model');
        }
        if (parsed.LensModel) {
          setLens(String(parsed.LensModel));
        }
        if (parsed.FocalLength) {
          setFocalLength(`${Math.round(Number(parsed.FocalLength))}mm`);
        }
        if (parsed.FNumber) {
          setAperture(`f/${Number(parsed.FNumber).toFixed(1).replace(/\.0$/, '')}`);
        }
        if (parsed.ExposureTime) {
          const exp = Number(parsed.ExposureTime);
          setShutterSpeed(exp < 1 ? `1/${Math.round(1 / exp)}s` : `${exp}s`);
        }
        if (parsed.ISO) {
          setIso(String(parsed.ISO));
        }
        if (extractedBits.length > 0) {
          setExifNotice(`Auto-extracted ${extractedBits.join(' and ')} from EXIF metadata.`);
        } else {
          setExifNotice('Photo attached. Pin the exact viewpoint on the map below.');
        }
      }
    } catch {
      setExifNotice('Photo attached. Enter coordinates or click the map to geotag this spot.');
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (files.length === 0) {
      setError('Please select at least one high-resolution photo to publish.');
      return;
    }
    if (!title.trim() || !locationName.trim()) {
      setError('Gallery title and location name are required.');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f.file));
      fd.append('title', title.trim());
      fd.append('locationName', locationName.trim());
      fd.append('country', country.trim() || 'India');
      fd.append('region', region);
      fd.append('category', category);
      fd.append('lat', String(lat));
      fd.append('lng', String(lng));
      fd.append('elevationMeters', elevationMeters);
      fd.append('bestTimeToShoot', bestTimeToShoot.trim());
      fd.append('accessNotes', accessNotes.trim());
      fd.append('description', description.trim());
      fd.append('photographerName', photographerName.trim() || 'Guest Photographer');
      fd.append('homeBase', homeBase.trim() || country.trim());
      fd.append('camera', camera.trim() || 'Full-Frame Camera');
      fd.append('lens', lens.trim() || '35mm Prime');
      fd.append('focalLength', focalLength.trim());
      fd.append('aperture', aperture.trim());
      fd.append('shutterSpeed', shutterSpeed.trim());
      fd.append('iso', iso.trim());
      fd.append('basePrintPrice', basePrintPrice);
      fd.append('editorialPrice', editorialPrice);
      fd.append('commercialPrice', commercialPrice);

      const created = await uploadSpotGallery(fd);
      onSpotCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload gallery.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500';

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <p className="text-xs font-medium text-blue-400 mb-1">Contributor Upload Studio</p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
            Publish a Geotagged Travel Gallery
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl">
            Upload high-resolution frames, extract GPS &amp; EXIF automatically, share vantage-point
            notes, and set direct print and licensing pricing in ₹.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#1A1F2B] hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors cursor-pointer self-start"
        >
          Back to Galleries
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">
              1. High-Resolution Photographs
            </h2>
            <span className="text-xs text-zinc-400">Up to 10 frames · JPEG, PNG, or WebP</span>
          </div>

          <label className="block border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl p-8 text-center bg-[#141821] transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelection}
              className="sr-only"
            />
            <ImagePlus className="w-7 h-7 mx-auto mb-2.5 text-zinc-400" aria-hidden="true" />
            <p className="text-sm font-medium text-zinc-100">
              Select high-resolution photographs to upload
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              EXIF camera settings and embedded GPS coordinates are parsed automatically on selection
            </p>
          </label>

          {exifNotice && (
            <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{exifNotice}</span>
            </p>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {files.map((item, idx) => (
                <div
                  key={item.previewUrl}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900"
                >
                  <img
                    src={item.previewUrl}
                    alt={`Upload preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    aria-label={`Remove image ${idx + 1}`}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/75 text-white hover:bg-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-zinc-800 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-zinc-100">2. Story &amp; Spot Metadata</h2>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Gallery Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sunrise Over Spiti Valley Monastery"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Spot / Trailhead Name
                </label>
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Key Monastery Ridge"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Country</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as SpotRegion)}
                  className={inputClass}
                >
                  <option value="India">India</option>
                  <option value="Europe">Europe</option>
                  <option value="Asia">Asia</option>
                  <option value="South America">South America</option>
                  <option value="North Africa">North Africa</option>
                  <option value="North America">North America</option>
                  <option value="Oceania">Oceania</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Subject</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SpotCategory)}
                  className={inputClass}
                >
                  <option value="Alpine">Alpine</option>
                  <option value="Coastal">Coastal</option>
                  <option value="Architectural">Architectural</option>
                  <option value="Woodland">Woodland</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Best Light Window
                </label>
                <input
                  type="text"
                  value={bestTimeToShoot}
                  onChange={(e) => setBestTimeToShoot(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Elevation (m)
                </label>
                <input
                  type="number"
                  value={elevationMeters}
                  onChange={(e) => setElevationMeters(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Field Description &amp; Composition Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe light direction, tripod placement, and story behind this frame..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Access &amp; Logistics Notes
              </label>
              <input
                type="text"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="Trailhead parking, permits, or safety notes..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" aria-hidden="true" />
              <span>3. Geotag Coordinates</span>
            </h2>

            <LocationPickerMap
              lat={lat}
              lng={lng}
              hasMapsKey={hasMapsKey}
              onChange={(coords) => {
                setLat(coords.lat);
                setLng(coords.lng);
                if (coords.locationHint && !locationName) {
                  setLocationName(coords.locationHint.split(',')[0]);
                }
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100">EXIF &amp; Photographer</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={photographerName}
                  onChange={(e) => setPhotographerName(e.target.value)}
                  placeholder="Photographer name"
                  className="px-3 py-2 text-xs bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={homeBase}
                  onChange={(e) => setHomeBase(e.target.value)}
                  placeholder="Home city"
                  className="px-3 py-2 text-xs bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  placeholder="Camera body"
                  className="px-3 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={lens}
                  onChange={(e) => setLens(e.target.value)}
                  placeholder="Lens"
                  className="px-3 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={focalLength}
                  onChange={(e) => setFocalLength(e.target.value)}
                  placeholder="Focal"
                  aria-label="Focal length"
                  className="px-2.5 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                />
                <input
                  type="text"
                  value={aperture}
                  onChange={(e) => setAperture(e.target.value)}
                  placeholder="Aperture"
                  aria-label="Aperture"
                  className="px-2.5 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                />
                <input
                  type="text"
                  value={shutterSpeed}
                  onChange={(e) => setShutterSpeed(e.target.value)}
                  placeholder="Shutter"
                  aria-label="Shutter speed"
                  className="px-2.5 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                />
                <input
                  type="text"
                  value={iso}
                  onChange={(e) => setIso(e.target.value)}
                  placeholder="ISO"
                  aria-label="ISO"
                  className="px-2.5 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-100">Print &amp; License Pricing</h3>
                <span className="text-[11px] text-zinc-400">You keep 85% payout</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">12×18 Print (₹)</label>
                  <input
                    type="number"
                    min={999}
                    value={basePrintPrice}
                    onChange={(e) => setBasePrintPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Editorial (₹)</label>
                  <input
                    type="number"
                    min={750}
                    value={editorialPrice}
                    onChange={(e) => setEditorialPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Commercial (₹)</label>
                  <input
                    type="number"
                    min={2500}
                    value={commercialPrice}
                    onChange={(e) => setCommercialPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#141821] border border-zinc-800 rounded-lg text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Publishing Gallery...' : 'Publish Gallery & Geotag'}
          </button>
        </div>
      </form>
    </section>
  );
}
