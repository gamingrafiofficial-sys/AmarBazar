import React, { useState, useEffect } from 'react';
import { SLIDER_BANNERS } from '../../data/seedData';
import { useLanguage } from '../../hooks/useLanguage';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const HeroSlider: React.FC = () => {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDER_BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDER_BANNERS[currentIndex];

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + SLIDER_BANNERS.length) % SLIDER_BANNERS.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % SLIDER_BANNERS.length);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      <div className="relative h-36 sm:h-52 md:h-64 w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900">
        {/* Background Image */}
        <img
          src={slide.imageUrl}
          alt={slide.titleEn}
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-all duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-4 sm:px-10 max-w-lg text-white z-10">
          <div className="inline-flex items-center space-x-1 bg-emerald-500 text-slate-950 font-bold px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs w-max mb-1.5 sm:mb-2 shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'bn' ? slide.badgeBn : slide.badgeEn}</span>
          </div>

          <h2 className="text-sm sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug sm:leading-tight text-white mb-1 drop-shadow-xs">
            {language === 'bn' ? slide.titleBn : slide.titleEn}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 leading-relaxed">
            {language === 'bn' ? slide.subtitleBn : slide.subtitleEn}
          </p>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-xs transition-colors z-20"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={nextSlide}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-xs transition-colors z-20"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex space-x-1.5 z-20">
          {SLIDER_BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/40'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
