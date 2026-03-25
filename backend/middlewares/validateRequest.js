// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Basic validation - extend with more complex validation as needed
    if (schema.required) {
      for (const field of schema.required) {
        if (!req.body[field]) {
          return res.status(400).json({ error: `${field} is required` });
        }
      }
    }
    next();
  };
};

module.exports = validateRequest;
