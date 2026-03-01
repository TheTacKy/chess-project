import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { profileAPI } from '../api';

// Available piece themes
const PIECE_THEMES = [
  { name: 'Alpha', value: 'alpha' },
  { name: 'Anarcandy', value: 'anarcandy' },
  { name: 'Caliente', value: 'caliente' },
  { name: 'California', value: 'california' },
  { name: 'Cardinal', value: 'cardinal' },
  { name: 'Cburnett', value: 'cburnett' },
  { name: 'Celtic', value: 'celtic' },
  { name: 'Chess7', value: 'chess7' },
  { name: 'Chessnut', value: 'chessnut' },
  { name: 'Companion', value: 'companion' },
  { name: 'Cooke', value: 'cooke' },
  { name: 'Disguised', value: 'disguised' },
  { name: 'Dubrovny', value: 'dubrovny' },
  { name: 'Fantasy', value: 'fantasy' },
  { name: 'Firi', value: 'firi' },
  { name: 'Fresca', value: 'fresca' },
  { name: 'Gioco', value: 'gioco' },
  { name: 'Governor', value: 'governor' },
  { name: 'Horsey', value: 'horsey' },
  { name: 'ICPieces', value: 'icpieces' },
  { name: 'Kiwen Suwi', value: 'kiwen-suwi' },
  { name: 'Kosal', value: 'kosal' },
  { name: 'Leipzig', value: 'leipzig' },
  { name: 'Letter', value: 'letter' },
  { name: 'Maestro', value: 'maestro' },
  { name: 'Merida', value: 'merida' },
  { name: 'Monarchy', value: 'monarchy' },
  { name: 'Mono', value: 'mono' },
  { name: 'MPChess', value: 'mpchess' },
  { name: 'Pirouetti', value: 'pirouetti' },
  { name: 'Pixel', value: 'pixel' },
  { name: 'Reilly Craig', value: 'reillycraig' },
  { name: 'Rhosgfx', value: 'rhosgfx' },
  { name: 'Riohacha', value: 'riohacha' },
  { name: 'Shahi Ivory Brown', value: 'shahi-ivory-brown' },
  { name: 'Shapes', value: 'shapes' },
  { name: 'Spatial', value: 'spatial' },
  { name: 'Staunty', value: 'staunty' },
  { name: 'Tatiana', value: 'tatiana' },
  { name: 'XKCD', value: 'xkcd' },
];

function Settings() {
  const { user, getCurrentUser } = useAuthStore();
  const [pieceTheme, setPieceTheme] = useState('alpha');
  
  // Profile editing state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Load user data and piece theme
  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('pieceTheme');
    if (savedTheme) {
      setPieceTheme(savedTheme);
    }

    // Load user data
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setProfilePicture(user.profilePicture);
    } else {
      // Try to fetch user if not loaded
      getCurrentUser().catch(() => {
        // Silently handle errors (guest users are allowed)
      });
    }
  }, [user, getCurrentUser]);

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setProfilePicture(user.profilePicture);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await profileAPI.updateProfile(username, email);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh user data
      await getCurrentUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) {
      setError('You must be logged in to upload a profile picture');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);
    setError('');
    setSuccess('');

    try {
      const response = await profileAPI.uploadProfilePicture(file);
      setSuccess('Profile picture uploaded successfully!');
      setProfilePicture(response.profilePicture);
      
      // Refresh user data
      await getCurrentUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user || !profilePicture) return;

    setUploadingPicture(true);
    setError('');
    setSuccess('');

    try {
      await profileAPI.deleteProfilePicture();
      setSuccess('Profile picture deleted successfully!');
      setProfilePicture(null);
      
      // Refresh user data
      await getCurrentUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleThemeChange = (theme) => {
    setPieceTheme(theme);
    localStorage.setItem('pieceTheme', theme);
    
    // Dispatch event to update chess board if it's already initialized
    window.dispatchEvent(new CustomEvent('pieceThemeChanged', { detail: { theme } }));
  };

  const getPiecePreviewPath = (theme) => {
    // Use king piece for preview
    return `/img/customchesspieces/${theme}/wK.svg`;
  };

  // Show message if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-800 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-8">
            Settings
          </h1>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Please log in to access settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-800 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-8">
          Settings
        </h1>
        
        {/* Profile Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-6">
            Profile
          </h2>

          {/* Profile Picture */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="/img/blank-profile.webp"
                    alt="Default Profile"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors inline-block">
                    {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    disabled={uploadingPicture}
                  />
                </label>
                {profilePicture && (
                  <button
                    onClick={handleDeleteProfilePicture}
                    disabled={uploadingPicture}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            {isEditing ? (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white transition-all"
                placeholder="Enter username"
              />
            ) : (
              <div className="px-4 py-3 bg-zinc-800 rounded-xl text-white">
                {username || 'Not set'}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white transition-all"
                placeholder="Enter email"
              />
            ) : (
              <div className="px-4 py-3 bg-zinc-800 rounded-xl text-white">
                {email || 'Not set'}
              </div>
            )}
          </div>

          {/* Edit/Save/Cancel Buttons */}
          <div className="flex gap-3 mb-6">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Password Changer Placeholder */}
          <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
              Change password (Coming soon)
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>
        
        {/* Piece Theme Selection */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
            Chess Piece Theme
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Choose your preferred chess piece style. Changes will apply to new games.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {PIECE_THEMES.map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  pieceTheme === theme.value
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-zinc-800 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-zinc-800 rounded">
                    <img
                      src={getPiecePreviewPath(theme.value)}
                      alt={theme.name}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    pieceTheme === theme.value
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {theme.name}
                  </span>
                  {pieceTheme === theme.value && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
