import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Squad from '../models/Squad.js';

function formatTournament(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  const status = o.status === 'OPEN' ? 'REGISTRATION_OPEN' : o.status || 'REGISTRATION_OPEN';
  return {
    ...o,
    status,
    registeredSquads: o.registeredSquadIds || [],
    maxTeams: o.maxTeams ?? 32,
    format: o.format || 'KNOCKOUT',
    matchFormat: o.matchFormat ?? 5,
  };
}

export async function listTournaments(req, res) {
  const tournaments = await Tournament.find({}).sort({ startDate: 1 });
  return res.json({ tournaments: tournaments.map(formatTournament) });
}

export async function getTournament(req, res) {
  const t = await Tournament.findById(req.params.id).populate('registeredSquadIds', 'name sport');
  if (!t) return res.status(404).json({ error: 'Not found' });
  return res.json({ tournament: formatTournament(t) });
}

export async function registerSquad(req, res) {
  const { squadId } = req.body;
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const squad = await Squad.findById(squadId);
  if (!squad || squad.captainId.toString() !== req.userId) return res.status(403).json({ error: 'Captain only' });
  const sid = squadId.toString();
  if (!t.registeredSquadIds.some((id) => id.toString() === sid)) {
    t.registeredSquadIds.push(new mongoose.Types.ObjectId(sid));
  }
  await t.save();
  const fresh = await Tournament.findById(t._id).populate('registeredSquadIds', 'name sport');
  return res.json({ tournament: formatTournament(fresh) });
}
