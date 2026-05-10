const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = 'TRIBE-Sports-App/1.0';

export async function search(req, res) {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const url = `${NOMINATIM}/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return res.status(502).json({ error: 'Geocoder unavailable' });
    const data = await r.json();
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Geocoder failed' });
  }
}

export async function reverse(req, res) {
  const lat = req.query.lat;
  const lon = req.query.lon;
  if (lat == null || lon == null) return res.status(400).json({ error: 'lat/lon required' });
  try {
    const url = `${NOMINATIM}/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return res.status(502).json({ error: 'Geocoder unavailable' });
    const data = await r.json();
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Geocoder failed' });
  }
}
