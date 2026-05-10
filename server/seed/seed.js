import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Lobby from '../src/models/Lobby.js';
import Squad from '../src/models/Squad.js';
import Venue from '../src/models/Venue.js';
import TimeSlot from '../src/models/TimeSlot.js';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for seeding...');

  // Clear existing data
  await Promise.all([User.deleteMany({}), Lobby.deleteMany({}), Squad.deleteMany({}), Venue.deleteMany({}), TimeSlot.deleteMany({})]);

  // Create users
  const hash = await bcrypt.hash('password123', 12);
  const users = await User.insertMany([
    { name: 'Admin User', email: 'admin@tribe.com', password: hash, roles: ['player', 'admin'], preferences: ['Football', 'Cricket'] },
    { name: 'Fahad Ahmed', email: 'fahad@tribe.com', password: hash, roles: ['player'], preferences: ['Football', 'Padel', 'Cricket'], ringerMode: true },
    { name: 'Omar Khan', email: 'omar@tribe.com', password: hash, roles: ['player'], preferences: ['Football', 'Basketball'] },
    { name: 'Sarah Ali', email: 'sarah@tribe.com', password: hash, roles: ['player'], preferences: ['Tennis', 'Badminton'] },
    { name: 'Ali Hassan', email: 'ali@tribe.com', password: hash, roles: ['player', 'venue_owner'], preferences: ['Football', 'Cricket'] },
    { name: 'Zara Sheikh', email: 'zara@tribe.com', password: hash, roles: ['player'], preferences: ['Volleyball', 'Basketball'] },
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create venue
  const venue = await Venue.create({
    ownerId: users[4]._id,
    name: 'Sports City Arena',
    verificationStatus: 'VERIFIED',
    sportsSupported: ['Football', 'Cricket', 'Basketball', 'Padel'],
    location: { type: 'Point', coordinates: [55.2708, 25.2048], address: 'Dubai Sports City, Dubai, UAE' },
    amenities: ['Parking', 'Showers', 'Floodlights', 'Cafeteria'],
    pitches: [
      { name: 'Pitch A', sports: ['Football'], hourlyRate: 300, isActive: true },
      { name: 'Pitch B', sports: ['Football'], hourlyRate: 250, isActive: true },
      { name: 'Court 1', sports: ['Padel'], hourlyRate: 200, isActive: true },
      { name: 'Cricket Ground', sports: ['Cricket'], hourlyRate: 500, isActive: true },
    ],
    description: 'Premier multi-sport facility in Dubai Sports City with professional-grade pitches.',
  });

  console.log('✅ Created venue:', venue.name);

  // Create time slots for next 7 days
  const slots = [];
  for (let day = 0; day < 7; day++) {
    for (const pitch of venue.pitches) {
      for (let hour = 8; hour <= 22; hour += 2) {
        const start = new Date(); start.setDate(start.getDate() + day); start.setHours(hour, 0, 0, 0);
        const end = new Date(start); end.setHours(hour + 2);
        slots.push({ venueId: venue._id, pitchName: pitch.name, startTime: start, endTime: end, timezone: 'Asia/Dubai' });
      }
    }
  }
  await TimeSlot.insertMany(slots);
  console.log(`✅ Created ${slots.length} time slots`);

  // Create lobbies
  const now = new Date();
  const lobbies = await Lobby.insertMany([
    {
      organizerId: users[1]._id, sport: 'Football', matchFormat: 5,
      location: { type: 'Point', coordinates: [55.2708, 25.2048], address: 'Sports City Arena, Pitch A', venueId: venue._id },
      dateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), timezone: 'Asia/Dubai',
      expiresAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      totalSlots: 4, openSlots: 3, confirmedPlayerIds: [users[1]._id],
      description: 'Evening 5-a-side. Competitive level. Bring your A-game!',
    },
    {
      organizerId: users[2]._id, sport: 'Basketball', matchFormat: 3,
      location: { type: 'Point', coordinates: [55.28, 25.19], address: 'Al Quoz Basketball Court' },
      dateTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), timezone: 'Asia/Dubai',
      expiresAt: new Date(now.getTime() + 50 * 60 * 60 * 1000),
      totalSlots: 2, openSlots: 2, confirmedPlayerIds: [users[2]._id],
      description: '3v3 half-court. All skill levels welcome.',
    },
    {
      organizerId: users[3]._id, sport: 'Padel', matchFormat: 2,
      location: { type: 'Point', coordinates: [55.2708, 25.2048], address: 'Sports City Arena, Court 1', venueId: venue._id },
      dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), timezone: 'Asia/Dubai',
      expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      totalSlots: 1, openSlots: 1, confirmedPlayerIds: [users[3]._id],
      description: 'Looking for a doubles partner! Intermediate level.',
    },
    {
      organizerId: users[1]._id, sport: 'Cricket', matchFormat: 8,
      location: { type: 'Point', coordinates: [55.2708, 25.2048], address: 'Sports City Arena, Cricket Ground', venueId: venue._id },
      dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), timezone: 'Asia/Dubai',
      expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      totalSlots: 7, openSlots: 5, confirmedPlayerIds: [users[1]._id, users[2]._id],
      description: 'Weekend tape-ball cricket. 8-a-side.',
    },
  ]);

  console.log(`✅ Created ${lobbies.length} lobbies`);

  // Create a squad
  const squad = await Squad.create({
    captainId: users[1]._id,
    name: 'Northside FC',
    sport: 'Football',
    roster: [users[1]._id, users[2]._id, users[4]._id],
    location: { type: 'Point', coordinates: [55.27, 25.20] },
    description: 'Competitive 5-a-side squad based in Dubai.',
    stats: { wins: 12, losses: 3, matchesPlayed: 15 },
  });

  console.log('✅ Created squad:', squad.name);

  console.log('\n🎉 Seed complete!\n');
  console.log('Test accounts (all passwords: password123):');
  console.log('  Admin:       admin@tribe.com');
  console.log('  Player:      fahad@tribe.com');
  console.log('  Player:      omar@tribe.com');
  console.log('  Venue Owner: ali@tribe.com');
  console.log('');
  
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
