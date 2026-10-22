import React, { useState } from 'react';
import { FiDownload, FiX, FiCheckCircle, FiFileText, FiShield } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

const InvoiceModal = ({ isOpen, onClose, booking, companySettings }) => {

  const [isDownloading, setIsDownloading] = useState(false);

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

  const vendor = booking.vendorId && typeof booking.vendorId === 'object' ? booking.vendorId : {};
  const vendorName = vendor.businessName || vendor.name || booking.vendorName || 'Assigned Vendor';


  const vendorAddress = typeof vendor.address === 'string'
    ? vendor.address
    : [
        vendor.address?.fullAddress,
        vendor.address?.addressLine1,
        vendor.address?.addressLine2,
        vendor.address?.city,
        vendor.address?.state,
        vendor.address?.pincode
      ].filter(Boolean).join(', ');
  const professionalName = booking.workerId?.name || booking.assignedTo?.name || '';
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

  const handleDownloadPdf = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const right = pageWidth - margin;
      let y = 18;

      const ensureSpace = (requiredHeight = 10) => {
        if (y + requiredHeight > pageHeight - 15) {
          pdf.addPage();
          y = 18;
        }
      };
      const formatAmount = value => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const addWrappedText = (text, x, width, options = {}) => {
        const lines = pdf.splitTextToSize(String(text || ''), width);
        const lineHeight = options.lineHeight || 5;
        ensureSpace(lines.length * lineHeight + 2);
        pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
        pdf.setFontSize(options.size || 9);
        pdf.setTextColor(...(options.color || [71, 85, 105]));
        pdf.text(lines, x, y);
        y += lines.length * lineHeight + (options.gap ?? 2);
      };
      const addSectionTitle = title => {
        ensureSpace(13);
        pdf.setFillColor(252, 231, 243);
        pdf.roundedRect(margin, y - 5, contentWidth, 8, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(114, 12, 62);
        pdf.text(title.toUpperCase(), margin + 3, y);
        y += 11;
      };
      const addAmountRow = (label, value, color = [71, 85, 105]) => {
        ensureSpace(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...color);
        pdf.text(label, margin, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatAmount(value), right, y, { align: 'right' });
        y += 6;
      };

      pdf.setTextColor(114, 12, 62);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(21);
      pdf.text('Qwiklly', margin, y);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('TAX INVOICE', margin + 31, y - 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`${companyName}`, margin, y + 7);
      pdf.text(`${companyAddress}, ${companyCity}, ${companyState} - ${companyPincode}`, margin, y + 12);
      pdf.text(`GSTIN: ${companyGSTIN} | PAN: ${companyPAN}`, margin, y + 17);
      pdf.text(`Support: ${companyPhone} | ${companyEmail}`, margin, y + 22);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(`Invoice No: ${invoiceNumber}`, right, 18, { align: 'right' });
      pdf.text(`Invoice Date: ${invoiceDate}`, right, 23, { align: 'right' });
      pdf.text(`Booking ID: ${booking.bookingNumber || 'N/A'}`, right, 28, { align: 'right' });
      y = 48;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y - 4, right, y - 4);

      addSectionTitle('Billed To (Customer)');
      addWrappedText(customerName, margin, contentWidth, { bold: true, size: 11, color: [15, 23, 42], gap: 1 });
      if (customerPhone) addWrappedText(`Phone: +91 ${customerPhone.replace('+91', '').trim()}`, margin, contentWidth, { size: 8, gap: 1 });
      if (customerAddress) addWrappedText(customerAddress, margin, contentWidth, { size: 8, gap: 2 });

      addSectionTitle('Service Schedule');
      addWrappedText(`Date: ${bookingDate}`, margin, contentWidth, { bold: true, size: 10, color: [15, 23, 42], gap: 1 });
      addWrappedText(`Slot: ${bookingTime}`, margin, contentWidth, { size: 8, gap: 1 });
      addWrappedText(`Vendor: ${vendorName}`, margin, contentWidth, { size: 8, bold: true, color: [30, 41, 59], gap: 1 });
      if (vendorAddress) addWrappedText(`Address: ${vendorAddress}`, margin, contentWidth, { size: 8, gap: 1 });
      if (professionalName) addWrappedText(`Professional: ${professionalName}`, margin, contentWidth, { size: 8, gap: 2 });

      addSectionTitle('Service Breakdown');
      bookedItems.forEach((item) => {
        const card = item.card || item;
        const itemName = card.title || item.serviceName || booking.serviceName || 'Home Service';
        const itemType = card.pricingType === 'DURATION' || card.durationMinutes
          ? `Duration: ${card.durationMinutes ? `${card.durationMinutes} mins` : `${card.hours || 0} hrs`}`
          : 'Fixed Price';
        const itemPrice = card.price ?? item.price ?? basePrice;
        ensureSpace(14);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, y - 5, contentWidth, 10, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(pdf.splitTextToSize(itemName, contentWidth - 45), margin + 3, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(itemType, margin + 3, y + 5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(formatAmount(itemPrice), right - 3, y, { align: 'right' });
        y += 15;
      });

      addSectionTitle('Payment Summary');
      addAmountRow('Taxable Base Amount', basePrice);
      if (tax > 0) addAmountRow(`GST (${booking.gstPercentage || 18}%)`, tax);
      if (visitingCharges > 0) addAmountRow('Visiting / Convenience Fee', visitingCharges);
      if (instantCharges > 0) addAmountRow('Instant Booking Fee', instantCharges);
      if (discount > 0) addAmountRow('Discount / Coupon', -discount, [5, 150, 105]);
      ensureSpace(14);
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margin, y - 2, right, y - 2);
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Grand Total Paid', margin, y);
      pdf.setTextColor(114, 12, 62);
      pdf.text(formatAmount(grandTotal), right, y, { align: 'right' });
      y += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(5, 150, 105);
      pdf.text('Payment Completed & Verified', margin, y);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Mode: ${booking.paymentMethod?.toUpperCase() || 'ONLINE PAID'}`, margin + 42, y);
      pdf.text('Computer-generated official tax invoice', right, y, { align: 'right' });

      pdf.save(`${invoiceNumber}.pdf`);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error) {
      console.error('Invoice PDF download failed:', error);
      toast.error('Unable to download invoice PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
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
                Vendor: <span className="font-semibold text-slate-800">{vendorName}</span>
              </p>
              {vendorAddress && <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{vendorAddress}</p>}
              {professionalName && (
                <p className="text-slate-600 text-[10px] sm:text-[11px]">
                  Professional: <span className="font-semibold text-slate-800">{professionalName}</span>
                </p>
              )}
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
            onClick={handleDownloadPdf}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#720C3E] to-[#9A2459] hover:from-[#5b0931] hover:to-[#720C3E] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#720C3E]/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <FiDownload className="text-sm shrink-0" />
            <span>{isDownloading ? 'Preparing PDF...' : 'Download Invoice PDF'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
