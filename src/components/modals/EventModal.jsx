import React, { useState } from 'react';

function EventModal({ event, onClose, likes, comments, onLike, onComment, score }) {
  if (!event) return null;

  // Only keep local state for the new comment input
  const [newComment, setNewComment] = useState('');

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onComment(newComment.trim());
    setNewComment('');
  };

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
            <span className="score">Score: {Math.round(score)}</span>
            <span className="rank">Rank: #{event.rank}</span>
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

          {/* Like Button Section */}
          <div className="flex items-center gap-2 mt-6 mb-4">
            <button
              onClick={onLike}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>
            
            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Post
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800">{comment.text}</p>
                  <span className="text-sm text-gray-500 mt-2 block">{comment.timestamp}</span>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventModal; 