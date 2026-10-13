import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { configService } from '../../../services/configService';

const LoginLegalPage = ({ type }) => {
  const isTerms = type === 'terms';
  const navigate = useNavigate();
  const [content, setContent] = useState('');

  useEffect(() => {
    let isMounted = true;
    configService.getSettings(true).then((response) => {
      const settingKey = isTerms ? 'termsOfService' : 'privacyPolicy';
      if (isMounted) setContent(response?.settings?.[settingKey] || '');
    });

    return () => {
      isMounted = false;
    };
  }, [isTerms]);

  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';

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
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{title}</h1>
        {content.trim() ? (
          <div className="whitespace-pre-wrap text-sm sm:text-base leading-7 text-gray-700">
            {content}
          </div>
        ) : (
          <p className="text-sm sm:text-base leading-7 text-gray-700">
            The admin has not added this content yet.
          </p>
        )}
      </main>
    </div>
  );
};

export default LoginLegalPage;
