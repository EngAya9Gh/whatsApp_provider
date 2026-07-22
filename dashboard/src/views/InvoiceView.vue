<template>
  <div class="invoice-page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>جاري تحميل الفاتورة... Loading Invoice...</p>
    </div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="invoice" class="invoice-wrapper">
      <!-- Top Action Bar (hidden in print) -->
      <div class="actions-bar no-print">
        <button @click="shareAsImage" class="btn btn-secondary" :disabled="isGeneratingImage">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {{ isGeneratingImage ? 'جاري التوليد...' : 'مشاركة كصورة (Share Image)' }}
        </button>
        <button @click="printInvoice" class="btn btn-primary">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          طباعة / حفظ PDF (Print / PDF)
        </button>
      </div>

      <!-- Main Official Tax Invoice Document -->
      <div class="tax-invoice-document" id="invoice-content" ref="invoiceContent">
        <!-- Document Top Header -->
        <header class="doc-header">
          <div class="header-brand-left">
            <img src="/logo.svg" alt="Wakeel Logo" class="brand-logo" />
            <div class="brand-subtext">منصة وكيـل للحلول الرقمية</div>
          </div>
          <div class="header-center-title">
            <h1>Tax Invoice فاتورة ضريبية</h1>
            <div class="status-stamp" :class="invoice.status.toLowerCase()">
              {{ invoice.status === 'PAID' ? 'مدفوعة / PAID' : 'معلقة / PENDING' }}
            </div>
          </div>
          <div class="header-company-right">
            <h2 class="ar-name">شركة وكيـل لتقنية المعلومات </h2>
            <h3 class="en-name">WAKEEL INFORMATION TECHNOLOGY CO. LTD</h3>
          </div>
        </header>

        <div class="orange-divider"></div>

        <!-- Meta Information Section & QR Code -->
        <section class="invoice-meta-section">
          <table class="meta-table">
            <tbody>
              <tr>
                <td class="lbl-en">Invoice Number</td>
                <td class="val">INV-{{ invoice.invoiceNumber }}</td>
                <td class="lbl-ar">رقم الفاتورة</td>
              </tr>
              <tr>
                <td class="lbl-en">Issue Date</td>
                <td class="val">{{ formatDate(invoice.createdAt) }}</td>
                <td class="lbl-ar">تاريخ الإصدار</td>
              </tr>
              <tr>
                <td class="lbl-en">Due Date</td>
                <td class="val">{{ formatDate(invoice.dueDate || invoice.createdAt) }}</td>
                <td class="lbl-ar">تاريخ الاستحقاق</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Buyer & Seller Parties Grid -->
        <section class="parties-section">
          <!-- Buyer Table -->
          <div class="party-card">
            <div class="party-header">
              <span class="en">Buyer</span>
              <span class="ar">العميل</span>
            </div>
            <table class="party-table">
              <tbody>
                <tr>
                  <td class="lbl-en">Name</td>
                  <td class="val bold">{{ finalBuyerDetails.name }}</td>
                  <td class="lbl-ar">الاسم</td>
                </tr>
                <tr>
                  <td class="lbl-en">Street</td>
                  <td class="val">{{ finalBuyerDetails.street }}</td>
                  <td class="lbl-ar">الشارع</td>
                </tr>
                <tr>
                  <td class="lbl-en">District</td>
                  <td class="val">{{ finalBuyerDetails.district }}</td>
                  <td class="lbl-ar">الحي</td>
                </tr>
                <tr>
                  <td class="lbl-en">City</td>
                  <td class="val">{{ finalBuyerDetails.city }}</td>
                  <td class="lbl-ar">المدينة</td>
                </tr>
                <tr>
                  <td class="lbl-en">Country</td>
                  <td class="val">{{ finalBuyerDetails.country }}</td>
                  <td class="lbl-ar">البلد</td>
                </tr>
                <tr>
                  <td class="lbl-en">Building No</td>
                  <td class="val">{{ finalBuyerDetails.buildingNo }}</td>
                  <td class="lbl-ar">رقم المبنى</td>
                </tr>
                <tr>
                  <td class="lbl-en">Postal Code</td>
                  <td class="val">{{ finalBuyerDetails.postalCode }}</td>
                  <td class="lbl-ar">الرمز البريدي</td>
                </tr>
                <tr>
                  <td class="lbl-en">VAT Number</td>
                  <td class="val">{{ finalBuyerDetails.vatNumber }}</td>
                  <td class="lbl-ar">الرقم الضريبي</td>
                </tr>
                <tr>
                  <td class="lbl-en">CRN</td>
                  <td class="val">{{ finalBuyerDetails.crn }}</td>
                  <td class="lbl-ar">رقم السجل التجاري</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Seller Table -->
          <div class="party-card">
            <div class="party-header">
              <span class="en">Seller</span>
              <span class="ar">البائع</span>
            </div>
            <table class="party-table">
              <tbody>
                <tr>
                  <td class="lbl-en">Name</td>
                  <td class="val bold">{{ finalSellerDetails.sellerName }}</td>
                  <td class="lbl-ar">الاسم</td>
                </tr>
                <tr>
                  <td class="lbl-en">Street</td>
                  <td class="val">{{ finalSellerDetails.sellerStreet }}</td>
                  <td class="lbl-ar">الشارع</td>
                </tr>
                <tr>
                  <td class="lbl-en">District</td>
                  <td class="val">{{ finalSellerDetails.sellerDistrict }}</td>
                  <td class="lbl-ar">الحي</td>
                </tr>
                <tr>
                  <td class="lbl-en">City</td>
                  <td class="val">{{ finalSellerDetails.sellerCity }}</td>
                  <td class="lbl-ar">المدينة</td>
                </tr>
                <tr>
                  <td class="lbl-en">Country</td>
                  <td class="val">{{ finalSellerDetails.sellerCountry }}</td>
                  <td class="lbl-ar">البلد</td>
                </tr>
                <tr>
                  <td class="lbl-en">Building No</td>
                  <td class="val">{{ finalSellerDetails.sellerBuildingNo }}</td>
                  <td class="lbl-ar">رقم المبنى</td>
                </tr>
                <tr>
                  <td class="lbl-en">Postal Code</td>
                  <td class="val">{{ finalSellerDetails.sellerPostalCode }}</td>
                  <td class="lbl-ar">الرمز البريدي</td>
                </tr>
                <tr>
                  <td class="lbl-en">VAT Number</td>
                  <td class="val">{{ finalSellerDetails.sellerVatNumber }}</td>
                  <td class="lbl-ar">الرقم الضريبي</td>
                </tr>
                <tr>
                  <td class="lbl-en">CRN</td>
                  <td class="val">{{ finalSellerDetails.sellerCrn }}</td>
                  <td class="lbl-ar">رقم السجل التجاري</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Itemized Particulars Table -->
        <section class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-num">#Item<br>#البند</th>
                <th class="col-item">Item<br>البند</th>
                <th class="col-desc">Details<br>الوصف</th>
                <th class="col-rate">Rate<br>السعر</th>
                <th class="col-qty">Qty<br>الكمية</th>
                <th class="col-amt">Amount<br>المبلغ</th>
                <th class="col-taxpct">Tax%<br>الضريبة%</th>
                <th class="col-tax">Tax<br>الضريبة</th>
                <th class="col-total">Total<br>المجموع</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in invoiceItems" :key="idx">
                <td>{{ idx + 1 }}</td>
                <td>{{ item.name }}</td>
                <td>
                  <span class="sub-detail">{{ item.description }}</span>
                </td>
                <td>{{ parseFloat(item.rate).toFixed(4) }}</td>
                <td>{{ item.qty }}</td>
                <td>{{ parseFloat(item.total).toFixed(2) }}</td>
                <td>{{ invoice.taxRate || 15 }}%</td>
                <td>{{ (parseFloat(item.total) * (invoice.taxRate || 15) / 100).toFixed(2) }}</td>
                <td class="bold-cell">{{ (parseFloat(item.total) * (1 + (invoice.taxRate || 15) / 100)).toFixed(2) }}</td>
              </tr>
              <tr v-if="!invoiceItems.length">
                <td>1</td>
                <td>واتس اب / WhatsApp</td>
                <td>
                  <strong>باقة {{ invoice.billingCycle || 'Monthly' }} - {{ invoice.tenant?.plan || 'PRO' }}</strong><br>
                  <span class="sub-detail">{{ invoice.description }}</span>
                </td>
                <td>{{ formattedRate }}</td>
                <td>1</td>
                <td>{{ formattedTotalBeforeVat }}</td>
                <td>{{ invoice.taxRate || 15 }}%</td>
                <td>{{ formattedVatAmount }}</td>
                <td class="bold-cell">{{ formattedTotalWithVat }}</td>
              </tr>
            </tbody>
          </table>
        </section>



        <!-- Financial Summary & Bank Information Side-by-Side -->
        <section class="totals-bank-section">
          <!-- Totals Breakdown Table -->
          <div class="totals-card">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td class="lbl-en">Subtotal</td>
                  <td class="val">{{ formattedTotalBeforeVat }}</td>
                  <td class="lbl-ar">مجموع</td>
                </tr>
                <tr>
                  <td class="lbl-en">Total Discount</td>
                  <td class="val">0.00</td>
                  <td class="lbl-ar">إجمالي الخصم</td>
                </tr>
                <tr>
                  <td class="lbl-en">Total Before VAT</td>
                  <td class="val">{{ formattedTotalBeforeVat }}</td>
                  <td class="lbl-ar">الإجمالي قبل الضريبة</td>
                </tr>
                <tr>
                  <td class="lbl-en">VAT {{ invoice.taxRate || 15 }}%</td>
                  <td class="val">{{ formattedVatAmount }}</td>
                  <td class="lbl-ar">الضريبة {{ invoice.taxRate || 15 }}%</td>
                </tr>
                <tr class="highlight-row">
                  <td class="lbl-en">Total With VAT</td>
                  <td class="val">{{ formattedTotalWithVat }}</td>
                  <td class="lbl-ar">الإجمالي شامل الضريبة</td>
                </tr>
                <tr>
                  <td class="lbl-en">Paid To Date</td>
                  <td class="val">{{ formattedPaidToDate }}</td>
                  <td class="lbl-ar">دفعة تحت الحساب</td>
                </tr>
                <tr>
                  <td class="lbl-en">Payment Discount</td>
                  <td class="val">0.00</td>
                  <td class="lbl-ar">خصم دفع</td>
                </tr>
                <tr class="final-net-row">
                  <td class="lbl-en">Net Amount (SAR)</td>
                  <td class="val">{{ formattedNetAmount }}</td>
                  <td class="lbl-ar">المبلغ النهائي (SAR)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bank Account Details Table -->
          <div class="bank-card">
            <table class="bank-table">
              <tbody>
                <tr>
                  <td class="lbl-en">Bank Name:</td>
                  <td class="val">{{ finalSellerDetails.bankName }}</td>
                  <td class="lbl-ar">البنك</td>
                </tr>
                <tr>
                  <td class="lbl-en">Address</td>
                  <td class="val">{{ finalSellerDetails.bankAddress }}</td>
                  <td class="lbl-ar">العنوان</td>
                </tr>
                <tr>
                  <td class="lbl-en">Account Name</td>
                  <td class="val bold-text">{{ finalSellerDetails.bankAccountName }}</td>
                  <td class="lbl-ar">اسم الحساب</td>
                </tr>
                <tr>
                  <td class="lbl-en">Account Number</td>
                  <td class="val">{{ finalSellerDetails.bankAccountNumber }}</td>
                  <td class="lbl-ar">رقم الحساب</td>
                </tr>
                <tr>
                  <td class="lbl-en">IBAN Number</td>
                  <td class="val iban">{{ finalSellerDetails.bankIban }}</td>
                  <td class="lbl-ar">الآيبان</td>
                </tr>
                <tr>
                  <td class="lbl-en">Swift/BiC</td>
                  <td class="val">{{ finalSellerDetails.bankSwift }}</td>
                  <td class="lbl-ar">السويفت</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Terms, Dispute Rights & Support Contacts Footer -->
        <footer class="doc-footer">
          <div class="footer-columns">
            <div class="col-en">
              <p>- You have the right to review and dispute your invoice within 60 days from the date of issuance.</p>
              <p>- Complaints can be submitted through the following channels:</p>
              <p class="indent">1- Through the ticketing system available in your account at Wakeel Platform</p>
              <p class="indent">2- Through the email system, at: <strong>support@wakeel.cc</strong></p>
              <p class="indent">3- Through direct contact at: <strong>9200015404</strong></p>
              <p>- We will review your request and respond within a maximum of 72 hours</p>
            </div>
            <div class="col-ar">
              <p>- لديك الحق في مراجعة فاتورتك والاعتراض عليها خلال 60 يوماً من تاريخ صدورها</p>
              <p>- يتم تقديم الشكاوى عبر التواصل معنا عبر إحدى القنوات التالية</p>
              <p class="indent">1. نظام التذاكر المتوفر داخل حسابك على منصة وكيل</p>
              <p class="indent">2. البريد الإلكتروني: <strong>support@wakeel.cc</strong></p>
              <p class="indent">3. رقم التواصل: <strong>9200015404</strong></p>
              <p>- سنقوم بدراسة طلبك والرد عليك خلال 72 ساعة كحد أقصى.</p>
            </div>
          </div>

          <div class="iso-notice-section mt-4 mb-4" style="margin-top: 20px; margin-bottom: 20px;">
            <div class="notice-box" style="padding: 10px; background-color: #fffaf0; border: 1px solid #ffd8a8; border-radius: 8px; text-align: center; color: #854d0e;">
              <p class="ar font-bold text-sm">ملاحظه : في حال الإرسال خارج المملكة، يتم احتساب تكلفة الرسائل الدولية المعلنة.</p>
              <p class="en font-bold text-sm">Note : In case of international SMS, international rates will be applied.</p>
            </div>
          </div>

          <div class="qr-code-footer" style="display: flex; justify-content: center; align-items: center; flex-direction: column; margin-top: 20px; margin-bottom: 20px;">
            <qrcode-vue :value="qrCodeUrl" :size="125" level="M" render-as="svg" class="qr-code-img" style="border: 2px solid #e2e8f0; padding: 5px; border-radius: 8px; background: white;" />
            <span class="qr-caption" style="font-size: 11px; font-weight: bold; color: #64748b; margin-top: 5px;"> QR CODE</span>
          </div>

          <div class="footer-bottom-brand">
            <img src="/logo.svg" alt="Wakeel" class="footer-mini-logo" />
            <span>شركة وكيـل لتقنية المعلومات  - جميع الحقوق محفوظة © {{ new Date().getFullYear() }}</span>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
    error.value = err.response?.data?.error || 'الفاتورة غير موجودة / Invoice not found.'
  } finally {
    loading.value = false
  }
}

const formattedInvoiceNumber = computed(() => {
  return invoice.value?.invoiceNumber || invoice.value?.id || 'N/A'
})

const finalBuyerDetails = computed(() => {
  if (invoice.value?.buyerDetails) return invoice.value.buyerDetails;
  
  const t = invoice.value?.tenant || {}
  const details = t.customFeatures?.companyDetails || {}
  return {
    name: t.companyName || t.name || 'غير محدد / Unspecified',
    vatNumber: details.vatNumber || '310003200400003',
    crn: details.crn || '1010435662',
    street: details.street || 'طريق الملك فهد / King Fahd Road',
    district: details.district || 'حي العليا / Olaya District',
    city: details.city || 'الرياض / Riyadh',
    country: details.country || 'المملكة العربية السعودية',
    buildingNo: details.buildingNo || '5262',
    postalCode: details.postalCode || '12381'
  }
})

const finalSellerDetails = computed(() => {
  if (invoice.value?.sellerDetails) return invoice.value.sellerDetails;
  return {
    sellerName: 'شركة وكيـل لتقنية المعلومات المحدودة',
    sellerStreet: 'طريق الملك فهد - العليا',
    sellerDistrict: 'حي العليا / Olaya',
    sellerCity: 'الرياض / Riyadh',
    sellerCountry: 'المملكة العربية السعودية KSA',
    sellerBuildingNo: '7233',
    sellerPostalCode: '23448',
    sellerVatNumber: '300300775500003',
    sellerCrn: '4030394715',
    bankName: 'البنك الأهلي السعودي',
    bankAddress: 'الرياض - السعودية',
    bankAccountName: 'WAKEEL INFORMATION TECHNOLOGY CO.',
    bankAccountNumber: '15500001405110',
    bankIban: 'SA5410000015500001405110',
    bankSwift: 'NCBKSAJE'
  }
})

const invoiceItems = computed(() => {
  if (invoice.value?.items && Array.isArray(invoice.value.items)) {
    return invoice.value.items;
  }
  return [];
})

const qrCodeUrl = computed(() => {
  const invoiceId = route.params.id || invoice.value?.id || ''
  return `https://provider.wakeel.cc/invoice/${invoiceId}`
})

const totalWithVatNum = computed(() => {
  if (!invoice.value?.amount) return 0
  const clean = invoice.value.amount.toString().replace(/[^0-9.]/g, '')
  return parseFloat(clean) || 0
})

const totalBeforeVatNum = computed(() => {
  if (invoiceItems.value.length > 0) {
    return invoiceItems.value.reduce((sum, item) => sum + parseFloat(item.total || 0), 0)
  }
  const tr = parseFloat(invoice.value?.taxRate) || 15.0;
  return totalWithVatNum.value / (1 + (tr / 100))
})

const vatAmountNum = computed(() => {
  if (invoice.value?.taxAmount && invoiceItems.value.length > 0) {
    return parseFloat(invoice.value.taxAmount)
  }
  return totalWithVatNum.value - totalBeforeVatNum.value
})

const formattedRate = computed(() => totalBeforeVatNum.value.toFixed(4))
const formattedTotalBeforeVat = computed(() => totalBeforeVatNum.value.toFixed(2))
const formattedVatAmount = computed(() => vatAmountNum.value.toFixed(2))
const formattedTotalWithVat = computed(() => totalWithVatNum.value.toFixed(2))

const formattedPaidToDate = computed(() => {
  if (invoice.value?.status === 'PAID') {
    return totalWithVatNum.value.toFixed(2)
  }
  return '0.00'
})

const formattedNetAmount = computed(() => {
  if (invoice.value?.status === 'PAID') {
    return '0.00'
  }
  return totalWithVatNum.value.toFixed(2)
})

const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  try {
    return new Date(dateStr).toISOString().split('T')[0]
  } catch (e) {
    return dateStr
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
        alert('فشل في إنشاء صورة الفاتورة.')
        isGeneratingImage.value = false
        return
      }
      
      const file = new File([blob], `tax_invoice_${formattedInvoiceNumber.value}.png`, { type: 'image/png' })
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Share failed:', err)
            downloadFallback(blob)
          }
        }
      } else {
        downloadFallback(blob)
      }
      isGeneratingImage.value = false
    }, 'image/png')
    
  } catch (err) {
    console.error('Error generating receipt:', err)
    alert('حدث خطأ أثناء إنشاء الفاتورة.')
    isGeneratingImage.value = false
  }
}

const downloadFallback = (blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tax_invoice_${formattedInvoiceNumber.value}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(fetchInvoice)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

.invoice-page {
  min-height: 100vh;
  background: #F3F4F6;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1rem;
  font-family: 'Tajawal', 'Inter', system-ui, sans-serif;
  color: #1F2937;
  direction: ltr;
}

/* Loading & Error States */
.loading, .error {
  margin-top: 4rem;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: #4B5563;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 5px solid #E5E7EB;
  border-top-color: #FF6600;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error { color: #DC2626; }

.invoice-wrapper {
  width: 100%;
  max-width: 960px;
}

/* Action Buttons Bar */
.actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.btn .icon { width: 20px; height: 20px; }

.btn-primary {
  background: #FF6600;
  color: white;
  box-shadow: 0 4px 14px rgba(255, 102, 0, 0.3);
}
.btn-primary:hover { background: #E65C00; }

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}
.btn-secondary:hover { background: #F9FAFB; color: #111827; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Main Official Document Sheet */
.tax-invoice-document {
  background: white;
  padding: 3rem 3.5rem;
  border-radius: 4px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #E5E7EB;
  position: relative;
  box-sizing: border-box;
}

/* Header */
.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.header-brand-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brand-logo {
  height: 58px;
  width: auto;
}
.brand-subtext {
  font-size: 0.8rem;
  color: #6B7280;
  margin-top: 0.25rem;
  font-weight: 600;
}

.header-center-title {
  text-align: center;
}
.header-center-title h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.01em;
}
.status-stamp {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.3rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.status-stamp.paid { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
.status-stamp.pending { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }

.header-company-right {
  text-align: right;
  direction: rtl;
}
.header-company-right .ar-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1F2937;
  line-height: 1.3;
}
.header-company-right .en-name {
  margin: 0.2rem 0 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #6B7280;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.orange-divider {
  height: 3px;
  background: #FF6600;
  margin: 1rem 0 1.5rem 0;
  border-radius: 2px;
}

/* Invoice Meta Grid & QR Code Section */
.invoice-meta-section {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.meta-table {
  flex: 1;
  border-collapse: collapse;
  border: 1px solid #9CA3AF;
  font-size: 0.88rem;
}
.meta-table td {
  padding: 0.45rem 0.75rem;
  border: 1px solid #9CA3AF;
}
.meta-table .lbl-en {
  color: #374151;
  font-weight: 600;
  width: 25%;
  text-align: left;
}
.meta-table .lbl-ar {
  color: #374151;
  font-weight: 700;
  width: 25%;
  text-align: right;
  direction: rtl;
}
.meta-table .val {
  font-weight: 700;
  color: #111827;
  text-align: center;
  width: 50%;
}

.qr-code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid #9CA3AF;
  border-radius: 4px;
  background: #FAFAFA;
}
.qr-code-img {
  width: 125px;
  height: 125px;
}
.qr-caption {
  font-size: 0.75rem;
  color: #4B5563;
  font-weight: 700;
  margin-top: 0.35rem;
}

/* Buyer & Seller Dual Tables Section */
.parties-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.75rem;
}

.party-card {
  border: 1px solid #9CA3AF;
  border-radius: 2px;
  overflow: hidden;
}

.party-header {
  background: #F3F4F6;
  padding: 0.4rem 0.75rem;
  display: flex;
  justify-content: space-between;
  font-weight: 800;
  font-size: 0.9rem;
  color: #111827;
  border-bottom: 1px solid #9CA3AF;
}

.party-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}
.party-table td {
  padding: 0.38rem 0.6rem;
  border-bottom: 1px solid #E5E7EB;
}
.party-table tr:last-child td {
  border-bottom: none;
}
.party-table .lbl-en {
  color: #4B5563;
  font-weight: 600;
  width: 25%;
  text-align: left;
}
.party-table .lbl-ar {
  color: #4B5563;
  font-weight: 700;
  width: 25%;
  text-align: right;
  direction: rtl;
}
.party-table .val {
  color: #111827;
  text-align: center;
  width: 50%;
  font-weight: 600;
}
.party-table .val.bold {
  font-weight: 800;
  color: #000;
}

/* Particulars Item Table */
.items-section {
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #9CA3AF;
  font-size: 0.85rem;
  text-align: center;
}

.items-table th {
  background: #FFFFFF;
  border: 1px solid #9CA3AF;
  padding: 0.5rem 0.4rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.25;
}

.items-table td {
  border: 1px solid #9CA3AF;
  padding: 0.6rem 0.4rem;
  color: #1F2937;
  font-weight: 600;
}

.items-table .col-num { width: 8%; }
.items-table .col-item { width: 14%; }
.items-table .col-desc { width: 28%; text-align: left; padding-left: 0.75rem; }
.items-table .col-rate { width: 10%; }
.items-table .col-qty { width: 8%; }
.items-table .col-amt { width: 10%; }
.items-table .col-taxpct { width: 7%; }
.items-table .col-tax { width: 7%; }
.items-table .col-total { width: 8%; }

.sub-detail {
  font-size: 0.78rem;
  color: #6B7280;
}
.bold-cell {
  font-weight: 800 !important;
  color: #000 !important;
}

/* ISO Certificates & Notice Banner Section */
.iso-notice-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.iso-badges {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.iso-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #2563EB;
  border-radius: 50%;
  width: 52px;
  height: 52px;
  box-sizing: border-box;
  color: #1E40AF;
  background: #EFF6FF;
}
.iso-circle {
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1;
}
.iso-lbl {
  font-size: 0.55rem;
  font-weight: 800;
  margin-top: 2px;
}

.notice-box {
  flex: 1;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1F2937;
}
.notice-box p {
  margin: 0.15rem 0;
}
.notice-box .ar {
  direction: rtl;
}

/* Financial Totals & Bank Account Grid Section */
.totals-bank-section {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.totals-card, .bank-card {
  border: 1px solid #9CA3AF;
  border-radius: 2px;
  overflow: hidden;
}

.totals-table, .bank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.totals-table td, .bank-table td {
  padding: 0.42rem 0.65rem;
  border-bottom: 1px solid #E5E7EB;
}
.totals-table tr:last-child td, .bank-table tr:last-child td {
  border-bottom: none;
}

.totals-table .lbl-en, .bank-table .lbl-en {
  color: #4B5563;
  font-weight: 600;
  width: 32%;
  text-align: left;
}
.totals-table .lbl-ar, .bank-table .lbl-ar {
  color: #4B5563;
  font-weight: 700;
  width: 28%;
  text-align: right;
  direction: rtl;
}
.totals-table .val, .bank-table .val {
  color: #111827;
  text-align: center;
  width: 40%;
  font-weight: 700;
}

.highlight-row {
  background: #FFF7ED;
}
.highlight-row td {
  color: #C2410C !important;
  font-weight: 800 !important;
}

.final-net-row {
  background: #F3F4F6;
  font-weight: 900 !important;
  font-size: 0.92rem;
}
.final-net-row .val {
  color: #FF6600;
  font-size: 1.05rem;
  font-weight: 900;
}

.bank-table .bold-text {
  font-weight: 800;
  font-size: 0.8rem;
}
.bank-table .iban {
  font-family: monospace;
  font-size: 0.82rem;
  font-weight: 800;
}

/* Document Footer Section */
.doc-footer {
  border-top: 1px solid #E5E7EB;
  padding-top: 1.25rem;
  font-size: 0.78rem;
  color: #374151;
  line-height: 1.5;
}

.footer-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.footer-columns .col-en {
  text-align: left;
}
.footer-columns .col-ar {
  text-align: right;
  direction: rtl;
}

.footer-columns p {
  margin: 0.2rem 0;
}
.footer-columns .indent {
  padding-left: 1rem;
}
.footer-columns .col-ar .indent {
  padding-left: 0;
  padding-right: 1rem;
}

.footer-bottom-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-top: 1px dashed #D1D5DB;
  padding-top: 1rem;
  color: #6B7280;
  font-size: 0.78rem;
  font-weight: 600;
}
.footer-mini-logo {
  height: 22px;
  width: auto;
}

/* Print Stylesheet for flawless A4 output */
@media print {
  .no-print {
    display: none !important;
  }
  body, .invoice-page {
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: auto !important;
  }
  .invoice-wrapper {
    max-width: 100% !important;
    width: 100% !important;
  }
  .tax-invoice-document {
    box-shadow: none !important;
    border: none !important;
    padding: 0.5cm 0.7cm !important;
    border-radius: 0 !important;
  }
  .orange-divider {
    background: #FF6600 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .items-table th, .party-header, .highlight-row, .final-net-row {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
