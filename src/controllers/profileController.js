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
      budget,
      styleArchetype,
      stylePreferences,
      favoriteColors,
      avoidColors,
      favoriteBrands,
      brandsToAvoid,
      gender,
      height,
      weight,
      location,
      isOnboarded,
      onboardingCompleted,
      onboardingStep,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (gender) user.gender = gender;
    if (height) user.physicalTraits.height = height;
    if (weight) user.physicalTraits.weight = weight;
    if (styleArchetype) user.styleArchetype = styleArchetype;
    if (location) user.location = location;
    if (isOnboarded !== undefined) user.isOnboarded = isOnboarded;
    if (onboardingCompleted !== undefined) {
      user.isOnboarded = onboardingCompleted;
      user.onboardingCompleted = onboardingCompleted;
    }
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
      user.sizes = {
        ...user.sizes.toObject(),
        ...sizes,
      };
      user.preferences.sizes = {
        ...user.preferences.sizes.toObject(),
        ...sizes,
      };
    }

    if (budget) {
      user.budget = {
        ...user.budget.toObject(),
        ...budget,
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
      user,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete personalized onboarding
 * @route   POST /api/v1/profile/onboarding
 * @access  Private
 */
export const completeOnboarding = async (req, res, next) => {
  try {
    const {
      gender,
      styleArchetype,
      bodyType,
      skinUndertone,
      sizes,
      budget,
      physicalTraits,
      physicalAnalysis,
      preferences,
      onboardingStep = 6,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (gender) user.gender = gender;
    if (styleArchetype) user.styleArchetype = styleArchetype;

    const mergedTraits = {
      ...(physicalTraits || physicalAnalysis || {}),
      ...(bodyType ? { bodyType, bodySilhouette: bodyType } : {}),
      ...(skinUndertone ? { skinUndertone } : {}),
    };

    if (Object.keys(mergedTraits).length > 0) {
      const normalized = normalizePhysicalTraits(mergedTraits);
      user.physicalTraits = {
        ...user.physicalTraits.toObject(),
        ...normalized,
      };
    }

    if (sizes) {
      user.sizes = {
        ...user.sizes.toObject(),
        ...sizes,
      };
      user.preferences.sizes = {
        ...user.preferences.sizes.toObject(),
        ...sizes,
      };
    }

    if (budget) {
      user.budget = {
        ...user.budget.toObject(),
        ...budget,
      };
    }

    if (preferences) {
      user.preferences = {
        ...user.preferences.toObject(),
        ...preferences,
      };
    }

    user.isOnboarded = true;
    user.onboardingCompleted = true;
    user.onboardingStep = onboardingStep;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      user,
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

    // Map calibrated face shape recommendations
    const necklinesByShape = {
      Oval: ['Camp Collar', 'Crew Neck', 'Structured Lapel'],
      Square: ['Crew Neck', 'Curved Scoop', 'Soft Lapel'],
      Round: ['V-Neck', 'Point Collar', 'Structured Lapel'],
      Heart: ['Boat Neck', 'Crew Neck', 'Wide Lapel'],
      Oblong: ['Crew Neck', 'Turtleneck', 'Horizontal Spread Collar'],
      Diamond: ['Camp Collar', 'V-Neck', 'Notched Lapel'],
    };

    const detectedFaceType = detectedTraits.faceShape || user.physicalTraits?.faceShape || 'Oval';
    const bestNecklines = necklinesByShape[detectedFaceType] || ['Camp Collar', 'Crew Neck', 'Structured Lapel'];

    // Map recommended and avoid palettes with human-readable names
    const defaultRecommended = [
      { name: 'Sage Green', hex: '#879F84' },
      { name: 'Warm Taupe', hex: '#B39D82' },
      { name: 'Terracotta', hex: '#C86D51' },
    ];
    const defaultAvoid = [
      { name: 'Neon Yellow', hex: '#FFFF33' },
      { name: 'Icy Blue', hex: '#D8ECF8' },
    ];

    let recommendedColors = defaultRecommended;
    if (Array.isArray(detectedTraits.recommendedPalette) && detectedTraits.recommendedPalette.length > 0) {
      recommendedColors = detectedTraits.recommendedPalette.slice(0, 4).map((c, idx) => {
        if (typeof c === 'object' && c.name && c.hex) return c;
        const hex = typeof c === 'string' ? c : '#879F84';
        const names = ['Sage Green', 'Warm Taupe', 'Terracotta', 'Forest Olive', 'Warm Ochre'];
        return { name: names[idx] || `Shade ${idx + 1}`, hex };
      });
    }

    let avoidColors = defaultAvoid;
    if (Array.isArray(detectedTraits.avoidPalette) && detectedTraits.avoidPalette.length > 0) {
      avoidColors = detectedTraits.avoidPalette.slice(0, 2).map((c, idx) => {
        if (typeof c === 'object' && c.name && c.hex) return c;
        const hex = typeof c === 'string' ? c : '#FFFF33';
        const names = ['Neon Yellow', 'Icy Blue', 'Electric Magenta'];
        return { name: names[idx] || `Contrast Clash ${idx + 1}`, hex };
      });
    }

    const harmonyScore = parseInt(detectedTraits.confidence || '96', 10) || 96;

    const formattedScannerResult = {
      faceShape: {
        type: `${detectedFaceType} / Angular`,
        harmony: 'Balanced',
        bestNecklines,
        description: 'Defined jawline with balanced symmetry.',
      },
      undertone: {
        type: detectedTraits.skinUndertone || user.physicalTraits?.skinUndertone || 'Warm Olive',
        season: detectedTraits.colorSeason || user.physicalTraits?.colorSeason || 'Soft Autumn',
        harmony: 'Harmonious',
        recommendedColors,
        avoidColors,
      },
      silhouette: {
        type: detectedTraits.bodySilhouette || user.physicalTraits?.bodySilhouette || 'Athletic Proportion',
        proportions: `${user.physicalTraits?.height || "5'11\""} · Balanced Torso`,
        advice: detectedTraits.stylingNotes || 'Tapered trousers and relaxed structured overshirts complement shoulder width.',
      },
      overallHarmonyScore: harmonyScore,
      user,
      physicalTraits: user.physicalTraits,
      detectedAnalysis: detectedTraits,
      avatar: user.avatar,
    };

    res.status(200).json({
      success: true,
      message: 'Physical traits calibrated successfully with AI Vision',
      data: formattedScannerResult,
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

    const season = drapingData.season || user.physicalTraits?.colorSeason || 'Deep Autumn';
    const undertone = drapingData.undertone || user.physicalTraits?.skinUndertone || 'Warm Golden';
    const drapingInsight = drapingData.drapingInsight || 'Rich, warm pigments absorb light harmoniously against your undertone.';
    const swatches = drapingData.swatches || [];

    res.status(200).json({
      success: true,
      message: 'Color draping matrix generated',
      season,
      undertone,
      drapingInsight,
      swatches,
      data: {
        season,
        undertone,
        drapingInsight,
        swatches,
        avatar: user.avatar,
        faceShape: user.physicalTraits?.faceShape || 'Oval',
      },
    });
  } catch (error) {
    next(error);
  }
};

