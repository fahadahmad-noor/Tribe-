import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

const VenueProfile = () => {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/venues/${id}`).then(r => setVenue(r.data.venue)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page container"><div className="skeleton skeleton-card mt-6" /></div>;
  if (!venue) return <div className="page container"><h2>Venue not found</h2></div>;

  return (
    <div className="page" id="venue-profile-page">
      <div className="container" style={{maxWidth:800}}>
        <div className="card card-body mb-6">
          <h1>{venue.name}</h1>
          <p className="text-secondary mt-1">📍 {venue.location?.address}</p>
          {venue.description && <p className="mt-3">{venue.description}</p>}
          <div className="flex flex-wrap gap-2 mt-4">
            {venue.sportsSupported?.map(s => <span key={s} className="badge badge-sport">{s}</span>)}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {venue.amenities?.map(a => <span key={a} className="badge badge-completed">{a}</span>)}
          </div>
        </div>

        <h2 className="mb-4">Pitches ({venue.pitches?.length})</h2>
        <div className="grid grid-auto gap-4 mb-6">
          {venue.pitches?.filter(p=>p.isActive).map((p,i) => (
            <div key={i} className="card card-body">
              <h3>{p.name}</h3>
              <div className="flex flex-wrap gap-1 mt-2">{p.sports?.map(s=><span key={s} className="badge badge-sport">{s}</span>)}</div>
              {p.hourlyRate > 0 && <p className="text-sm text-muted mt-2">From {p.hourlyRate} / hour</p>}
            </div>
          ))}
        </div>

        <div className="card card-body">
          <h3>Contact</h3>
          {venue.contactPhone && <p className="text-secondary mt-2">📱 {venue.contactPhone}</p>}
          {venue.contactEmail && <p className="text-secondary">✉️ {venue.contactEmail}</p>}
        </div>
      </div>
    </div>
  );
};

export default VenueProfile;


