const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const entitlementService = require('../../services/entitlement.service');

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

    // Look up the requested plan in the DB
    const planCode = data.plan || 'FREE';
    const planSetting = await prisma.planSetting.findUnique({
      where: { planCode }
    });
    
    // Default fallback if not found in DB
    const limit = planSetting ? planSetting.limit : 10;

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        companyName: data.companyName,
        plan: planCode,
        monthlyLimit: limit
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

    const allowedFeatures = await entitlementService.getTenantFeatures(tenant.id);

    return {
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        companyName: tenant.companyName,
        customFeatures: tenant.customFeatures,
        sessionStatus: tenant.sessionStatus,
        plan: tenant.plan,
        metaEnabled: tenant.metaEnabled,
        allowedFeatures
      }
    };
  }

  async updateProfile(tenantId, data) {
    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) throw { status: 404, message: 'Tenant not found' };

    const currentFeatures = (typeof existing.customFeatures === 'object' && existing.customFeatures !== null)
      ? existing.customFeatures
      : {};

    const updatedFeatures = {
      ...currentFeatures,
      companyDetails: {
        vatNumber: data.vatNumber !== undefined ? data.vatNumber : (currentFeatures.companyDetails?.vatNumber || ''),
        crn: data.crn !== undefined ? data.crn : (currentFeatures.companyDetails?.crn || ''),
        street: data.street !== undefined ? data.street : (currentFeatures.companyDetails?.street || ''),
        district: data.district !== undefined ? data.district : (currentFeatures.companyDetails?.district || ''),
        city: data.city !== undefined ? data.city : (currentFeatures.companyDetails?.city || ''),
        country: data.country !== undefined ? data.country : (currentFeatures.companyDetails?.country || ''),
        buildingNo: data.buildingNo !== undefined ? data.buildingNo : (currentFeatures.companyDetails?.buildingNo || ''),
        postalCode: data.postalCode !== undefined ? data.postalCode : (currentFeatures.companyDetails?.postalCode || '')
      }
    };

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        companyName: data.companyName !== undefined ? data.companyName : existing.companyName,
        customFeatures: updatedFeatures
      }
    });

    return updatedTenant;
  }
}

module.exports = new AuthService();
