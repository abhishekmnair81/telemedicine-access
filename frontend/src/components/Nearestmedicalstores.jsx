import React, { useState, useEffect, useRef, useCallback } from 'react';

const Icons = {
  MapPin: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  Navigation: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>),
  Clock: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Phone: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>),
  Star: () => (<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  RefreshCw: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>),
  X: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  AlertCircle: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
  ExternalLink: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>),
  Crosshair: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>),
};

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function formatDistance(km) { return km < 1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km`; }
function formatLastUpdated(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff/60)}m ago`;
}

function generateMockStores(lat, lng) {
  const pharmacies = [
    { name: 'Apollo Pharmacy',      rating: 4.5, open: true,  phone: '+91 98765 43210', hours: '8AM-10PM' },
    { name: 'MedPlus Pharmacy',     rating: 4.3, open: true,  phone: '+91 98765 43211', hours: '7AM-11PM' },
    { name: 'Netmeds Store',        rating: 4.1, open: false, phone: '+91 98765 43212', hours: '9AM-9PM'  },
    { name: '1mg Pharmacy',         rating: 4.4, open: true,  phone: '+91 98765 43213', hours: '8AM-10PM' },
    { name: 'Wellness Forever',     rating: 4.2, open: true,  phone: '+91 98765 43214', hours: '8AM-11PM' },
    { name: 'Frank Ross Chemists',  rating: 4.0, open: false, phone: '+91 98765 43215', hours: '9AM-9PM'  },
    { name: 'Suraksha Diagnostics', rating: 4.6, open: true,  phone: '+91 98765 43216', hours: '7AM-10PM' },
    { name: 'Life Pharmacy',        rating: 3.9, open: true,  phone: '+91 98765 43217', hours: '8AM-9PM'  },
  ];
  return pharmacies.map((p, i) => {
    const angle = (i / pharmacies.length) * 2 * Math.PI + Math.random() * 0.5;
    const dist  = 0.3 + Math.random() * 2.5;
    const dLat  = (dist * Math.cos(angle)) / 111;
    const dLng  = (dist * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180));
    const sLat = lat + dLat, sLng = lng + dLng;
    return { id: i, ...p, lat: sLat, lng: sLng,
      distance: getDistanceKm(lat, lng, sLat, sLng),
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${sLat},${sLng}&travelmode=driving` };
  }).sort((a,b) => a.distance - b.distance);
}

export default function NearestMedicalStores() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');
  const [pulseAnim, setPulseAnim] = useState(false);
  const watchIdRef = useRef(null);
  const prevLocRef = useRef(null);

  const fetchNearbyStores = useCallback(async (lat, lng) => {
    setLoadingStores(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      setStores(generateMockStores(lat, lng));
      setLastUpdated(new Date());
      setPulseAnim(true);
      setTimeout(() => setPulseAnim(false), 600);
    } catch { setStores([]); }
    finally { setLoadingStores(false); }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation is not supported.'); return; }
    setTrackingActive(true); setLocationError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setPermissionState('granted');
        setLocation({ lat, lng, accuracy });
        const prev = prevLocRef.current;
        if (!prev || getDistanceKm(prev.lat, prev.lng, lat, lng) > 0.05) {
          prevLocRef.current = { lat, lng };
          fetchNearbyStores(lat, lng);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) { setPermissionState('denied'); setLocationError('Location access denied. Enable in browser settings.'); }
        else { setLocationError('Unable to get your location. Please try again.'); }
        setTrackingActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  }, [fetchNearbyStores]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setTrackingActive(false);
  }, []);

  useEffect(() => { startTracking(); return () => stopTracking(); }, [startTracking, stopTracking]);

  const openCount = stores.filter(s => s.open).length;

  return (
    <>
      <button
        className={`nms-fab${trackingActive ? ' nms-fab--tracking' : ''}${pulseAnim ? ' nms-fab--pulse' : ''}`}
        onClick={() => setIsOpen(v => !v)}
        title="Nearest Medical Stores"
      >
        <div className="nms-fab-icon"><Icons.MapPin /></div>
        {trackingActive && <div className="nms-fab-ring" />}
        {stores.length > 0 && <span className="nms-fab-badge">{stores.length}</span>}
      </button>

      {isOpen && (
        <div className="nms-panel">
          <div className="nms-panel-header">
            <div className="nms-header-left">
              <div className={`nms-live-dot${trackingActive ? ' nms-live-dot--active' : ''}`} />
              <div>
                <h3 className="nms-panel-title">Nearby Medical Stores</h3>
                <p className="nms-panel-subtitle">
                  {!location && !locationError && 'Acquiring GPS signal...'}
                  {location && lastUpdated && `Updated ${formatLastUpdated(lastUpdated)}`}
                  {location && location.accuracy && ` · +/-${Math.round(location.accuracy)}m`}
                </p>
              </div>
            </div>
            <div className="nms-header-actions">
              <button className="nms-icon-btn" onClick={() => location && fetchNearbyStores(location.lat, location.lng)} disabled={loadingStores || !location} title="Refresh">
                <span className={loadingStores ? 'nms-spin' : ''}><Icons.RefreshCw /></span>
              </button>
              <button className="nms-icon-btn nms-icon-btn--close" onClick={() => setIsOpen(false)}><Icons.X /></button>
            </div>
          </div>

          <div className={`nms-status-bar${trackingActive ? ' nms-status-bar--active' : ' nms-status-bar--inactive'}`}>
            <Icons.Crosshair />
            <span>{trackingActive ? `Live tracking ON · ${openCount} store${openCount !== 1 ? 's' : ''} open now` : 'Tracking paused'}</span>
            {!trackingActive && permissionState !== 'denied' && <button className="nms-restart-btn" onClick={startTracking}>Restart</button>}
          </div>

          <div className="nms-panel-body">
            {permissionState === 'denied' && (
              <div className="nms-error-state">
                <Icons.AlertCircle /><h4>Location Access Denied</h4>
                <p>Enable location permissions in your browser settings.</p>
                <button className="nms-retry-btn" onClick={startTracking}>Try Again</button>
              </div>
            )}
            {locationError && permissionState !== 'denied' && (
              <div className="nms-error-state">
                <Icons.AlertCircle /><p>{locationError}</p>
                <button className="nms-retry-btn" onClick={startTracking}>Retry</button>
              </div>
            )}
            {!location && !locationError && (
              <div className="nms-acquiring">
                <div className="nms-gps-animation">
                  <div className="nms-gps-ring" /><div className="nms-gps-ring nms-gps-ring--2" />
                  <div className="nms-gps-ring nms-gps-ring--3" /><div className="nms-gps-dot" />
                </div>
                <p>Acquiring your location...</p><span>This may take a few seconds</span>
              </div>
            )}
            {location && loadingStores && (
              <div className="nms-stores-list">
                {[1,2,3,4].map(i => (
                  <div key={i} className="nms-skeleton-card">
                    <div className="nms-skeleton nms-skeleton--rank" />
                    <div className="nms-skeleton-body">
                      <div className="nms-skeleton nms-skeleton--title" />
                      <div className="nms-skeleton nms-skeleton--subtitle" />
                      <div className="nms-skeleton nms-skeleton--actions" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {location && !loadingStores && stores.length > 0 && (
              <div className="nms-stores-list">
                {stores.map((store, idx) => (
                  <div key={store.id} className={`nms-store-card${!store.open ? ' nms-store-card--closed' : ''}`}>
                    <div className="nms-store-rank">#{idx+1}</div>
                    <div className="nms-store-main">
                      <div className="nms-store-top">
                        <div className="nms-store-name-wrap">
                          <span className="nms-store-name">{store.name}</span>
                          <span className={`nms-open-badge${store.open ? ' nms-open-badge--open' : ' nms-open-badge--closed'}`}>{store.open ? 'Open' : 'Closed'}</span>
                        </div>
                        <div className="nms-store-distance"><Icons.MapPin /><span>{formatDistance(store.distance)}</span></div>
                      </div>
                      <div className="nms-store-meta">
                        <div className="nms-store-rating"><Icons.Star /><span>{store.rating.toFixed(1)}</span></div>
                        <div className="nms-store-hours"><Icons.Clock /><span>{store.hours}</span></div>
                      </div>
                      <div className="nms-store-actions">
                        <button className="nms-action-btn nms-action-btn--directions" onClick={() => window.open(store.directionsUrl,'_blank','noopener')}>
                          <Icons.Navigation /><span>Directions</span>
                        </button>
                        <button className="nms-action-btn nms-action-btn--call" onClick={() => window.open(`tel:${store.phone}`)}>
                          <Icons.Phone /><span>Call</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {location && !loadingStores && stores.length === 0 && !locationError && (
              <div className="nms-empty-state">
                <Icons.MapPin /><h4>No Stores Found</h4><p>No medical stores within 3km.</p>
                <button className="nms-retry-btn" onClick={() => fetchNearbyStores(location.lat, location.lng)}>Search Again</button>
              </div>
            )}
          </div>

          {location && (
            <div className="nms-panel-footer">
              <Icons.Crosshair />
              <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              <a href={`https://www.google.com/maps/search/pharmacy/@${location.lat},${location.lng},15z`} target="_blank" rel="noopener noreferrer" className="nms-maps-link">
                View all on Maps <Icons.ExternalLink />
              </a>
            </div>
          )}
        </div>
      )}

      <style>{`
        .nms-fab,.nms-panel,.nms-panel * { font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; box-sizing:border-box; }
        .nms-fab { position:fixed;bottom:28px;right:28px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#008f70,#00b38e);color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:998;box-shadow:0 6px 24px rgba(0,179,142,0.45);transition:transform .2s ease,box-shadow .2s ease; }
        .nms-fab:hover { transform:scale(1.08) translateY(-2px);box-shadow:0 10px 32px rgba(0,179,142,0.55); }
        .nms-fab-icon { position:relative;z-index:2; }
        .nms-fab-icon svg { width:26px;height:26px;stroke:white; }
        .nms-fab-ring { position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(0,179,142,0.5);animation:nmsRingPulse 2s ease-in-out infinite; }
        @keyframes nmsRingPulse { 0%{transform:scale(1);opacity:.7}50%{transform:scale(1.2);opacity:.3}100%{transform:scale(1);opacity:.7} }
        .nms-fab--pulse .nms-fab-icon { animation:nmsFabPop .3s ease; }
        @keyframes nmsFabPop { 0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)} }
        .nms-fab-badge { position:absolute;top:-2px;right:-2px;background:#ff6b35;color:white;width:20px;height:20px;border-radius:50%;font-size:.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid white;z-index:3; }
        .nms-panel { position:fixed;bottom:100px;right:28px;width:370px;max-height:560px;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.08);z-index:999;display:flex;flex-direction:column;overflow:hidden;animation:nmsSlideUp .28s cubic-bezier(.34,1.56,.64,1);border:1.5px solid #e5e7eb; }
        @keyframes nmsSlideUp { from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)} }
        .nms-panel-header { display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 18px 0; }
        .nms-header-left { display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0; }
        .nms-live-dot { width:10px;height:10px;border-radius:50%;background:#9ca3af;flex-shrink:0;margin-top:5px;transition:background .3s; }
        .nms-live-dot--active { background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.25);animation:nmsDotBlink 2s ease-in-out infinite; }
        @keyframes nmsDotBlink { 0%,100%{box-shadow:0 0 0 3px rgba(16,185,129,.25)}50%{box-shadow:0 0 0 6px rgba(16,185,129,.1)} }
        .nms-panel-title { font-size:.95rem;font-weight:800;color:#1a1a2e;margin:0 0 3px;letter-spacing:-.2px; }
        .nms-panel-subtitle { font-size:.72rem;color:#9ca3af;margin:0;font-weight:500; }
        .nms-header-actions { display:flex;gap:6px;flex-shrink:0; }
        .nms-icon-btn { width:32px;height:32px;border-radius:50%;border:1.5px solid #e5e7eb;background:#f8fafb;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280;transition:all .15s ease; }
        .nms-icon-btn:hover:not(:disabled) { border-color:#00b38e;color:#00b38e;background:#e6f7f4; }
        .nms-icon-btn:disabled { opacity:.4;cursor:not-allowed; }
        .nms-icon-btn--close:hover { border-color:#ef4444 !important;color:#ef4444 !important;background:#fef2f2 !important; }
        .nms-icon-btn svg { width:14px;height:14px; }
        .nms-spin { display:flex;align-items:center;animation:nmsSpin .8s linear infinite; }
        @keyframes nmsSpin { to{transform:rotate(360deg)} }
        .nms-status-bar { display:flex;align-items:center;gap:6px;margin:12px 18px 0;padding:7px 12px;border-radius:8px;font-size:.75rem;font-weight:600; }
        .nms-status-bar--active { background:#ecfdf5;color:#059669;border:1px solid #a7f3d0; }
        .nms-status-bar--inactive { background:#f9fafb;color:#9ca3af;border:1px solid #e5e7eb; }
        .nms-status-bar svg { width:13px;height:13px;flex-shrink:0; }
        .nms-status-bar span { flex:1; }
        .nms-restart-btn { background:#00b38e;color:white;border:none;border-radius:5px;padding:2px 8px;font-size:.7rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap; }
        .nms-panel-body { flex:1;overflow-y:auto;padding:12px 18px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent; }
        .nms-panel-body::-webkit-scrollbar { width:4px; }
        .nms-panel-body::-webkit-scrollbar-thumb { background:#e5e7eb;border-radius:4px; }
        .nms-acquiring { display:flex;flex-direction:column;align-items:center;padding:32px 16px;text-align:center;gap:10px; }
        .nms-gps-animation { position:relative;width:64px;height:64px;margin-bottom:8px; }
        .nms-gps-ring { position:absolute;inset:0;border:2px solid #00b38e;border-radius:50%;opacity:.3;animation:nmsGpsRing 2s ease-in-out infinite; }
        .nms-gps-ring--2 { animation-delay:.5s; }
        .nms-gps-ring--3 { animation-delay:1s; }
        @keyframes nmsGpsRing { 0%{transform:scale(.7);opacity:.5}60%{transform:scale(1.3);opacity:.1}100%{transform:scale(1.5);opacity:0} }
        .nms-gps-dot { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#00b38e;box-shadow:0 0 0 4px rgba(0,179,142,.25); }
        .nms-acquiring p { font-size:.875rem;font-weight:700;color:#1a1a2e;margin:0; }
        .nms-acquiring span { font-size:.78rem;color:#9ca3af; }
        .nms-stores-list { display:flex;flex-direction:column;gap:8px; }
        .nms-store-card { display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid #e5e7eb;border-radius:12px;background:#fff;transition:all .18s ease; }
        .nms-store-card:hover { border-color:#00b38e;box-shadow:0 4px 16px rgba(0,179,142,.1);transform:translateX(2px); }
        .nms-store-card--closed { opacity:.7;background:#f9fafb; }
        .nms-store-rank { width:24px;height:24px;border-radius:6px;background:#e6f7f4;color:#008f70;font-size:.68rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px; }
        .nms-store-main { flex:1;min-width:0; }
        .nms-store-top { display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px; }
        .nms-store-name-wrap { display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;min-width:0; }
        .nms-store-name { font-size:.85rem;font-weight:800;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .nms-open-badge { font-size:.62rem;font-weight:800;padding:2px 6px;border-radius:4px;letter-spacing:.3px;flex-shrink:0; }
        .nms-open-badge--open { background:#ecfdf5;color:#059669; }
        .nms-open-badge--closed { background:#fef2f2;color:#dc2626; }
        .nms-store-distance { display:flex;align-items:center;gap:3px;font-size:.75rem;font-weight:700;color:#00b38e;white-space:nowrap;flex-shrink:0; }
        .nms-store-distance svg { width:12px;height:12px;stroke:#00b38e; }
        .nms-store-meta { display:flex;align-items:center;gap:12px;margin-bottom:8px; }
        .nms-store-rating,.nms-store-hours { display:flex;align-items:center;gap:4px;font-size:.72rem;color:#6b7280;font-weight:500; }
        .nms-store-rating svg { width:11px;height:11px;stroke:#f59e0b;fill:#f59e0b; }
        .nms-store-hours svg { width:11px;height:11px;stroke:#9ca3af; }
        .nms-store-actions { display:flex;gap:6px; }
        .nms-action-btn { display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;font-size:.72rem;font-weight:700;font-family:inherit;cursor:pointer;transition:all .15s ease;border:1.5px solid transparent; }
        .nms-action-btn svg { width:12px;height:12px; }
        .nms-action-btn--directions { background:#00b38e;color:white;border-color:#00b38e; }
        .nms-action-btn--directions:hover { background:#008f70;border-color:#008f70;transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,179,142,.3); }
        .nms-action-btn--call { background:white;color:#4b5563;border-color:#e5e7eb; }
        .nms-action-btn--call:hover { border-color:#00b38e;color:#00b38e; }
        .nms-skeleton-card { display:flex;gap:10px;padding:12px;border:1.5px solid #f3f4f6;border-radius:12px; }
        .nms-skeleton { background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:nmsShimmer 1.4s infinite;border-radius:6px; }
        @keyframes nmsShimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
        .nms-skeleton--rank { width:24px;height:24px;border-radius:6px;flex-shrink:0; }
        .nms-skeleton-body { flex:1;display:flex;flex-direction:column;gap:8px; }
        .nms-skeleton--title { height:14px;width:60%; }
        .nms-skeleton--subtitle { height:11px;width:40%; }
        .nms-skeleton--actions { height:26px;width:80%;border-radius:7px; }
        .nms-error-state,.nms-empty-state { display:flex;flex-direction:column;align-items:center;text-align:center;padding:28px 16px;gap:8px;color:#6b7280; }
        .nms-error-state svg { width:36px;height:36px;stroke:#ef4444;opacity:.7; }
        .nms-empty-state svg { width:36px;height:36px;stroke:#d1d5db; }
        .nms-error-state h4,.nms-empty-state h4 { font-size:.9rem;font-weight:700;color:#1a1a2e;margin:0; }
        .nms-error-state p,.nms-empty-state p { font-size:.8rem;margin:0;line-height:1.5; }
        .nms-retry-btn { background:#00b38e;color:white;border:none;border-radius:8px;padding:7px 16px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px;transition:background .15s; }
        .nms-retry-btn:hover { background:#008f70; }
        .nms-panel-footer { display:flex;align-items:center;gap:6px;padding:10px 18px;border-top:1.5px solid #f3f4f6;font-size:.7rem;color:#9ca3af;font-weight:500;background:#f8fafb; }
        .nms-panel-footer svg { width:11px;height:11px;flex-shrink:0; }
        .nms-maps-link { display:flex;align-items:center;gap:4px;color:#00b38e;text-decoration:none;font-weight:700;margin-left:auto;white-space:nowrap;transition:color .15s; }
        .nms-maps-link:hover { color:#008f70;text-decoration:underline; }
        .nms-maps-link svg { width:10px;height:10px; }
        @media (max-width:480px) { .nms-panel{right:12px;left:12px;width:auto;bottom:90px} .nms-fab{right:16px;bottom:20px} }
      `}</style>
    </>
  );
}