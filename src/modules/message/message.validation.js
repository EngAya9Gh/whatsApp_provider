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

const sendButtonsSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/),
  text: Joi.string().required().min(1).max(4000),
  buttons: Joi.array().items(
    Joi.object({
      id: Joi.string().optional(),
      text: Joi.string().required(),
      type: Joi.string().valid('reply', 'url').default('reply'),
      url: Joi.string().uri().optional()
    })
  ).min(1).max(3).required()
});

const sendListSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/),
  title: Joi.string().required().max(60),
  body: Joi.string().required().max(1024),
  buttonText: Joi.string().required().max(20),
  sections: Joi.array().items(
    Joi.object({
      title: Joi.string().required().max(24),
      rows: Joi.array().items(
        Joi.object({
          rowId: Joi.string().required(),
          title: Joi.string().required().max(24),
          description: Joi.string().optional().max(72).allow('')
        })
      ).min(1).required()
    })
  ).min(1).required()
});

const sendLocationSchema = Joi.object({
  phone: Joi.string().required().min(10).max(15).pattern(/^[0-9]+$/),
  latitude: Joi.number().required().min(-90).max(90),
  longitude: Joi.number().required().min(-180).max(180),
  name: Joi.string().optional().max(100).allow(''),
  address: Joi.string().optional().max(200).allow('')
});

module.exports = {
  validate,
  sendMessageSchema,
  sendMediaSchema,
  uploadMediaSchema,
  sendButtonsSchema,
  sendListSchema,
  sendLocationSchema
};

