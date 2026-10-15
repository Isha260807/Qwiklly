import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { configService } from '../../../services/configService';
import { getLanguage, translateText } from '../../../i18n/translator';

const LoginLegalPage = ({ type }) => {
  const isTerms = type === 'terms';
  const navigate = useNavigate();
  const location = useLocation();
  const isVendor = new URLSearchParams(location.search).get('source') === 'vendor';
  const isHindiVendor = isVendor && getLanguage() === 'hi';
  const [content, setContent] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadLegalContent = async () => {
      const response = await configService.getSettings(true);
      const settingKey = isTerms ? 'termsOfService' : 'privacyPolicy';
      const legalContent = response?.settings?.[settingKey] || '';
      const translatedContent = isVendor && getLanguage() === 'hi'
        ? await translateText(legalContent, 'hi')
        : legalContent;

      if (isMounted) setContent(translatedContent);
    };

    loadLegalContent().catch(() => {
      if (isMounted) setContent('');
    });

    return () => {
      isMounted = false;
    };
  }, [isTerms, isVendor]);

  const title = isTerms
    ? (isHindiVendor ? 'सेवा की शर्तें' : 'Terms & Conditions')
    : (isHindiVendor ? 'गोपनीयता नीति' : 'Privacy Policy');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-3xl mx-auto px-5 py-8 sm:px-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <FiArrowLeft className="w-4 h-4" />
          {isHindiVendor ? 'वापस' : 'Back'}
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{title}</h1>
        {content.trim() ? (
          <div className="whitespace-pre-wrap text-sm sm:text-base leading-7 text-gray-700">
            {content}
          </div>
        ) : (
          <p className="text-sm sm:text-base leading-7 text-gray-700">
            {isHindiVendor ? 'व्यवस्थापक ने अभी तक यह सामग्री नहीं जोड़ी है।' : 'The administrator has not added this content yet.'}
          </p>
        )}
      </main>
    </div>
  );
};

export default LoginLegalPage;
