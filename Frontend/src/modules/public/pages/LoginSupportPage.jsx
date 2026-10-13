import React, { useEffect, useState } from 'react';
import { FiArrowLeft, FiMail, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { configService } from '../../../services/configService';

const LoginSupportPage = () => {
  const navigate = useNavigate();
  const [support, setSupport] = useState({
    supportEmail: '',
    supportPhone: '',
    supportWhatsapp: ''
  });

  useEffect(() => {
    let isMounted = true;
    configService.getSettings(true).then((response) => {
      if (isMounted) {
        setSupport({
          supportEmail: response?.settings?.supportEmail || '',
          supportPhone: response?.settings?.supportPhone || '',
          supportWhatsapp: response?.settings?.supportWhatsapp || ''
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const whatsappNumber = support.supportWhatsapp.replace(/\D/g, '');
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber}`
    : '#';

  const contactOptions = [
    {
      label: 'Support Email',
      value: support.supportEmail,
      icon: FiMail,
      href: support.supportEmail ? `mailto:${support.supportEmail}` : '#'
    },
    {
      label: 'Support Phone',
      value: support.supportPhone,
      icon: FiPhone,
      href: support.supportPhone ? `tel:${support.supportPhone}` : '#'
    },
    {
      label: 'WhatsApp Support',
      value: support.supportWhatsapp,
      icon: FiMessageCircle,
      href: whatsappHref
    }
  ].filter((item) => item.value.trim());

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-3xl mx-auto px-5 py-8 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold">Help &amp; Support</h1>
        <p className="text-sm text-gray-500 mt-2 mb-8">Contact Qwiklly support</p>

        <div className="space-y-4">
          {contactOptions.map(({ label, value, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target={label === 'WhatsApp Support' ? '_blank' : undefined}
              rel={label === 'WhatsApp Support' ? 'noreferrer' : undefined}
              className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 hover:border-[#720C3E] transition-colors"
            >
              <span className="w-11 h-11 rounded-lg bg-[#FFF1F6] text-[#720C3E] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-xs uppercase tracking-wide text-gray-500">{label}</span>
                <span className="block text-base text-gray-800 mt-1">{value}</span>
              </span>
            </a>
          ))}
        </div>

        {!contactOptions.length && (
          <p className="text-sm leading-7 text-gray-700">
            Support contact details have not been added by the admin yet.
          </p>
        )}
      </main>
    </div>
  );
};

export default LoginSupportPage;
