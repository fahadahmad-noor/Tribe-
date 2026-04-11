import { Link } from 'react-router-dom';
import './LobbyCard.css';

const sportEmoji = { Football: '⚽', Cricket: '🏏', Basketball: '🏀', Tennis: '🎾', Padel: '🏓', Volleyball: '🏐', Badminton: '🏸', Pickleball: '🥒', TableTennis: '🏓' };

const LobbyCard = ({ lobby }) => {
  const time = new Date(lobby.dateTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const urgent = lobby.openSlots <= 2 && lobby.openSlots > 0;

  return (
    <Link to={`/lobby/${lobby._id}`} className="lobby-card card" id={`lobby-${lobby._id}`}>
      <div className="lobby-card-header">
        <span className="lobby-sport">{sportEmoji[lobby.sport] || '🏅'} {lobby.sport}</span>
        <span className={`badge badge-${lobby.status.toLowerCase()}`}>{lobby.status}</span>
      </div>
      <div className="lobby-card-body">
        <div className="lobby-format text-mono">{lobby.matchFormat}-a-side</div>
        <div className="lobby-meta">
          <span className="lobby-time">📅 {time}</span>
          <span className="lobby-location">📍 {lobby.location?.address || 'Location TBD'}</span>
        </div>
        {lobby.description && <p className="lobby-desc">{lobby.description}</p>}
      </div>
      <div className="lobby-card-footer">
        <div className="lobby-organizer">
          {lobby.organizerId?.avatarUrl ? (
            <img src={lobby.organizerId.avatarUrl} alt="" className="avatar avatar-sm" />
          ) : (
            <div className="avatar avatar-sm avatar-placeholder">{lobby.organizerId?.name?.[0]}</div>
          )}
          <span className="flex flex-col text-sm" style={{marginLeft: '0.25rem'}}>
            <span style={{fontWeight: 500, lineHeight: 1.2}}>{lobby.organizerId?.name}</span>
            {lobby.organizerId?.whatsappNumber && <span className="text-secondary" style={{fontSize: '11px', opacity: 0.8, lineHeight: 1}}>📱 {lobby.organizerId.whatsappNumber}</span>}
          </span>
        </div>
        <div className={`slot-counter ${urgent ? 'urgent' : ''} ${lobby.openSlots === 0 ? 'full' : ''}`}>
          {lobby.openSlots}/{lobby.totalSlots} slots
        </div>
      </div>
    </Link>
  );
};

export default LobbyCard;
