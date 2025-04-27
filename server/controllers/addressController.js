const axios = require('axios');

exports.validateAddress = async (req, res) => {
  try {
    const { address } = req.body;
    
    // Google Maps Platform Address Validation API endpoint
    const url = `https://addressvalidation.googleapis.com/v1/addressValidation:validateAddress?key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.post(url, {
      address: {
        regionCode: "US",
        addressLines: [address]
      }
    });

    const validationResult = response.data;
    
    // Check if the address is valid
    const isValid = validationResult.result.verdict.hasValidationErrors === false;
    
    // Get the formatted address if valid
    const formattedAddress = isValid ? 
      validationResult.result.address.formattedAddress : 
      null;

    // Get address components if valid
    const addressComponents = isValid ? 
      validationResult.result.address.addressComponents : 
      null;

    res.status(200).json({
      success: true,
      data: {
        isValid,
        formattedAddress,
        addressComponents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating address',
      error: error.message
    });
  }
}; 