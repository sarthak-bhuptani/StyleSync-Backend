import { User } from '../models/User.js';
import { uploadImage } from '../config/cloudinary.js';
import { analyzePhysicalTraits, getColorDrapingAnalysisWithGemini } from '../services/geminiVisionService.js';

/**
 * Helper to normalize and validate physical traits against Mongoose enums
 */
const normalizePhysicalTraits = (traits = {}) => {
  const validFaceShapes = ['Oval', 'Square', 'Round', 'Heart', 'Oblong', 'Diamond'];
  const validUndertones = ['Warm Golden', 'Cool Rosy', 'Neutral', 'Olive', 'Deep Warm'];
  const validColorSeasons = ['Warm Autumn', 'Cool Winter', 'Light Spring', 'Soft Summer', 'Deep Autumn', 'Clear Winter'];
  const validSilhouettes = ['Athletic V-Taper', 'Lean Rectangle', 'Hourglass', 'Pear/Triangle', 'Inverted Triangle', 'Oval/Apple'];

  let faceShape = traits.faceShape || 'Oval';
  const matchedFace = validFaceShapes.find(f => faceShape.toLowerCase().includes(f.toLowerCase()));
  if (matchedFace) faceShape = matchedFace;

  let skinUndertone = traits.skinUndertone || traits.skinTone || 'Warm Golden';
  const matchedTone = validUndertones.find(t => skinUndertone.toLowerCase().includes(t.toLowerCase()));
  if (matchedTone) skinUndertone = matchedTone;

  let colorSeason = traits.colorSeason || 'Warm Autumn';
  const matchedSeason = validColorSeasons.find(s => colorSeason.toLowerCase().includes(s.toLowerCase()));
  if (matchedSeason) colorSeason = matchedSeason;

  let bodySilhouette = traits.bodySilhouette || traits.bodyType || 'Athletic V-Taper';
  const matchedSil = validSilhouettes.find(s => bodySilhouette.toLowerCase().includes(s.toLowerCase().replace('/', ' ')));
  if (matchedSil) bodySilhouette = matchedSil;

  return {
    faceShape: validFaceShapes.includes(faceShape) ? faceShape : 'Oval',
    skinUndertone: validUndertones.includes(skinUndertone) ? skinUndertone : 'Warm Golden',
    colorSeason: validColorSeasons.includes(colorSeason) ? colorSeason : 'Warm Autumn',
    bodySilhouette: validSilhouettes.includes(bodySilhouette) ? bodySilhouette : 'Athletic V-Taper',
    hairColor: traits.hairColor || '',
    eyeColor: traits.eyeColor || '',
    calibrationConfidence: traits.confidence || traits.calibrationConfidence || '92%',
    calibrationNotes: traits.stylingNotes || traits.calibrationNotes || '',
    calibratedAt: new Date(),
  };
};

/**
 * @desc    Get user profile
 * @route   GET /api/v1/profile
 * @access  Private
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user styling preferences and traits
 * @route   PUT /api/v1/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      avatar,
      physicalTraits,
      physicalAnalysis,
      preferences,
      sizes,
      stylePreferences,
      favoriteColors,
      avoidColors,
      favoriteBrands,
      brandsToAvoid,
      gender,
      height,
      location,
      isOnboarded,
      onboardingStep,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (gender) user.gender = gender;
    if (height) user.height = height;
    if (location) user.location = location;
    if (isOnboarded !== undefined) user.isOnboarded = isOnboarded;
    if (onboardingStep !== undefined) user.onboardingStep = onboardingStep;

    if (physicalTraits || physicalAnalysis) {
      const normalized = normalizePhysicalTraits(physicalTraits || physicalAnalysis);
      user.physicalTraits = {
        ...user.physicalTraits.toObject(),
        ...normalized,
      };
    }

    if (preferences) {
      user.preferences = {
        ...user.preferences.toObject(),
        ...preferences,
      };
    }

    if (sizes) {
      user.preferences.sizes = {
        ...user.preferences.sizes.toObject(),
        ...sizes,
      };
    }

    if (stylePreferences) user.preferences.favoriteStyles = stylePreferences;
    if (favoriteColors) user.preferences.favoriteColors = favoriteColors;
    if (avoidColors) user.preferences.avoidColors = avoidColors;
    if (favoriteBrands) user.preferences.favoriteBrands = favoriteBrands;
    if (brandsToAvoid) user.preferences.brandsToAvoid = brandsToAvoid;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete 6-step personalized onboarding
 * @route   POST /api/v1/profile/onboarding
 * @access  Private
 */
export const completeOnboarding = async (req, res, next) => {
  try {
    const { physicalTraits, physicalAnalysis, preferences, onboardingStep = 6 } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (physicalTraits || physicalAnalysis) {
      const normalized = normalizePhysicalTraits(physicalTraits || physicalAnalysis);
      user.physicalTraits = {
        ...user.physicalTraits.toObject(),
        ...normalized,
      };
    }

    if (preferences) {
      user.preferences = {
        ...user.preferences.toObject(),
        ...preferences,
      };
    }

    user.isOnboarded = true;
    user.onboardingStep = onboardingStep;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    AI Physical Calibration via Selfie/Portrait photo scan
 * @route   POST /api/v1/profile/scan-face-body
 * @access  Private
 */
export const scanFaceAndBody = async (req, res, next) => {
  try {
    let imageUrl = '';
    let imageBuffer = null;
    let mimeType = 'image/jpeg';

    const imageSource = req.body.image || req.body.imageUrl || req.body.photo || req.body.avatar || req.body.selfie;

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      imageUrl = await uploadImage(imageBuffer, mimeType, 'stylesync/profiles');
    } else if (imageSource) {
      imageUrl = imageSource;
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        imageBuffer = Buffer.from(parts[1], 'base64');
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          const imageRes = await fetch(imageUrl);
          const arrayBuf = await imageRes.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
          mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
        } catch (fetchErr) {
          return res.status(400).json({
            success: false,
            message: `Could not load image from URL: ${fetchErr.message}`,
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a selfie photo (file field "image" or JSON "image")',
      });
    }

    if (!imageBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Could not process image file. Please provide a valid image buffer or data URI.',
      });
    }

    // Call Gemini Vision to analyze physical traits
    const detectedTraits = await analyzePhysicalTraits(imageBuffer, mimeType);

    // Verify human face detection
    if (detectedTraits.isHumanFace === false || detectedTraits.faceDetected === false) {
      return res.status(422).json({
        success: false,
        message: detectedTraits.errorMessage || 'No human face or portrait detected. Please upload a clear photo showing your face and shoulders.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (imageUrl) {
      user.avatar = imageUrl;
    }

    const normalized = normalizePhysicalTraits(detectedTraits);
    user.physicalTraits = {
      ...user.physicalTraits.toObject(),
      ...normalized,
    };

    if (detectedTraits.avoidPalette && detectedTraits.avoidPalette.length > 0) {
      user.preferences.avoidColors = Array.from(
        new Set([...user.preferences.avoidColors, ...detectedTraits.avoidPalette])
      );
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Physical traits calibrated successfully with AI Vision',
      data: {
        user,
        physicalTraits: user.physicalTraits,
        detectedAnalysis: detectedTraits,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Get Digital Color Draping Studio analysis & seasonal swatches
 * @route   GET /api/v1/profile/color-draping
 * @access  Private
 */
export const getColorDraping = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const drapingData = await getColorDrapingAnalysisWithGemini(user.physicalTraits);
    res.status(200).json({
      success: true,
      message: 'Color draping matrix generated',
      data: {
        ...drapingData,
        avatar: user.avatar,
        faceShape: user.physicalTraits?.faceShape || 'Oval',
      },
    });
  } catch (error) {
    next(error);
  }
};
