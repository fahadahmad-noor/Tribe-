const { getIO } = require('../config/socket');

const emitToLobby = (lobbyId, event, data) => {
  try { getIO().to(`lobby:${lobbyId}`).emit(event, data); } catch (e) {}
};

const emitToFeed = (event, data) => {
  try { getIO().to('feed').emit(event, data); } catch (e) {}
};

const emitToUser = (userId, event, data) => {
  try { getIO().to(`user:${userId}`).emit(event, data); } catch (e) {}
};

const emitToVenue = (venueId, event, data) => {
  try { getIO().to(`venue:${venueId}`).emit(event, data); } catch (e) {}
};

module.exports = { emitToLobby, emitToFeed, emitToUser, emitToVenue };
