const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const sendMessageSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/).messages({
    'string.pattern.base': 'Phone number must contain only digits'
  }),
  message: Joi.string().required().min(1).max(4000)
});

const sendMediaSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/).messages({
    'string.pattern.base': 'Phone number must contain only digits'
  }),
  type: Joi.string().valid('image', 'pdf').required(),
  url: Joi.string().uri().required(),
  caption: Joi.string().max(1024).optional().allow('')
});

const uploadMediaSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/).messages({
    'string.pattern.base': 'Phone number must contain only digits'
  }),
  type: Joi.string().valid('image', 'pdf').required(),
  caption: Joi.string().max(1024).optional().allow('')
});

module.exports = {
  validate,
  sendMessageSchema,
  sendMediaSchema,
  uploadMediaSchema
};
