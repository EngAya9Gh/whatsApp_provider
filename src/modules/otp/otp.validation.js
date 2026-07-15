const Joi = require('joi');

const sendOtpSchema = Joi.object({
  phone: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Phone number must be in E.164 international format'
  })
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/),
  code: Joi.string().length(6).required()
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  validate
};
