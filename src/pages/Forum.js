import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUser } from '../contexts/UserContext';
import { getAllMessages, saveMessage, subscribeToMessages, deleteMessage } from '../services/messageService';
import '../assets/styles/Forum.css';
import { UserContext } from '../App';

// Mock user avatars - replace with actual avatars from your system
const avatars = {
  default: 'https://ui-avatars.com/api/?background=random',
  shelter: 'https://randomuser.me/api/portraits/women/65.jpg',
  donor: 'https://randomuser.me/api/portraits/men/32.jpg',
  volunteer: 'https://randomuser.me/api/portraits/women/44.jpg',
};

const ForumPage = () => {
  // Get user from context
  const { user } = useAuth0();
  const { userDetails } = useUser();
  const { userData } = useContext(UserContext);
  
  // State for messages and message input
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track account type at component level
  const [currentAccountType, setCurrentAccountType] = useState('guest');
  
  // Reference to scroll to bottom of messages
  const messagesEndRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const messagesContainerRef = useRef(null);
  
  // Determine the user's account type on component mount
  useEffect(() => {
    // Check and update account type when dependencies change
    const checkAccountType = () => {
      console.log('User data for account type detection:', {
        'Main userData': userData,
        'userDetails': userDetails,
        'Auth0 user': user
      });
      
      // Start with guest
      let detectedType = 'guest';
      
      // First try to get from main UserContext (most reliable)
      if (userData?.accountType) {
        console.log('Found account type in main userData:', userData.accountType);
        detectedType = userData.accountType;
      } else if (userDetails?.accountType) {
        console.log('Found account type in userDetails:', userDetails.accountType);
        detectedType = userDetails.accountType;
      } else if (userDetails?.userType) {
        console.log('Found user type in userDetails:', userDetails.userType);
        detectedType = userDetails.userType;
      } else if (userData?.role === 'organizer' || userData?.role === 'admin') {
        console.log('Found organizer/admin role in userData');
        detectedType = 'organizer';
      } else if (userDetails?.role === 'organizer' || userDetails?.role === 'admin') {
        console.log('Found organizer/admin role in userDetails');
        detectedType = 'organizer';
      }
      
      // Check for localStorage fallback for account type
      if (detectedType === 'guest' && user?.sub) {
        const localStorageType = localStorage.getItem(`user_type_${user.sub}`);
        if (localStorageType) {
          console.log('Found account type in localStorage:', localStorageType);
          detectedType = localStorageType;
        }
      }
      
      // Special case handling for users we know are organizers
      if (userData?.isOrganizer === true || userDetails?.isOrganizer === true) {
        console.log('Found explicit isOrganizer flag');
        detectedType = 'organizer';
      }
      
      // Debug account type after all checks
      console.log('Final determined account type:', detectedType);
      
      // Update state
      setCurrentAccountType(detectedType);
    };
    
    checkAccountType();
  }, [user, userDetails, userData]);
  
  // Fetch messages when component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Capture current scroll position before loading
        const scrollY = window.scrollY;
        
        const response = await getAllMessages();
        if (response.success) {
          // Log message data for debugging
          if (response.data.length > 0) {
            console.log('First message user type:', response.data[0].userType);
            console.log('All message types:', response.data.map(m => m.userType));
          }
          
          // Only scroll to bottom on first load when there are no messages
          const isFirstLoad = messages.length === 0;
          setMessages(response.data);
          
          if (isFirstLoad && response.data.length > 0) {
            // If this is the first load with messages, scroll to bottom of container only
            shouldScrollToBottomRef.current = true;
          } else {
            // Otherwise preserve scroll position
            shouldScrollToBottomRef.current = false;
            setTimeout(() => {
              window.scrollTo(0, scrollY);
            }, 0);
          }
        } else {
          setError('Failed to load messages');
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToMessages((newMessages) => {
      // Capture current scroll position of the window before updating
      const scrollY = window.scrollY;
      
      // Update messages without scrolling
      setMessages(newMessages);
      
      // Restore window scroll position after render
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Update the scrollIntoView behavior to only affect the container
  useEffect(() => {
    if (shouldScrollToBottomRef.current && messagesEndRef.current && messagesContainerRef.current) {
      // Only scroll the messages container, not the whole page
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);
  
  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffMs = now - messageDate;
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
  // Helper to get formatted user type
  const getUserTypeLabel = (userType) => {
    if (!userType) return 'Guest';
    
    // Add detailed logging to debug user type issues
    console.log('Processing user type:', userType, typeof userType);
    
    const type = typeof userType === 'string' ? userType.toLowerCase() : 'guest';
    switch(type) {
      case 'individual':
        return 'Individual';
      case 'business':
      case 'supplier':
        return 'Business';
      case 'distributor':
      case 'foodbank':
        return 'Food Bank';
      case 'volunteer':
        return 'Volunteer';
      case 'organizer':
      case 'admin':
        return 'Organizer';
      default:
        console.log('Unrecognized user type:', userType, 'defaulting to Guest');
        return 'Guest';
    }
  };
  
  // Helper to clean display name (avoid showing email)
  const cleanDisplayName = (name) => {
    if (!name) return 'Anonymous';
    
    // If it looks like an email, show only the part before @
    if (name.includes('@')) {
      return name.split('@')[0];
    }
    
    return name;
  };
  
  // Display name (username) from userData or auth0
  const getDisplayName = () => {
    // First priority: username from MongoDB (via main UserContext)
    if (userData?.username) {
      console.log('Using username from main userData:', userData.username);
      return userData.username;
    }
    
    // Second priority: username from UserDetails context
    if (userDetails?.username) {
      console.log('Using username from userDetails:', userDetails.username);
      return userDetails.username;
    }
    
    // Third priority: nickname from Auth0
    if (user?.nickname && user.nickname.trim()) {
      console.log('Using nickname from Auth0:', user.nickname);
      return user.nickname;
    }
    
    // Fourth priority: Auth0 name if not an email
    if (user?.name && !user.name.includes('@')) {
      console.log('Using name from Auth0:', user.name);
      return user.name;
    }
    
    // Last resort: first part of email or Anonymous
    if (user?.name && user.name.includes('@')) {
      const emailName = user.name.split('@')[0];
      console.log('Using email name part:', emailName);
      return emailName;
    }
    
    return 'Anonymous User';
  };

  // Get the properly prioritized display name
  const displayName = getDisplayName();
  
  // Clean the display name before sending
  const cleanedDisplayName = cleanDisplayName(displayName);
  
  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const messageData = {
      username: cleanedDisplayName,
      userType: currentAccountType,  // Use the carefully determined account type
      avatar: user?.picture || `https://ui-avatars.com/api/?name=${cleanedDisplayName}&background=random`,
      content: newMessage.trim(),
      auth0Id: user?.sub || undefined,  // Include Auth0 ID if available
    };
    
    try {
      // Optimistically update UI
      const tempMessage = {
        ...messageData,
        id: `temp-${Date.now()}`,
        timestamp: new Date(),
      };
      
      // When sending our own message, we want to scroll to bottom
      shouldScrollToBottomRef.current = true;
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      setNewMessage('');
      
      // Save to server
      const response = await saveMessage(messageData);
      
      if (!response.success) {
        console.error('Error saving message:', response.error);
        // Could show a toast/notification here about the error
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Could show a toast/notification here about the error
    }
  };
  
  // Handle message deletion
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    
    // Ask for confirmation
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    
    try {
      // Optimistically remove from UI
      setMessages(prevMessages => 
        prevMessages.filter(msg => (msg._id !== messageId && msg.id !== messageId))
      );
      
      // Delete from server
      const response = await deleteMessage(messageId);
      
      if (!response.success) {
        console.error('Error deleting message:', response.error);
        // Refetch messages if deletion failed
        const refreshResponse = await getAllMessages();
        if (refreshResponse.success) {
          setMessages(refreshResponse.data);
        }
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };
  
  // Helper to check if a message belongs to current user
  const isOwnMessage = (message) => {
    if (!user && !userDetails && !userData) return false;
    
    // Check all possible username matches
    const usernames = [
      userData?.username,
      userDetails?.username,
      user?.nickname,
      user?.name
    ].filter(Boolean); // Remove nulls/undefined
    
    // Log message ownership check
    console.log('Checking if message is own:', {
      messageUsername: message.username,
      messageAuth0Id: message.auth0Id,
      usernames: usernames,
      auth0Id: user?.sub
    });
    
    // Match by auth0 ID if available (most reliable)
    if (message.auth0Id && user?.sub) {
      return message.auth0Id === user.sub;
    }
    
    // Fall back to username matching (try all username variations)
    return usernames.some(username => 
      message.username === username || 
      // Also try cleaned version in case message username is stored differently
      cleanDisplayName(message.username) === cleanDisplayName(username)
    );
  };
  
  // Debug user data when it changes
  useEffect(() => {
    console.log('User data updated:', { 
      userData: userData || 'None',
      userDetails: userDetails || 'None',
      auth0User: user || 'None'
    });
    
    // Check if we have a MongoDB username
    if (userData?.username) {
      console.log('MongoDB username found:', userData.username);
    } else {
      console.log('No MongoDB username found in userData');
    }
    
    // Check for conflicts in username sources
    if (userData?.username && userDetails?.username && userData.username !== userDetails.username) {
      console.warn('Username mismatch between userData and userDetails:', {
        userDataUsername: userData.username,
        userDetailsUsername: userDetails.username
      });
    }
  }, [userData, userDetails, user]);
  
  return (
    <div className="forum-container simple">
      {/* Main Content */}
      <div className="forum-content">
        <div className="channel-header">
          <h2>Community Chat</h2>
        </div>
        
        {/* Messages */}
        <div 
          className="messages-container" 
          ref={messagesContainerRef}
          onScroll={() => {
            if (messagesContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
              // Check if user has scrolled to bottom of container (within 50px)
              const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
              
              // Only update ref, don't trigger state changes on scroll
              shouldScrollToBottomRef.current = isAtBottom;
            }
          }}
        >
          {isLoading ? (
            <div className="loading-messages">
              <p>Loading messages...</p>
            </div>
          ) : error ? (
            <div className="error-messages">
              <p>{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <p>No messages yet. Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = isOwnMessage(message);
              
              // For the user's own messages, use the account type we determined above
              // This ensures that the current user always sees their correct type
              let messageUserType = message.userType;
              if (isOwn && currentAccountType !== 'guest') {
                console.log('Overriding own message type from', message.userType, 'to', currentAccountType);
                messageUserType = currentAccountType;
              }
              
              // Ensure proper user type display
              const displayedUserType = getUserTypeLabel(messageUserType);
              
              // Clean the username to avoid displaying emails
              const cleanedUsername = cleanDisplayName(message.username);
              
              return (
                <div className={`message ${isOwn ? 'own-message' : ''}`} key={message.id || message._id}>
                  <div className="message-avatar">
                    <img src={message.avatar} alt={cleanedUsername} />
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-username">
                        {cleanedUsername}
                      </span>
                      <span className="user-type-badge">
                        {displayedUserType}
                      </span>
                      <span className="message-timestamp">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      
                      {/* Delete button - only show for user's own messages */}
                      {isOwn && (
                        <button 
                          className="delete-message-btn" 
                          onClick={() => handleDeleteMessage(message._id || message.id)}
                          aria-label="Delete message"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="message-text">{message.content}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="message-input-container">
          <form onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!newMessage.trim() || isLoading}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForumPage; 