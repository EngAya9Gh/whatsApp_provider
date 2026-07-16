const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const createTemplateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  content: Joi.string().required().min(1).max(4000)
});

const sendTemplateSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/).messages({
    'string.pattern.base': 'Phone number must contain only digits'
  }),
  templateId: Joi.string().uuid().required(),
  variables: Joi.object().pattern(Joi.string(), Joi.string().allow('')).optional()
});

module.exports = {
  validate,
  createTemplateSchema,
  sendTemplateSchema
};
