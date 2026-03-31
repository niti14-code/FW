import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getCommunityPosts, createCommunityPost, toggleCommunityLike } from '../services/api.js';
import { API_BASE } from '../services/api.js';
import { io } from 'socket.io-client';
import './CommunityPage.css';

const TYPE_COLOR = { tip: 'var(--accent)', landmark: 'var(--green)', alert: 'var(--red)' };
const TYPE_LABEL = { tip: 'Tip', landmark: 'Pin', alert: 'Alert' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

export default function CommunityPage({ navigate }) {
  const { user }    = useAuth();
  const userCollege = user?.college || '';

  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [form,       setForm]       = useState({ content: '', type: 'tip' });
  const [submitting, setSubmitting] = useState(false);
  const [liked,      setLiked]      = useState({});
  const socketRef = useRef(null);

  // Fetch posts from backend on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommunityPosts()
      .then(data => {
        if (!cancelled) {
          setPosts(data);
          const likedMap = {};
          data.forEach(p => {
            if (p.likedBy?.some(id => id === user?._id || id?._id === user?._id)) {
              likedMap[p._id] = true;
            }
          });
          setLiked(likedMap);
          setError('');
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load posts');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // Socket.IO: join college room and listen for new posts in real-time
  useEffect(() => {
    if (!user?._id || !userCollege) return;
    const socketUrl = API_BASE.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-college-chat', { userId: user._id });
    });

    socket.on('new-community-post', (post) => {
      setPosts(prev => {
        if (prev.some(p => p._id === post._id)) return prev;
        return [post, ...prev];
      });
    });

    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, [user?._id, userCollege]);

  // Submit new post
  const handlePost = async () => {
    if (!form.content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newPost = await createCommunityPost({ content: form.content, type: form.type });
      setPosts(prev => [newPost, ...prev]);
      setForm({ content: '', type: 'tip' });
      setShowForm(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle like with optimistic update
  const handleLike = async (postId) => {
    const wasLiked = liked[postId];
    setLiked(l => ({ ...l, [postId]: !wasLiked }));
    setPosts(p => p.map(post =>
      post._id === postId ? { ...post, likes: post.likes + (wasLiked ? -1 : 1) } : post
    ));
    try {
      await toggleCommunityLike(postId);
    } catch {
      setLiked(l => ({ ...l, [postId]: wasLiked }));
      setPosts(p => p.map(post =>
        post._id === postId ? { ...post, likes: post.likes + (wasLiked ? 1 : -1) } : post
      ));
    }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.type === filter);

  return (
    <div className="community-wrap fade-up">
      <p className="eyebrow mb-8">Community</p>
      <h1 className="heading mb-4" style={{ fontSize: 28 }}>Community Hub</h1>
      <p className="text-muted mb-32 text-sm">
        {userCollege
          ? <>{`Showing posts from `}<strong>{userCollege}</strong>{` only`}</>
          : 'Share tips, landmarks, and alerts with fellow campus commuters'}
      </p>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="comm-top mb-24">
        <div className="comm-filters">
          {['all', 'tip', 'landmark', 'alert'].map(f => (
            <button key={f}
              className={'filter-pill' + (filter === f ? ' active' : '')}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {showForm && (
        <div className="comm-form mb-24">
          <h3 className="heading mb-16" style={{ fontSize: 16 }}>Share with the community</h3>
          <div className="field mb-16">
            <label>Post Type</label>
            <div className="type-pills">
              {['tip', 'landmark', 'alert'].map(t => (
                <button key={t} type="button"
                  className={'type-pill' + (form.type === t ? ' active' : '')}
                  style={form.type === t ? { borderColor: TYPE_COLOR[t], background: TYPE_COLOR[t] + '22', color: TYPE_COLOR[t] } : {}}
                  onClick={() => setForm(f => ({ ...f, type: t }))}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Your Message</label>
            <textarea className="input" rows={3}
              placeholder="Share a tip, landmark, or safety alert..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <button
            className={`btn btn-primary mt-16 ${submitting ? 'btn-loading' : ''}`}
            disabled={!form.content.trim() || submitting}
            onClick={handlePost}>
            {!submitting && 'Post to Community'}
          </button>
        </div>
      )}

      <div className="comm-list">
        {loading && (
          <div className="empty-state">
            <div className="empty-sub">Loading posts…</div>
          </div>
        )}

        {!loading && filtered.map(post => {
          const authorName    = post.author?.name    || 'Unknown';
          const authorCollege = post.author?.college || post.college || '';
          const avatar        = authorName.charAt(0).toUpperCase();
          return (
            <div key={post._id} className="comm-post card">
              <div className="card-body">
                <div className="post-top">
                  <div className="admin-avatar" style={{ width: 38, height: 38, fontSize: 14, flexShrink: 0 }}>{avatar}</div>
                  <div className="post-meta flex-1">
                    <div className="post-name">{authorName} <span className="post-college">{authorCollege}</span></div>
                    <div className="post-time">{timeAgo(post.createdAt)}</div>
                  </div>
                  <div className="post-type-tag" style={{ background: TYPE_COLOR[post.type] + '22', color: TYPE_COLOR[post.type] }}>
                    {TYPE_LABEL[post.type]}
                  </div>
                </div>
                <p className="post-body mt-12">{post.content}</p>
                <div className="post-foot mt-12">
                  <button
                    className={'like-pill' + (liked[post._id] ? ' liked' : '')}
                    onClick={() => handleLike(post._id)}>
                    {liked[post._id] ? 'Liked' : 'Like'} {post.likes}
                  </button>
                  <button className="action-pill">Reply</button>
                  <button className="action-pill">Share</button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <div className="empty-title">Nothing here yet</div>
            <div className="empty-sub">Be the first to post from {userCollege || 'your college'}!</div>
          </div>
        )}
      </div>
    </div>
  );
}
