import Venue from '../models/Venue.js';

export async function listVenues(req, res) {
  const { sport } = req.query;
  const sportFilter = sport ? { sportsSupported: sport } : {};
  const access = req.userId
    ? { $or: [{ verificationStatus: 'VERIFIED' }, { ownerId: req.userId }] }
    : { verificationStatus: 'VERIFIED' };
  const venues = await Venue.find({ $and: [access, sportFilter] })
    .populate('ownerId', 'name')
    .sort({ name: 1 });
  return res.json({ venues });
}

export async function getVenue(req, res) {
  const venue = await Venue.findById(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Not found' });
  const owner = venue.ownerId?.toString();
  const isOwner = req.userId && owner === req.userId;
  if (venue.verificationStatus !== 'VERIFIED' && !isOwner) return res.status(404).json({ error: 'Not found' });
  return res.json({ venue });
}

export async function applyVenue(req, res) {
  const { name, location, sportsSupported, amenities, pitches, description, contactPhone, contactEmail } = req.body;
  const coords = location?.coordinates || [0, 0];
  const venue = await Venue.create({
    name,
    ownerId: req.userId,
    location: {
      type: 'Point',
      coordinates: [Number(coords[0]) || 0, Number(coords[1]) || 0],
      address: location?.address || '',
      city: location?.city || '',
      country: location?.country || '',
    },
    sportsSupported: sportsSupported || [],
    amenities: amenities || [],
    pitches: pitches || [],
    description: description || '',
    contactPhone: contactPhone || '',
    contactEmail: contactEmail || '',
    verificationStatus: 'PENDING',
  });
  return res.status(201).json({ venue });
}

export async function myVenues(req, res) {
  const venues = await Venue.find({ ownerId: req.userId });
  return res.json({ venues });
}

export async function venueHistory(req, res) {
  const venue = await Venue.findById(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Not found' });
  if (venue.ownerId?.toString() !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  return res.json({ bookings: [] });
}
