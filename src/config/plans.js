const PLANS = {
  FREE: {
    limit: 1,
    price: 0
  },
  STARTER: {
    limit: 1000,
    price: 20
  },
  ADVANCED: {
    limit: 5000,
    price: 30
  },
  PRO: {
    limit: 10000,
    price: 49
  },
  ENTERPRISE: {
    limit: 0, // 0 means unlimited
    price: null
  }
};

module.exports = PLANS;
