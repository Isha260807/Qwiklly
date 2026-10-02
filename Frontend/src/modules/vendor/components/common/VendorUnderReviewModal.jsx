import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiClock, FiAlertTriangle, FiRefreshCw, FiLogOut, FiPhone, FiMessageSquare, FiX, FiMail } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { getProfile, logout } from '../../services/authService';
import { configService } from '../../../../services/configService';

const P = '#720C3E', PD = '#4D082A', PL = '#9A2459', BG = '#FFF7FA', BD = '#E8D9DF';

const VendorUnderReviewModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const getInitialStatus = () => {
    try {
      const d = JSON.parse(localStorage.getItem('vendorData') || '{}');
      return (d.approvalStatus || 'pending').toLowerCase();
    } catch {
      return 'pending';
    }
  };

  const [status, setStatus] = useState(getInitialStatus);
  const [vendorData, setVendorData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportInfo, setSupportInfo] = useState({ phone: '+91 9876543210', email: 'support@qwiklly.com', whatsapp: '+919876543210' });
  const prevStatus = useRef(getInitialStatus());
  const pollRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && !showSupport) return;
    configService.getSettings().then(r => {
      const s = r?.settings || r?.data?.support;
      if (s) {
        setSupportInfo({
          phone: s.supportPhone || s.companyPhone || '+91 9876543210',
          email: s.supportEmail || s.companyEmail || 'support@qwiklly.com',
          whatsapp: s.supportWhatsapp || s.supportPhone || s.companyPhone || '+919876543210'
        });
      }
    }).catch(() => {});
  }, [isOpen, showSupport]);

  const check = useCallback(async (manual = false) => {
    const tok = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
    if (!tok) { setIsOpen(false); return; }
    if (manual) setIsChecking(true);
    try {
      const res = await getProfile();
      if (res?.success && res?.vendor) {
        const s = (res.vendor.approvalStatus || 'pending').toLowerCase();
        setVendorData(res.vendor);
        setStatus(s);
        if (s === 'approved') {
          if (prevStatus.current === 'pending' && isOpen) {
            toast.success('Your vendor profile is approved! Dashboard unlocked.', { duration: 6000, id: 'v-approved' });
          }
          setIsOpen(false);
          prevStatus.current = 'approved';
          window.dispatchEvent(new Event('vendorDataUpdated'));
        } else if (s === 'rejected') {
          setIsOpen(true);
          prevStatus.current = 'rejected';
        } else {
          setIsOpen(true);
          prevStatus.current = 'pending';
          if (manual) toast('Still under review. We will notify you once approved!', { icon: '\u23f3', duration: 4000 });
        }
      }
    } catch (err) {
      const d = JSON.parse(localStorage.getItem('vendorData') || '{}');
      const ls = (d.approvalStatus || 'pending').toLowerCase();
      setVendorData(d); setStatus(ls);
      if (ls === 'pending' || ls === 'rejected') setIsOpen(true);
      else setIsOpen(false);
    } finally { if (manual) setIsChecking(false); }
  }, []);

  useEffect(() => {
    const d = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const ls = (d.approvalStatus || 'pending').toLowerCase();
    const tok = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
    if (tok) {
      setVendorData(d);
      setStatus(ls);
      if (d && d.approvalStatus && (ls === 'pending' || ls === 'rejected')) {
        setIsOpen(true);
        check(false);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [check, location.pathname]);

  useEffect(() => {
    if (isOpen && status === 'pending') { pollRef.current = setInterval(() => check(false), 7000); }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, status, check]);

  useEffect(() => {
    const onStatus = (e) => {
      const s = e.detail?.approvalStatus?.toLowerCase();
      if (s) { setStatus(s); if (s === 'approved') { setIsOpen(false); toast.success('Account approved! Dashboard unlocked.', { duration: 6000 }); } else if (s === 'rejected') setIsOpen(true); }
      check(false);
    };
    const onData = () => { const d = JSON.parse(localStorage.getItem('vendorData') || '{}'); if (d?.approvalStatus) { const s = d.approvalStatus.toLowerCase(); setStatus(s); if (s === 'approved') setIsOpen(false); } };
    window.addEventListener('vendorStatusUpdated', onStatus);
    window.addEventListener('vendorDataUpdated', onData);
    return () => { window.removeEventListener('vendorStatusUpdated', onStatus); window.removeEventListener('vendorDataUpdated', onData); };
  }, [check]);

  const doLogout = async () => {
    try { await logout(); } catch (e) {}
    finally { localStorage.removeItem('vendorAccessToken'); localStorage.removeItem('vendorRefreshToken'); localStorage.removeItem('vendorData'); setIsOpen(false); navigate('/vendor/login', { replace: true }); toast.success('Signed out successfully'); }
  };

  if (!isOpen) return null;
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-[9999] flex items-center justify-center p-4'
        style={{ background: 'rgba(77,8,42,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      >
        {/* Card */}
        <div
          className='w-full max-w-sm flex flex-col overflow-hidden rounded-2xl'
          style={{ background: '#fff', boxShadow: '0 24px 64px -8px rgba(114,12,62,0.4)', animation: 'scaleIn 0.2s ease-out' }}
        >
          {/* Header */}
          <div
            className='relative overflow-hidden px-5 py-5 text-center flex-shrink-0'
            style={{ background: 'linear-gradient(135deg, #4D082A 0%, #720C3E 60%, #9A2459 100%)' }}
          >
            {/* Glow */}
            <div className='absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-15' style={{ background: 'radial-gradient(circle, #E8A0B8 0%, transparent 70%)' }} />

            {/* Icon + text inline */}
            <div className='flex items-center justify-center gap-3'>
              <div
                className='w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0'
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                {isRejected
                  ? <FiAlertTriangle className='w-5 h-5 text-white' />
                  : <FiClock className='w-5 h-5 text-white animate-spin' style={{ animationDuration: '6s' }} />}
              </div>
              <div className='text-left'>
                <div className='flex items-center gap-1.5 mb-0.5'>
                  <span className={'w-1.5 h-1.5 rounded-full inline-block ' + (isPending ? 'animate-ping' : '')} style={{ background: isRejected ? '#fca5a5' : '#fde68a' }} />
                  <span className='text-[10px] font-bold uppercase tracking-widest text-white/70'>
                    {isRejected ? 'Application Rejected' : 'Profile Under Review'}
                  </span>
                </div>
                <h2 className='text-base font-black text-white leading-tight'>
                  {isRejected ? 'Action Required' : 'Account Under Review'}
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className='px-4 py-4 space-y-3'>
            {/* Vendor info row */}
            {vendorData?.name && (
              <div className='flex items-center justify-between px-3.5 py-2.5 rounded-xl' style={{ background: BG, border: '1px solid ' + BD }}>
                <div>
                  <p className='text-[10px] font-bold uppercase tracking-wider' style={{ color: PL }}>Vendor</p>
                  <p className='text-sm font-bold leading-tight' style={{ color: PD }}>{vendorData.name}</p>
                </div>
                <div className='text-right'>
                  <p className='text-[10px] font-bold uppercase tracking-wider' style={{ color: PL }}>Phone</p>
                  <p className='text-xs font-semibold text-gray-700'>{vendorData.phone ? '+91 ' + vendorData.phone : 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Status message */}
            {isRejected ? (
              <div className='rounded-xl p-3 flex items-start gap-2.5' style={{ background: '#FFF1F1', border: '1px solid #FECACA' }}>
                <FiAlertTriangle className='w-4 h-4 flex-shrink-0 mt-0.5 text-red-500' />
                <p className='text-xs text-red-700 leading-relaxed'>
                  {vendorData?.rejectedReason || 'Document verification could not be completed. Contact support for assistance.'}
                </p>
              </div>
            ) : (
              <p className='text-xs text-center leading-relaxed' style={{ color: PL }}>
                Your profile is being reviewed by our admin team. You will get access once approved.
              </p>
            )}

            {/* Action buttons */}
            <div className='space-y-2 pt-1'>
              {isPending && (
                <button
                  onClick={() => check(true)}
                  disabled={isChecking}
                  className='w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60'
                  style={{ background: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)', boxShadow: '0 6px 16px -3px rgba(114,12,62,0.35)' }}
                >
                  <FiRefreshCw className={'w-4 h-4 ' + (isChecking ? 'animate-spin' : '')} />
                  {isChecking ? 'Checking...' : 'Check Approval Status'}
                </button>
              )}
              <div className='grid grid-cols-2 gap-2'>
                <button
                  onClick={() => setShowSupport(true)}
                  className='py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95'
                  style={{ background: '#fff', border: '1px solid ' + BD, color: P }}
                >
                  <FiPhone className='w-3.5 h-3.5' /> Support
                </button>
                <button
                  onClick={doLogout}
                  className='py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95'
                  style={{ background: '#FFF1F1', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  <FiLogOut className='w-3.5 h-3.5' /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support sheet */}
      {showSupport && (
        <div
          className='fixed inset-0 z-[10000] flex items-end sm:items-center justify-center'
          style={{ background: 'rgba(77,8,42,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSupport(false)}
        >
          <div
            className='w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden'
            style={{ background: '#fff', boxShadow: '0 -12px 32px -6px rgba(114,12,62,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className='pt-3 pb-1 flex justify-center sm:hidden'><div className='w-8 h-1 rounded-full' style={{ background: BD }} /></div>
            <div className='px-4 py-3.5 flex items-center justify-between' style={{ borderBottom: '1px solid ' + BD }}>
              <p className='font-bold text-sm' style={{ color: PD }}>Contact Support</p>
              <button onClick={() => setShowSupport(false)} className='w-7 h-7 rounded-full flex items-center justify-center' style={{ background: BG, color: P }}>
                <FiX className='w-3.5 h-3.5' />
              </button>
            </div>
            <div className='p-4 space-y-2'>
              <button
                onClick={() => { const ph = supportInfo.whatsapp.replace(/\D/g, ''); window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hello! I am vendor ' + (vendorData?.name || '') + ' (' + (vendorData?.phone || '') + '). Please help with my account approval.'), '_blank'); }}
                className='w-full py-3 px-4 rounded-xl text-sm flex items-center gap-3 active:scale-95 transition-all'
                style={{ background: '#DCFCE7' }}
              >
                <div className='w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0'><FiMessageSquare className='w-3.5 h-3.5 text-white' /></div>
                <div className='text-left'><p className='font-bold text-xs text-emerald-800'>WhatsApp</p><p className='text-[11px] text-emerald-700'>{supportInfo.whatsapp}</p></div>
              </button>
              <button
                onClick={() => { window.location.href = 'tel:' + supportInfo.phone; }}
                className='w-full py-3 px-4 rounded-xl text-sm flex items-center gap-3 active:scale-95 transition-all'
                style={{ background: BG, border: '1px solid ' + BD }}
              >
                <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(114,12,62,0.1)' }}><FiPhone className='w-3.5 h-3.5' style={{ color: P }} /></div>
                <div className='text-left'><p className='font-bold text-xs' style={{ color: PD }}>Call Helpline</p><p className='text-[11px] text-gray-500'>{supportInfo.phone}</p></div>
              </button>
              <button
                onClick={() => { window.location.href = 'mailto:' + supportInfo.email; }}
                className='w-full py-3 px-4 rounded-xl text-sm flex items-center gap-3 active:scale-95 transition-all'
                style={{ background: BG, border: '1px solid ' + BD }}
              >
                <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(114,12,62,0.1)' }}><FiMail className='w-3.5 h-3.5' style={{ color: P }} /></div>
                <div className='text-left'><p className='font-bold text-xs' style={{ color: PD }}>Email Support</p><p className='text-[11px] text-gray-500'>{supportInfo.email}</p></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VendorUnderReviewModal;
