import React from 'react';

function EventModal({ event, onClose }) {
  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-image-placeholder">
          <div className="placeholder-text">News Image</div>
        </div>
        
        <div className="modal-body">
          <h2>{event.title}</h2>
          
          <div className="event-metadata">
            <span className="category">{event.category}</span>
            <span className="date">{new Date(event.timestamp).toLocaleDateString()}</span>
            {event.verified && <span className="verified">✓ Verified</span>}
          </div>
          
          <div className="event-tags">
            {event.tags.map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
          
          <div className="article-content">
            <p>{event.description}</p>
            <p>Additional details and context about this event will be displayed here.</p>
            <p>Further information about related developments and implications will be shown in this section.</p>
          </div>
          
          <div className="event-source">
            Source: <strong>{event.source}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventModal; 