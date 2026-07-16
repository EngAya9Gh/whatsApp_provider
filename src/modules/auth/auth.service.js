const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const prisma = new PrismaClient();

class AuthService {
  async register(data) {
    const existingTenant = await prisma.tenant.findUnique({
      where: { email: data.email }
    });

    if (existingTenant) {
      throw { status: 400, message: 'Email already registered' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const plansConfig = require('../../config/plans');
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        companyName: data.companyName,
        plan: 'FREE',
        monthlyLimit: plansConfig.FREE.limit
      }
    });

    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      companyName: tenant.companyName
    };
  }

  async login(email, password) {
    const tenant = await prisma.tenant.findUnique({
      where: { email }
    });

    if (!tenant) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(password, tenant.passwordHash);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    const payload = {
      tenantId: tenant.id,
      email: tenant.email
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    return {
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        sessionStatus: tenant.sessionStatus
      }
    };
  }
}

module.exports = new AuthService();
