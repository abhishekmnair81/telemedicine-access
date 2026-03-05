import { useState, useEffect, useRef } from 'react';
import {
  FaPlus,
  FaTrash,
  FaArchive,
  FaEllipsisV,
  FaEdit,
  FaCheck,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaComments,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaUserCircle
} from 'react-icons/fa';
import './ConversationSidebar.css';

const ConversationSidebar = ({ 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation,
  userId,
  refreshTrigger
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  
  // User profile state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const profileMenuRef = useRef(null);

  // Load conversations when component mounts or when userId/trigger changes
  useEffect(() => {
    if (userId) {
      loadConversations();
      loadUserProfile();
    }
  }, [userId, showArchived, refreshTrigger]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeMenu && !e.target.closest('.conversation-actions')) {
        setActiveMenu(null);
      }
      
      // Close profile menu when clicking outside
      if (showProfileMenu && profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenu, showProfileMenu]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log("[ConversationSidebar] Loading conversations for user:", userId);
      
      const params = new URLSearchParams({
        user_id: userId,
        ...(showArchived && { is_archived: 'true' })
      });
      
      const response = await fetch(`http://localhost:8000/api/conversations/?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[ConversationSidebar] API Response:", data);
      
      // Handle different response formats
      let conversationsList = [];
      if (Array.isArray(data)) {
        conversationsList = data;
      } else if (data.results && Array.isArray(data.results)) {
        conversationsList = data.results;
      } else if (data.conversations && Array.isArray(data.conversations)) {
        conversationsList = data.conversations;
      }
      
      setConversations(conversationsList);
      console.log(`[ConversationSidebar] ✅ Loaded ${conversationsList.length} conversations`);
      
    } catch (error) {
      console.error('[ConversationSidebar] Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user profile
  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      console.log("[ConversationSidebar] Loading user profile:", userId);
      
      // Try to get from localStorage first (from login)
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserProfile(user);
        console.log("[ConversationSidebar] ✅ Loaded profile from localStorage:", user);
        return;
      }
      
      // If not in localStorage, try to fetch from API
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await fetch(`http://localhost:8000/api/auth/profile/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const user = await response.json();
          setUserProfile(user);
          console.log("[ConversationSidebar] ✅ Loaded profile from API:", user);
        }
      }
      
    } catch (error) {
      console.error('[ConversationSidebar] Error loading profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    setActiveMenu(null);
    
    if (!window.confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      console.log("[ConversationSidebar] Deleting conversation:", conversationId);
      
      const url = new URL(`http://localhost:8000/api/conversations/${conversationId}/`);
      url.searchParams.append('user_id', userId);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
      });
      
      if (!response.ok && response.status !== 204) {
        if (response.status === 404) {
          console.log("[ConversationSidebar] Already deleted");
        } else if (response.status === 403) {
          alert('You do not have permission to delete this conversation.');
          return;
        } else {
          throw new Error('Failed to delete conversation');
        }
      }
      
      console.log("[ConversationSidebar] ✅ Deleted");
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If deleting current conversation, start new one
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
      
    } catch (error) {
      console.error('[ConversationSidebar] Delete error:', error);
      alert('Failed to delete conversation. Please try again.');
      loadConversations();
    }
  };

  const handleArchive = async (conversationId, isArchived, e) => {
    e.stopPropagation();
    setActiveMenu(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/archive/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: !isArchived }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive conversation');
      }
      
      loadConversations();
      
    } catch (error) {
      console.error('[ConversationSidebar] Archive error:', error);
      alert('Failed to archive conversation');
    }
  };

  const startEditing = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title || 'Untitled');
    setActiveMenu(null);
  };

  const saveTitle = async (conversationId) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/update_title/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update title');
      }
      
      loadConversations();
      setEditingId(null);
      
    } catch (error) {
      console.error('[ConversationSidebar] Update title error:', error);
      alert('Failed to update title');
      setEditingId(null);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const truncateTitle = (title, maxLength = 35) => {
    if (!title) return 'Untitled';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // FIXED: Handle profile actions with correct routing
  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleViewProfile = () => {
    setShowProfileMenu(false);
    const userType = userProfile?.user_type || 'patient';
    
    console.log("[ConversationSidebar] Navigating to profile for user type:", userType);
    
    // Route to the correct profile page based on user type
    if (userType === 'doctor') {
      window.location.href = '/doctor-profile';
    } else if (userType === 'patient') {
      window.location.href = '/patient-profile';
    } else {
      // Fallback for other user types
      console.warn("[ConversationSidebar] Unknown user type, defaulting to patient-profile");
      window.location.href = '/patient-profile';
    }
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    const userType = userProfile?.user_type || 'patient';
    
    // Navigate to settings page (if you have them)
    if (userType === 'doctor') {
      window.location.href = '/doctor-settings';
    } else {
      window.location.href = '/patient-settings';
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Redirect to login
      const userType = userProfile?.user_type || 'patient';
      window.location.href = `/auth?type=${userType}&view=login`;
    }
  };

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="conversation-sidebar collapsed">
        <div className="collapsed-header">
          <button 
            className="expand-btn"
            onClick={handleToggleCollapse}
            title="Show sidebar"
          >
            <FaChevronRight size={16} />
          </button>
        </div>
        <button 
          className="new-chat-btn-collapsed"
          onClick={onNewConversation}
          title="New chat"
        >
          <FaPlus size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="conversation-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <button 
          className="collapse-btn"
          onClick={handleToggleCollapse}
          title="Hide sidebar"
        >
          <FaChevronLeft size={16} />
        </button>
        <button className="new-chat-btn" onClick={onNewConversation}>
          <FaPlus size={14} />
          <span>New chat</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${!showArchived ? 'active' : ''}`}
          onClick={() => setShowArchived(false)}
        >
          Chats
        </button>
        <button
          className={`sidebar-tab ${showArchived ? 'active' : ''}`}
          onClick={() => setShowArchived(true)}
        >
          Archive
        </button>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <FaComments size={32} className="empty-icon" />
            <p className="empty-text">
              {showArchived 
                ? 'No archived chats' 
                : 'No chats yet'}
            </p>
            {!showArchived && (
              <p className="empty-subtext">Start a new conversation</p>
            )}
          </div>
        ) : (
          <div className="conversation-items">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  conversation.id === currentConversationId ? 'active' : ''
                }`}
                onClick={() => onSelectConversation(conversation.id)}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {editingId === conversation.id ? (
                  <div className="edit-container" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="edit-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle(conversation.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      onBlur={() => saveTitle(conversation.id)}
                      autoFocus
                      maxLength={100}
                      placeholder="Conversation title"
                    />
                  </div>
                ) : (
                  <>
                    <div className="conversation-main">
                      <div className="conversation-icon">
                        <FaComments size={14} />
                      </div>
                      <div className="conversation-text">
                        <div className="conversation-title">
                          {truncateTitle(conversation.title)}
                        </div>
                        <div className="conversation-date">
                          {formatDate(conversation.last_message_at || conversation.created_at)}
                        </div>
                      </div>
                    </div>

                    {(hoveredId === conversation.id || activeMenu === conversation.id) && (
                      <div className="conversation-actions">
                        <button
                          className="action-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === conversation.id ? null : conversation.id);
                          }}
                          title="More options"
                        >
                          <FaEllipsisV size={14} />
                        </button>

                        {activeMenu === conversation.id && (
                          <div className="action-menu">
                            <button 
                              className="menu-item"
                              onClick={(e) => startEditing(conversation, e)}
                            >
                              <FaEdit size={14} />
                              <span>Rename</span>
                            </button>
                            <button 
                              className="menu-item"
                              onClick={(e) => handleArchive(conversation.id, conversation.is_archived, e)}
                            >
                              <FaArchive size={14} />
                              <span>{conversation.is_archived ? 'Unarchive' : 'Archive'}</span>
                            </button>
                            <div className="menu-divider"></div>
                            <button 
                              className="menu-item danger"
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            >
                              <FaTrash size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Section */}
      {userProfile && (
        <div className="user-profile-section" ref={profileMenuRef}>
          <div 
            className="user-profile-trigger"
            onClick={handleProfileClick}
          >
            <div className="user-avatar">
              {userProfile.profile_picture_url ? (
                <img 
                  src={userProfile.profile_picture_url} 
                  alt={userProfile.full_name || userProfile.username}
                />
              ) : (
                <FaUserCircle size={32} />
              )}
            </div>
            <div className="user-info">
              <div className="user-name">
                {userProfile.full_name || userProfile.username}
              </div>
              <div className="user-type">
                {userProfile.user_type === 'patient' ? 'Patient' : 
                 userProfile.user_type === 'doctor' ? 'Doctor' : 
                 'User'}
              </div>
            </div>
            <FaEllipsisV size={14} className="user-menu-icon" />
          </div>

          {/* Profile Menu */}
          {showProfileMenu && (
            <div className="user-profile-menu">
              <button 
                className="profile-menu-item"
                onClick={handleViewProfile}
              >
                <FaUser size={14} />
                <span>My Profile</span>
              </button>
              <button 
                className="profile-menu-item"
                onClick={handleSettings}
              >
                <FaCog size={14} />
                <span>Settings</span>
              </button>
              <div className="menu-divider"></div>
              <button 
                className="profile-menu-item danger"
                onClick={handleLogout}
              >
                <FaSignOutAlt size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationSidebar;