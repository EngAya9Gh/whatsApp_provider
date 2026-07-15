const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

class ApiKeyService {
  async generateKey(tenantId, label) {
    // Generate a secure random API key
    const rawKey = crypto.randomBytes(32).toString('hex');
    
    // Hash it for storage
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    // Create prefix for display
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        keyHash,
        keyPrefix,
        label: label || 'Default API Key'
      }
    });

    // Return the raw key ONLY ONCE. It cannot be retrieved again.
    return {
      id: apiKey.id,
      key: `sk_${rawKey}`, // sk_ prefix to make it identifiable
      prefix: apiKey.keyPrefix,
      label: apiKey.label,
      createdAt: apiKey.createdAt
    };
  }

  async listKeys(tenantId) {
    return prisma.apiKey.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        keyPrefix: true,
        label: true,
        lastUsedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteKey(tenantId, keyId) {
    // We do a soft delete or just delete it
    await prisma.apiKey.delete({
      where: {
        id: keyId,
        tenantId // Ensure the key belongs to this tenant
      }
    });
    return true;
  }
}

module.exports = new ApiKeyService();
