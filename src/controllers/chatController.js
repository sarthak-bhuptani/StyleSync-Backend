import { User } from '../models/User.js';
import { WardrobeItem } from '../models/WardrobeItem.js';
import { chatWithAIStylist } from '../services/geminiVisionService.js';

/**
 * @desc    Chat with AI Fashion Stylist
 * @route   POST /api/v1/chat/message
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { message, prompt, history = [], image } = req.body;
    const query = message || prompt;

    if (!query && !image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a chat message or image',
      });
    }

    const user = (req.user && req.user.id) ? await User.findById(req.user.id) : null;
    const wardrobeItems = (req.user && req.user.id) ? await WardrobeItem.find({ userId: req.user.id }) : [];

    const aiResponse = await chatWithAIStylist({
      user: user || { name: 'Friend' },
      wardrobeItems,
      message: query ? query.trim() : 'Please evaluate this item or outfit look.',
      history,
      image,
    });

    res.status(200).json({
      success: true,
      reply: aiResponse.reply,
      data: {
        reply: aiResponse.reply,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
