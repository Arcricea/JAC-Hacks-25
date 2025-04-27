const Donation = require('../models/Donation');

exports.createDonation = async (req, res) => {
  try {
    const { itemName, category, quantity, expirationDate, pickupInfo, imageUrl, userId } = req.body;

    // Validate required fields
    if (!itemName || !category || !quantity || !expirationDate || !pickupInfo || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: {
          itemName: !itemName,
          category: !category,
          quantity: !quantity,
          expirationDate: !expirationDate,
          pickupInfo: !pickupInfo,
          userId: !userId
        }
      });
    }

    const donation = new Donation({
      userId,
      itemName,
      category,
      quantity,
      expirationDate,
      pickupInfo,
      imageUrl
    });

    await donation.save();

    res.status(201).json({
      success: true,
      data: donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 