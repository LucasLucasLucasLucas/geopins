import React, { useState } from 'react';
import { Event } from '../../types/Event';
import './EventModal.css';

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onLike: () => void;
  onComment: (text: string) => void;
}

function EventModal({ event, onClose, onLike, onComment }: EventModalProps) {
  const [commentText, setCommentText] = useState('');

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(commentText.trim());
      setCommentText('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <h2>{event.title}</h2>
          <div className="event-meta">
            {event.sourceTier && (
              <span className={`source-tier-badge tier-${event.sourceTier}`}>
                {event.sourceTier.charAt(0).toUpperCase() + event.sourceTier.slice(1)}
              </span>
            )}
            {event.tags?.map(tag => (
              <span key={tag} className="tag-badge">{tag}</span>
            ))}
          </div>
        </div>

        <div className="modal-body">
          <div className="event-details">
            {event.image && (
              <div className="event-image">
                <img src={event.image} alt={event.title} />
              </div>
            )}
            
            <p className="event-summary">{event.summary}</p>
            
            <div className="event-articles">
              <h3>Related Articles</h3>
              {event.articles.map((article, index) => (
                <div key={index} className="article-item">
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.publisher}
                  </a>
                  {article.snippet && <p className="article-snippet">{article.snippet}</p>}
                </div>
              ))}
            </div>

            <div className="event-stats">
              <div className="stat-item">
                <span className="stat-label">Score</span>
                <span className="stat-value">{Math.round(event.score)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Rank</span>
                <span className="stat-value">#{event.rank}</span>
              </div>
              <div className="stat-item">
                <button className="like-button" onClick={onLike}>
                  ❤️ {event.likes}
                </button>
              </div>
            </div>

            <div className="event-comments">
              <h3>Comments ({event.comments.length})</h3>
              <form onSubmit={handleSubmitComment} className="comment-form">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                <button type="submit" disabled={!commentText.trim()}>
                  Post Comment
                </button>
              </form>
              
              <div className="comments-list">
                {event.comments.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <p className="comment-text">{comment.text}</p>
                    <span className="comment-timestamp">{comment.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventModal; 