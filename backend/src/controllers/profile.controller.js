import cloudinary from '../lib/cloudinary.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Update profile (username and email)
export const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { image, mimetype } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate image type - only JPEG and PNG allowed
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!mimetype || !allowedTypes.includes(mimetype.toLowerCase())) {
      return res.status(400).json({ error: 'Only JPEG and PNG images are allowed' });
    }

    // Validate base64 string length (roughly 5MB limit)
    const base64Length = image.length;
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const estimatedSize = (base64Length * 3) / 4; // Base64 encoding increases size by ~33%
    
    if (estimatedSize > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }

    // Check Cloudinary configuration
    const missingVars = [];
    if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push('CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');
    
    if (missingVars.length > 0) {
      console.error('Cloudinary configuration missing:', missingVars.join(', '));
      return res.status(500).json({ 
        error: 'Image upload service not configured',
        missing: missingVars
      });
    }

    // Convert base64 to data URI for Cloudinary upload
    const dataUri = `data:${mimetype};base64,${image}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'chess-project/profile-pictures',
      transformation: [
        { width: 400, height: 400, crop: 'limit' },
        { quality: 'auto' }
      ],
      resource_type: 'image'
    });

    // Update user's profile picture in database
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile picture from Cloudinary if it exists
    if (user.profilePicture) {
      const publicId = user.profilePicture.split('/').slice(-2).join('/').split('.')[0];
      try {
        await cloudinary.uploader.destroy(`chess-project/profile-pictures/${publicId}`);
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
        // Continue even if deletion fails
      }
    }

    // Update user with new profile picture URL
    user.profilePicture = result.secure_url;
    await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: result.secure_url,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error uploading profile picture',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete profile picture
export const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ error: 'No profile picture to delete' });
    }

    // Extract public ID from URL
    const urlParts = user.profilePicture.split('/');
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = publicIdWithExt.split('.')[0];
    const folderPath = urlParts.slice(-2, -1)[0];

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(`${folderPath}/${publicId}`);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Continue to remove from database even if Cloudinary deletion fails
    }

    // Remove from database
    user.profilePicture = null;
    await user.save();

    res.json({
      message: 'Profile picture deleted successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: null
      }
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ error: 'Error deleting profile picture' });
  }
};

