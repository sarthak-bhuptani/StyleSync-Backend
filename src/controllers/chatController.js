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
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a chat message',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wardrobeItems = await WardrobeItem.find({ userId: req.user.id });

    const aiResponse = await chatWithAIStylist({
      user,
      wardrobeItems,
      message: message.trim(),
      history,
    });

    res.status(200).json({
      success: true,
      data: {
        reply: aiResponse.reply,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
