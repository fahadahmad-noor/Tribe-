import Challenge from '../models/Challenge.js';
import Squad from '../models/Squad.js';

export async function listChallenges(req, res) {
  const rows = await Challenge.find({ status: 'OPEN' })
    .populate('proposingSquadId', 'name sport')
    .sort({ createdAt: -1 });
  const challenges = rows.map((c) => {
    const o = c.toObject();
    return {
      ...o,
      challengerSquadId: o.proposingSquadId,
      proposedDateTime: o.proposedDate || o.createdAt,
      matchFormat: o.matchFormat ?? 5,
      message: o.message || '',
    };
  });
  return res.json({ challenges });
}

export async function acceptChallenge(req, res) {
  const { squadId } = req.body;
  const ch = await Challenge.findById(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  const squad = await Squad.findById(squadId);
  if (!squad || squad.captainId.toString() !== req.userId) return res.status(403).json({ error: 'Captain only' });
  if (ch.proposingSquadId.toString() === squadId) return res.status(400).json({ error: 'Cannot accept own' });
  ch.acceptingSquadId = squadId;
  ch.status = 'ACCEPTED';
  await ch.save();
  return res.json({ challenge: ch });
}
