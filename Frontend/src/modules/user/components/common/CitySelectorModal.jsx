import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiLocationMarker, HiCheck } from 'react-icons/hi';
import { themeColors } from '../../../../theme';
import { useCity } from '../../../../context/CityContext';

const CitySelectorModal = ({ isOpen, onClose, onCitySelected }) => {
  const { cities, currentCity, selectCity } = useCity();
  const [searchQuery, setSearchQuery] = React.useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleCitySelect = (city) => {
    if (onCitySelected) {
      onCitySelected(city);
    } else {
      selectCity(city);
    }
    onClose();
  };

  const filteredCities = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.state && c.state.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
          >
            <div
              ref={modalRef}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E8D9DF]"
              style={{ maxHeight: '85vh' }}
            >
              {/* Header */}
              <div className="p-5 border-b border-[#E8D9DF] flex justify-between items-center bg-[#FFF7FA]">
                <div>
                  <h3 className="text-xl font-black text-[#24151D]">Select City</h3>
                  <p className="text-xs font-medium text-[#6F5A64] mt-0.5">Where would you like to find services?</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-white border border-[#E8D9DF] flex items-center justify-center transition-colors text-[#24151D] cursor-pointer"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <input
                  type="text"
                  placeholder="Search for your city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8D9DF] text-sm font-semibold text-[#24151D] placeholder:text-[#6F5A64]/50 focus:outline-none focus:border-[#720C3E]"
                />
              </div>

              {/* City List */}
              <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(85vh - 160px)' }}>
                <div className="grid gap-2">
                  {filteredCities.map((city) => {
                    const isSelected = currentCity && (currentCity._id === city._id || currentCity.id === city.id);

                    return (
                      <button
                        key={city._id || city.id}
                        onClick={() => handleCitySelect(city)}
                        className={`
                        w-full text-left p-3.5 rounded-2xl flex items-center justify-between group transition-all duration-200 cursor-pointer
                        ${isSelected
                            ? 'bg-[#FFF7FA] border-2 border-[#720C3E] shadow-xs'
                            : 'hover:bg-[#FFF7FA]/60 border border-transparent hover:border-[#E8D9DF]'
                          }
                      `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-[#720C3E] text-white shadow-xs' : 'bg-[#FFF7FA] text-[#720C3E] group-hover:bg-white'}
                        `}>
                            <HiLocationMarker className="w-5 h-5" />
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${isSelected ? 'text-[#720C3E]' : 'text-[#24151D]'}`}>
                              {city.name}
                            </div>
                            {city.state && (
                              <div className="text-xs font-medium text-[#6F5A64]">
                                {city.state}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#720C3E] flex items-center justify-center text-white shadow-xs">
                            <HiCheck className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {filteredCities.length === 0 && (
                  <div className="text-center py-8 text-[#6F5A64]">
                    <p className="text-sm font-medium">No cities found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CitySelectorModal;
