import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Lobby from '../models/Lobby.js';

export async function dashboard(req, res) {
  const [totalUsers, pendingVenueApps, activeLobbies, verifiedVenues] = await Promise.all([
    User.countDocuments(),
    Venue.countDocuments({ verificationStatus: 'PENDING' }),
    Lobby.countDocuments({ status: 'OPEN' }),
    Venue.countDocuments({ verificationStatus: 'VERIFIED' }),
  ]);
  return res.json({
    metrics: {
      totalUsers,
      activeLobbies,
      totalVenues: verifiedVenues,
      totalBookings: 0,
      pendingVenueApps,
    },
  });
}

export async function pendingVenues(req, res) {
  const venues = await Venue.find({ verificationStatus: 'PENDING' });
  return res.json({ venues });
}

export async function listUsers(req, res) {
  const users = await User.find().select('name email roles banned').limit(200);
  return res.json({ users });
}

export async function verifyVenue(req, res) {
  const v = await Venue.findByIdAndUpdate(req.params.id, { verificationStatus: 'VERIFIED' }, { new: true });
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (v.ownerId) await User.findByIdAndUpdate(v.ownerId, { $addToSet: { roles: 'venue_owner' } });
  return res.json({ venue: v });
}

export async function rejectVenue(req, res) {
  const v = await Venue.findByIdAndUpdate(req.params.id, { verificationStatus: 'REJECTED' }, { new: true });
  if (!v) return res.status(404).json({ error: 'Not found' });
  return res.json({ venue: v });
}

export async function banUser(req, res) {
  const u = await User.findByIdAndUpdate(req.params.id, { banned: true }, { new: true });
  if (!u) return res.status(404).json({ error: 'Not found' });
  return res.json({ user: u });
}
