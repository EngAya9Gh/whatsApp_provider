<template>
  <div class="invoice-page">
    <div v-if="loading" class="loading">Loading Invoice...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="invoice" class="invoice-container">
      <div class="actions no-print">
        <button @click="shareAsImage" class="btn-secondary" style="margin-right: 1rem;" :disabled="isGeneratingImage">
          {{ isGeneratingImage ? 'Generating...' : 'Share as Image' }}
        </button>
        <button @click="printInvoice" class="btn-primary">Print / Save as PDF</button>
      </div>

      <div class="invoice-card" id="invoice-content" ref="invoiceContent">
        <div class="invoice-header">
          <div class="logo-container">
            <img src="/logo.svg" alt="Wakeel Logo" class="invoice-logo" />
          </div>
          <div class="invoice-title">
            <h2>Payment Receipt</h2>
            <div class="invoice-id">#{{ invoice.id.split('-')[0].toUpperCase() }}</div>
          </div>
        </div>
        
        <div class="invoice-body">
          <div class="invoice-row">
            <span class="label">Date:</span>
            <span class="value">{{ new Date(invoice.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="invoice-row">
            <span class="label">Billed To:</span>
            <span class="value">
              <strong>{{ invoice.tenant.name }}</strong><br>
              <span class="email">{{ invoice.tenant.email }}</span>
            </span>
          </div>
          <div class="invoice-row">
            <span class="label">Status:</span>
            <span class="value status-badge" :class="invoice.status.toLowerCase()">
              {{ invoice.status }}
            </span>
          </div>
          <div class="invoice-row">
            <span class="label">Description:</span>
            <span class="value">{{ invoice.description }}</span>
          </div>
          <div class="invoice-row" v-if="invoice.billingCycle">
            <span class="label">Billing Cycle:</span>
            <span class="value" style="text-transform: capitalize;">{{ invoice.billingCycle }}</span>
          </div>
          
          <div class="invoice-separator"></div>
          
          <div class="invoice-row total-row">
            <span class="label">Total Amount:</span>
            <span class="value amount-value">{{ invoice.amount }}</span>
          </div>
        </div>
        
        <div class="invoice-footer">
          <div class="qr-code-wrapper">
            <qrcode-vue value="https://provider.wakeel.cc/" :size="120" level="M" />
            <span class="qr-text">Scan to visit<br>provider.wakeel.cc</span>
          </div>
          <p>Thank you for choosing Wakeel Platform!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import html2canvas from 'html2canvas'
import QrcodeVue from 'qrcode.vue'

const route = useRoute()
const invoice = ref(null)
const loading = ref(true)
const error = ref('')
const isGeneratingImage = ref(false)
const invoiceContent = ref(null)

const fetchInvoice = async () => {
  try {
    const res = await axios.get(`/api/invoices/${route.params.id}`)
    invoice.value = res.data.data
  } catch (err) {
    error.value = err.response?.data?.error || 'Invoice not found.'
  } finally {
    loading.value = false
  }
}

const printInvoice = () => {
  window.print()
}

const shareAsImage = async () => {
  if (!invoiceContent.value) return
  isGeneratingImage.value = true
  
  try {
    const canvas = await html2canvas(invoiceContent.value, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    })
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Failed to generate image.')
        isGeneratingImage.value = false
        return
      }
      
      const file = new File([blob], `invoice_${invoice.value.id.split('-')[0]}.png`, { type: 'image/png' })
      
      // Try Web Share API first
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          // Send only the file so apps like WhatsApp don't drop the image in favor of text
          await navigator.share({
            files: [file]
          })
        } catch (err) {
          if (err.name !== 'AbortError') {
             console.error('Share failed:', err)
             downloadFallback(blob)
          }
        }
      } else {
        // Fallback to download
        downloadFallback(blob)
      }
      isGeneratingImage.value = false
    }, 'image/png')
    
  } catch (err) {
    console.error('Error generating receipt:', err)
    alert('An error occurred while generating the receipt.')
    isGeneratingImage.value = false
  }
}

const downloadFallback = (blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice_${invoice.value.id.split('-')[0]}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(fetchInvoice)
</script>

<style scoped>
.invoice-page {
  min-height: 100vh;
  width: 100%;
  background: #F8FAFC;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 1rem;
  font-family: 'Inter', system-ui, sans-serif;
  direction: ltr;
  text-align: left;
}

.loading, .error {
  text-align: center;
  font-size: 1.2rem;
  color: #64748B;
  font-weight: 500;
}
.error { color: #EF4444; }

.invoice-container {
  width: 100%;
  max-width: 700px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #FF6600;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(255,102,0,0.2);
}
.btn-primary:hover { background: #cc5200; }

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #F1F5F9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover { background: #E2E8F0; color: #0F172A; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

.invoice-card {
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #F1F5F9;
  padding-bottom: 2rem;
  margin-bottom: 2.5rem;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.invoice-logo {
  height: 64px;
  width: auto;
}

.invoice-title { display: flex; flex-direction: column; justify-content: center; text-align: right; }
.invoice-title h2 { margin: 0; color: #0F172A; font-size: 1.8rem; font-weight: 800; line-height: 1; }
.invoice-id { color: #94A3B8; font-weight: 600; margin-top: 0.5rem; font-size: 0.9rem; }

.invoice-body { margin-bottom: 3rem; }

.invoice-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  font-size: 1.1rem;
}

.invoice-row .label { color: #64748B; font-weight: 600; }
.invoice-row .value { font-weight: 600; color: #0F172A; text-align: right; }
.invoice-row .email { font-size: 0.9rem; color: #64748B; font-weight: 500; }

.status-badge {
  padding: 0.35rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 800;
}
.status-badge.pending { background: #FFF7ED; color: #C2410C; }
.status-badge.paid { background: #F0FDF4; color: #15803D; }

.invoice-separator { height: 2px; background: #F1F5F9; margin: 2rem 0; }

.total-row { font-size: 1.5rem; margin-top: 1.5rem; align-items: center; }
.total-row .label { color: #0F172A; font-weight: 800; }
.total-row .amount-value { color: #FF6600; font-weight: 900; font-size: 1.8rem; }

.qr-code-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.qr-text {
  font-size: 0.8rem;
  color: #64748B;
  font-weight: 600;
  line-height: 1.2;
}

.invoice-footer {
  text-align: center;
  color: #94A3B8;
  font-size: 1rem;
  font-weight: 500;
  border-top: 2px solid #F1F5F9;
  padding-top: 2rem;
}

@media print {
  .no-print { display: none !important; }
  .invoice-page { background: white; padding: 0; min-height: auto; }
  .invoice-card { box-shadow: none; border-radius: 0; padding: 0; }
}
</style>
