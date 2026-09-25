import React, { useRef } from 'react';
import { FiDownload, FiPrinter, FiX, FiCheckCircle, FiFileText, FiShield } from 'react-icons/fi';

const InvoiceModal = ({ isOpen, onClose, booking, companySettings }) => {
  const invoiceRef = useRef(null);

  if (!isOpen || !booking) return null;

  const invoiceNumber = `${companySettings?.invoicePrefix || 'INV'}-${booking.bookingNumber || (booking._id ? String(booking._id).slice(-8).toUpperCase() : '0000')}`;
  const invoiceDate = booking.completedAt
    ? new Date(booking.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const bookingDate = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : invoiceDate;

  const bookingTime = booking.scheduledTime || booking.timeSlot?.start || 'Standard Slot';

  const customerName = booking.userId?.name || booking.address?.fullName || 'Valued Customer';
  const customerPhone = booking.userId?.phone || booking.address?.phone || '';
  const customerAddress = [
    booking.address?.addressLine1,
    booking.address?.addressLine2,
    booking.address?.landmark,
    booking.address?.city,
    booking.address?.state,
    booking.address?.pincode
  ].filter(Boolean).join(', ');

  const companyName = companySettings?.companyName || 'Qwiklly Services';
  const companyAddress = companySettings?.companyAddress || 'Corporate House, RNT Marg';
  const companyCity = companySettings?.companyCity || 'Indore';
  const companyState = companySettings?.companyState || 'Madhya Pradesh';
  const companyPincode = companySettings?.companyPincode || '452001';
  const companyGSTIN = companySettings?.companyGSTIN || '27ABCDE1234F1Z5';
  const companyPAN = companySettings?.companyPAN || 'ABCDE1234F';
  const companyPhone = companySettings?.supportPhone || companySettings?.companyPhone || '+91 8817921166';
  const companyEmail = companySettings?.supportEmail || companySettings?.companyEmail || 'qwiklly@gmail.com';

  const bookedItems = booking.bookedItems && booking.bookedItems.length > 0
    ? booking.bookedItems
    : [{
        serviceName: booking.serviceName || booking.serviceCategory || 'Home Cleaning Service',
        card: {
          title: booking.serviceName || 'Home Service',
          durationMinutes: booking.hourlyTracking?.bookedMinutes || null,
          hours: booking.hourlyTracking?.bookedHours || null,
          pricingType: booking.hourlyTracking?.isHourly ? 'DURATION' : 'FIXED'
        },
        quantity: 1
      }];

  const basePrice = Number(booking.basePrice || booking.serviceAmount || (booking.finalAmount ? booking.finalAmount * 0.85 : 0));
  const tax = Number(booking.tax || 0);
  const visitingCharges = Number(booking.visitingCharges || 0);
  const instantCharges = Number(booking.instantBookingCharges || 0);
  const discount = Number(booking.discount || booking.couponDiscount || 0);
  const grandTotal = Number(booking.finalAmount || booking.userPayableAmount || (basePrice + tax + visitingCharges + instantCharges - discount));

  // Isolated single-page print engine
  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoiceNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            body {
              color: #1e293b;
              font-size: 12px;
              line-height: 1.4;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-wrapper {
              max-width: 100%;
              margin: 0 auto;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 14px;
              border-bottom: 1.5px solid #e2e8f0;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 900;
              color: #720C3E;
              letter-spacing: -0.5px;
            }
            .tax-badge {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              background: #fce7f3;
              color: #720C3E;
              padding: 2px 7px;
              border-radius: 4px;
              margin-left: 6px;
            }
            .company-info {
              margin-top: 4px;
              font-size: 11px;
              color: #64748b;
              line-height: 1.4;
            }
            .meta-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: right;
            }
            .paid-status {
              color: #059669;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .meta-text {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .meta-text b {
              color: #0f172a;
            }
            .grid-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1.5px solid #e2e8f0;
              gap: 20px;
            }
            .section-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #94a3b8;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
            }
            .customer-name {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
            }
            .customer-details {
              font-size: 11px;
              color: #475569;
              margin-top: 2px;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-size: 11px;
              font-weight: 700;
              text-align: left;
              padding: 8px 10px;
              border-top: 1px solid #e2e8f0;
              border-bottom: 1px solid #e2e8f0;
            }
            td {
              padding: 9px 10px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 12px;
            }
            .type-pill {
              display: inline-block;
              background: #fff1f2;
              color: #9f1239;
              border: 1px solid #fecdd3;
              padding: 2px 7px;
              border-radius: 4px;
              font-weight: 700;
              font-size: 10px;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 6px;
            }
            .totals-table {
              width: 280px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 12px;
              color: #475569;
            }
            .grand-total {
              display: flex;
              justify-content: space-between;
              padding-top: 8px;
              margin-top: 6px;
              border-top: 2px solid #cbd5e1;
              font-size: 14px;
              font-weight: 900;
              color: #0f172a;
            }
            .grand-total .total-amount {
              color: #720C3E;
              font-size: 16px;
            }
            .footer-row {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1.5px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #94a3b8;
            }
            .verified-badge {
              display: flex;
              align-items: center;
              gap: 6px;
              color: #059669;
              font-weight: 700;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="header-row">
              <div>
                <div>
                  <span class="brand-name">Qwiklly</span>
                  <span class="tax-badge">Tax Invoice</span>
                </div>
                <div style="font-weight: bold; color: #0f172a; font-size: 12px; margin-top: 2px;">${companyName}</div>
                <div class="company-info">
                  <p>${companyAddress}, ${companyCity}, ${companyState} - ${companyPincode}</p>
                  <p>GSTIN: <b>${companyGSTIN}</b> | PAN: <b>${companyPAN}</b></p>
                  <p>Support: ${companyPhone} | ${companyEmail}</p>
                </div>
              </div>

              <div class="meta-box">
                <div class="paid-status">✔ PAID & COMPLETED</div>
                <p class="meta-text">Invoice No: <b>${invoiceNumber}</b></p>
                <p class="meta-text">Invoice Date: <b>${invoiceDate}</b></p>
                <p class="meta-text">Booking ID: <b>${booking.bookingNumber || 'N/A'}</b></p>
              </div>
            </div>

            <div class="grid-row">
              <div>
                <p class="section-label">Billed To (Customer)</p>
                <p class="customer-name">${customerName}</p>
                <div class="customer-details">
                  ${customerPhone ? `<p>Phone: +91 ${customerPhone.replace('+91', '').trim()}</p>` : ''}
                  ${customerAddress ? `<p>${customerAddress}</p>` : ''}
                </div>
              </div>

              <div style="text-align: right;">
                <p class="section-label">Service Schedule</p>
                <p class="customer-name">Date: ${bookingDate}</p>
                <p class="customer-details">Slot: ${bookingTime}</p>
                <p class="customer-details">Professional: <b>${booking.workerId?.name || booking.assignedTo?.name || 'Verified Professional'}</b></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Service Description</th>
                  <th style="text-align: center; width: 140px;">Type / Duration</th>
                  <th style="text-align: right; width: 100px;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${bookedItems.map((item, idx) => {
                  const card = item.card || item;
                  const isDur = card.pricingType === 'DURATION' || card.durationMinutes;
                  const durationText = card.durationMinutes 
                    ? `${card.durationMinutes} mins (${card.durationMinutes >= 60 ? `${card.durationMinutes / 60} hrs` : '0.5 hr'})` 
                    : (card.hours ? `${card.hours} hrs` : '1 Flat Service');
                  const itemPrice = card.price ?? item.price ?? basePrice;
                  return `
                    <tr>
                      <td style="color: #94a3b8;">${idx + 1}</td>
                      <td>
                        <div style="font-weight: bold; color: #0f172a;">${card.title || item.serviceName || booking.serviceName || 'Home Service'}</div>
                        ${card.subtitle ? `<div style="font-size: 10px; color: #64748b;">${card.subtitle}</div>` : ''}
                      </td>
                      <td style="text-align: center;">
                        <span class="type-pill">${isDur ? `Duration: ${durationText}` : 'Fixed Price'}</span>
                      </td>
                      <td style="text-align: right; font-weight: bold; color: #0f172a;">
                        ₹${Number(itemPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="totals-container">
              <div class="totals-table">
                <div class="totals-row">
                  <span>Taxable Base Amount:</span>
                  <span style="font-weight: 600; color: #1e293b;">₹${basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                ${tax > 0 ? `
                  <div class="totals-row">
                    <span>GST (${booking.gstPercentage || 18}%):</span>
                    <span style="font-weight: 600; color: #1e293b;">₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                ${visitingCharges > 0 ? `
                  <div class="totals-row">
                    <span>Visiting / Convenience Fee:</span>
                    <span style="font-weight: 600; color: #1e293b;">₹${visitingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                ${instantCharges > 0 ? `
                  <div class="totals-row">
                    <span>Instant Booking Fee:</span>
                    <span style="font-weight: 600; color: #1e293b;">₹${instantCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                ${discount > 0 ? `
                  <div class="totals-row" style="color: #059669; font-weight: 600;">
                    <span>Discount / Coupon:</span>
                    <span>-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                <div class="grand-total">
                  <span>Grand Total:</span>
                  <span class="total-amount">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div class="footer-row">
              <div class="verified-badge">
                <span>🛡 Payment Completed & Verified</span>
                <span style="color: #64748b; font-size: 10px;">• Mode: ${booking.paymentMethod?.toUpperCase() || 'ONLINE PAID'}</span>
              </div>
              <div>This is a computer-generated official tax invoice. Thank you for choosing Qwiklly!</div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-hidden transition-all">
      <div className="bg-white w-full sm:max-w-lg md:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-[#720C3E] via-[#85134b] to-[#9A2459] text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <FiFileText className="text-base text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xs sm:text-sm tracking-wide truncate">Tax Invoice & Receipt</h3>
                <span className="hidden xs:inline-block bg-white/20 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Official
                </span>
              </div>
              <p className="text-[10px] text-pink-100/80 truncate font-mono">{invoiceNumber}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Invoice Scrollable Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain bg-slate-50/50 text-slate-800 text-xs sm:text-sm space-y-3.5">
          
          {/* Company Brand & Status Header Card */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg sm:text-xl font-black text-[#720C3E] tracking-tight">Qwiklly</span>
                  <span className="text-[9px] font-extrabold uppercase bg-pink-50 text-[#720C3E] border border-pink-200 px-2 py-0.5 rounded-md">
                    Tax Invoice
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{companyName}</p>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold shrink-0 shadow-2xs">
                <FiCheckCircle className="text-emerald-600 text-xs" />
                <span>PAID</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-0.5 pt-2 border-t border-slate-100">
              <p className="leading-snug">{companyAddress}, {companyCity}, {companyState} - {companyPincode}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 font-mono text-[10px]">
                <span>GSTIN: <b className="font-semibold text-slate-700">{companyGSTIN}</b></span>
                <span>PAN: <b className="font-semibold text-slate-700">{companyPAN}</b></span>
              </div>
              <p className="text-[10px] text-slate-400 pt-0.5">Support: {companyPhone} | {companyEmail}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Invoice No</span>
              <span className="font-mono font-bold text-slate-900 text-[11px] truncate block mt-0.5">{invoiceNumber}</span>
            </div>
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Invoice Date</span>
              <span className="font-bold text-slate-900 text-[11px] block mt-0.5">{invoiceDate}</span>
            </div>
            <div className="col-span-2 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Booking Reference</span>
                <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{booking.bookingNumber || (booking._id ? String(booking._id).slice(-8).toUpperCase() : 'N/A')}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {booking.paymentMethod?.toUpperCase() || 'ONLINE'}
              </span>
            </div>
          </div>

          {/* Customer & Schedule Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Customer Card */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Billed To (Customer)</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{customerName}</p>
              {customerPhone && (
                <p className="text-slate-600 text-[11px]">Phone: +91 {customerPhone.replace('+91', '').trim()}</p>
              )}
              {customerAddress && (
                <p className="text-slate-500 text-[10px] sm:text-[11px] leading-relaxed line-clamp-2 pt-0.5">{customerAddress}</p>
              )}
            </div>

            {/* Schedule Card */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Service Schedule</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">Date: {bookingDate}</p>
              <p className="text-slate-600 text-[11px]">Slot: {bookingTime}</p>
              <p className="text-slate-600 text-[10px] sm:text-[11px] pt-0.5">
                Pro: <span className="font-semibold text-slate-800">{booking.workerId?.name || booking.assignedTo?.name || 'Verified Professional'}</span>
              </p>
            </div>
          </div>

          {/* Service Breakdown */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Service Breakdown</p>
            
            <div className="space-y-2">
              {bookedItems.map((item, idx) => {
                const card = item.card || item;
                const isDur = card.pricingType === 'DURATION' || card.durationMinutes;
                const durationText = card.durationMinutes 
                  ? `${card.durationMinutes} mins` 
                  : (card.hours ? `${card.hours} hrs` : 'Fixed');
                const itemPrice = card.price ?? item.price ?? basePrice;

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-lg flex items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {card.title || item.serviceName || booking.serviceName || 'Home Service'}
                        </p>
                        <span className="px-1.5 py-0.5 bg-pink-50 text-[#720C3E] border border-pink-200 rounded font-bold text-[9px] shrink-0">
                          {isDur ? `⏱ ${durationText}` : 'Fixed Price'}
                        </span>
                      </div>
                      {card.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate">{card.subtitle}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-xs sm:text-sm">
                        ₹{Number(itemPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Totals Breakdown */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
              <span>Taxable Base Amount:</span>
              <span className="font-semibold text-slate-800">₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            {tax > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
                <span>GST ({booking.gstPercentage || 18}%):</span>
                <span className="font-semibold text-slate-800">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {visitingCharges > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
                <span>Visiting / Convenience Fee:</span>
                <span className="font-semibold text-slate-800">₹{visitingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {instantCharges > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px] sm:text-xs">
                <span>Instant Booking Fee:</span>
                <span className="font-semibold text-slate-800">₹{instantCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold text-[11px] sm:text-xs">
                <span>Discount / Coupon:</span>
                <span>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="pt-2 border-t-2 border-dashed border-slate-200 flex justify-between items-center font-black">
              <span className="text-slate-900 text-xs sm:text-sm">Grand Total Paid:</span>
              <span className="text-[#720C3E] text-sm sm:text-base font-black">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Trust & Security Tag */}
          <div className="flex items-center justify-between gap-2 px-1 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-600">
              <FiShield className="text-emerald-600 text-xs shrink-0" />
              <span>Payment Verified • 100% Secure</span>
            </div>
            <span className="hidden xs:inline text-slate-400">Computer generated invoice</span>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-white px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-200 flex items-center gap-2.5 shrink-0 shadow-lg">
          <button
            onClick={onClose}
            className="w-24 sm:w-28 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center"
          >
            Close
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#5b0931] hover:to-[#720C3E] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#720C3E]/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <FiDownload className="text-sm shrink-0" />
            <span>Download Invoice PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
