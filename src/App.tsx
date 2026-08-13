import React, { useEffect, useRef, useState } from 'react';
import config from './config.json';
import { Menu, X } from 'lucide-react';
import IcenSection from './IcenSection';
import RoniSection from './RoniSection';


const generateSlideshowImages = (region: 'peru' | 'hsur') => {
  const list = [];
  const today = new Date();
  for (let i = 13; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dateCompact = `${year}${month}${day}`;
    list.push({
      date: dateStr,
      src: `https://www.senamhi.gob.pe/usr/dms/dato_tsm/ostia/diario/${region}/ostia_anom_${region}_${dateCompact}.png`
    });
  }
  return list;
};

const slideshowImagesPeru = generateSlideshowImages('peru');
const slideshowImagesHsur = generateSlideshowImages('hsur');

export default function App() {
  const [activeTab, setActiveTab] = useState(config.monitoreo.tabs[0]);
  const [activeVideo, setActiveVideo] = useState(config.videos.playlist[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideshowImagesPeru.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Intersection Observer for scroll reveal animations
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const revealElements = document.querySelectorAll('.js-reveal');
    revealElements.forEach((el) => observerRef.current?.observe(el));

    // Parallax effect for Hero background
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const heroBgWrap = document.querySelector('.c-hero__bg-wrap') as HTMLElement;
      if (heroBgWrap) {
        heroBgWrap.style.transform = `translateY(${scrolled * 0.35}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <header className="c-header">
        <a href={config.header.logo.link} className="c-logo" target="_blank">
          <img src={config.header.logo.src} alt={`${config.header.logo.main} ${config.header.logo.highlight}`} />
        </a>

        <button
          className="c-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Alternar menú"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <nav className={`c-nav ${isMenuOpen ? 'is-open' : ''}`}>
          {config.header.navigation.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              className="c-nav__link"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section id="inicio" className="c-hero">
          <div className="c-hero__bg-wrap">
            <img
              className="c-hero__bg"
              src={config.hero.backgroundImage}
              alt={config.hero.backgroundAlt}
            />
          </div>
          <div className="o-container">
            <div className="c-hero__content">
              <span className="c-hero__label js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
                {config.hero.label}
              </span>
              <h1 className="c-hero__title js-reveal" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                {config.hero.title.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < config.hero.title.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </h1>
              <p className="c-hero__desc js-reveal" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                {config.hero.description}
              </p>
              <div className="c-alert js-reveal" style={{ '--reveal-delay': '0.3s' } as React.CSSProperties}>
                <div className="c-alert__dot"></div>
                <span className="c-alert__text">{config.hero.alert.text}</span>
              </div>
            </div>
          </div>

          {/* Auspicios bar — bottom of hero */}
          <div className="c-hero__sponsors js-reveal" style={{ '--reveal-delay': '0.5s' } as React.CSSProperties}>
            <span className="c-hero__sponsors-label">{config.sponsor.title}</span>
            <img src={config.sponsor.img} alt="Auspiciador" className="c-hero__sponsors-logo" />
          </div>
        </section>



        {/* Noticias Grid Section */}
        <section id="noticias" className="o-section">
          <div className="o-container">
            <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              <span className="c-section-header__subtitle">{config.noticias.subtitle}</span>
              <h2 className="c-section-header__title">
                {config.noticias.title.text}
                <span className="u-text-orange">{config.noticias.title.highlight}</span>
              </h2>
            </header>

            <div className="o-grid o-grid--3">
              {config.noticias.news.map((news, index) => (
                <div key={news.id} className="c-card js-reveal" style={{ '--reveal-delay': `${index * 0.15}s` } as React.CSSProperties}>
                  <div className="c-card__image-wrap">
                    <a href={news.link} target="_blank">
                      <img src={news.image} alt={news.title} className="c-card__image" loading="lazy" />
                    </a>
                  </div>
                  <div className="c-card__content">
                    <h3 className="c-card__title">
                      <a href={news.link} target="_blank">{news.title}</a>
                    </h3>
                    <p className="c-card__time">{news.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Slideshow Anomalías TSM Section */}
        <section id="tsm" className="o-section o-section--bordered-surface">
          <div className="o-container">
            <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              <span className="c-section-header__subtitle">{config.monitoreodiario.subtitle}</span>
              <h2 className="c-section-header__title">{config.monitoreodiario.title_costero.text}<span className="u-text-cyan">{config.monitoreodiario.title_costero.highlight}</span></h2>
              <p className="c-section-header__desc">{config.monitoreodiario.title_costero.description} Fuente: <a href={config.monitoreodiario.source_link} target="_blank" rel="noopener noreferrer">{config.monitoreodiario.source}</a></p>
            </header>

            <div className="c-slideshows-container js-reveal" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
              {/* Slideshow Perú */}
              <div className="c-slideshow-wrapper">
                <div id="slideshow-peru" className="cycle-slideshow">
                  {slideshowImagesPeru.map((slide, index) => {
                    const isActive = index === activeSlide;
                    return (
                      <a
                        key={index}
                        href={slide.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`cycle-slide ${isActive ? 'cycle-slide-active' : ''}`}
                      >
                        <img
                          src={slide.src}
                          title={slide.date}
                          alt={`Anomalía TSM Perú ${slide.date}`}
                          className="img-fluid"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tsm_pacifico" className="o-section o-section--bordered-surface">
          <div className="o-container">
            <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              <h2 className="c-section-header__title">{config.monitoreodiario.title_pacifico.text}<span className="u-text-cyan">{config.monitoreodiario.title_pacifico.highlight}</span></h2>
              <p className="c-section-header__desc">{config.monitoreodiario.title_pacifico.description} Fuente: <a href={config.monitoreodiario.source_link} target="_blank" rel="noopener noreferrer">{config.monitoreodiario.source}</a></p>
            </header>

            {/* Slideshow Hsur */}
            <div className="c-slideshow-wrapper">
              <div id="slideshow-hsur" className="cycle-slideshow">
                {slideshowImagesHsur.map((slide, index) => {
                  const isActive = index === activeSlide;
                  return (
                    <a
                      key={index}
                      href={slide.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`cycle-slide ${isActive ? 'cycle-slide-active' : ''}`}
                    >
                      <img
                        src={slide.src}
                        title={slide.date}
                        alt={`Anomalía TSM Hsur ${slide.date}`}
                        className="img-fluid"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ICEN Section */}
        <IcenSection />

        {/* RONI Section */}
        <RoniSection />

        {/* Monitoreo en Vivo Section */}
        <section id="monitoreo" className="o-section">
          <div className="o-container">
            <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              <span className="c-section-header__subtitle">{config.monitoreo.subtitle}</span>
              <h2 className="c-section-header__title">
                {config.monitoreo.title.text}
                <span className="u-text-cyan">{config.monitoreo.title.highlight}</span>
              </h2>
            </header>

            <div>
              <div className="c-tabs js-reveal" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                {config.monitoreo.tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`c-tabs__btn ${activeTab.id === tab.id ? 'is-active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="c-widget-frame js-reveal" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                <iframe src={activeTab.src} title="Mapa Interactivo" loading="lazy"></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* Video Gallery Section */}
        <section id="videos" className="o-section o-section--bordered-surface">
          <div className="o-container">
            <header className="c-section-header js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              <span className="c-section-header__subtitle">{config.videos.subtitle}</span>
              <h2 className="c-section-header__title">
                {config.videos.title.text}
                <span className="u-text-cyan">{config.videos.title.highlight}</span>
              </h2>
            </header>

            <div className="o-grid o-grid--video-layout">
              {/* Main Video */}
              <div className="c-video-main js-reveal" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                <div className={`c-video-main__player ${isPlaying ? 'is-playing' : ''}`}>
                  {isPlaying ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(activeVideo.src)}?autoplay=1`}
                      title={activeVideo.caption}
                      className="c-video-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <>
                      <img src={activeVideo.image} alt={activeVideo.alt} className="c-video__thumb" loading="lazy" />
                      <button className="c-play-btn c-play-btn--large" onClick={() => setIsPlaying(true)}>
                        <span className="c-play-btn__icon">▶</span>
                      </button>
                      <div className="c-video-main__actions">
                        <a
                          href={activeVideo.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="c-youtube-btn"
                        >
                          Mirar en <span>YouTube</span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
                <h3 className="c-video-main__caption">{activeVideo.caption}</h3>
              </div>

              {/* Video Playlist */}
              <div className="c-video-playlist js-reveal" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>

                <div className="c-video-list">
                  {config.videos.playlist.map((video) => {
                    const isSelected = activeVideo.id === video.id;
                    return (
                      <div
                        key={video.id}
                        className={`c-video-item ${isSelected ? 'is-active' : ''}`}
                        onClick={() => {
                          setActiveVideo(video);
                          setIsPlaying(true);
                        }}
                      >
                        <div className="c-video-item__thumb-wrap">
                          <img src={video.image} alt={video.alt} className="c-video__thumb" loading="lazy" />
                          {!isSelected && (
                            <button className="c-play-btn c-play-btn--small">
                              <span className="c-play-btn__icon">▶</span>
                            </button>
                          )}
                        </div>
                        <div className="c-video-item__content">
                          <h5 className="c-video-item__caption">{video.caption}</h5>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prevención Section */}
        <section id="prevencion" className="o-section">
          <div className="o-container">
            <div className="o-grid o-grid--2 u-align-center">
              <div>
                <header className="c-section-header c-section-header--prevention js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
                  <span className="c-section-header__subtitle">{config.prevencion.subtitle}</span>
                  <h2 className="c-section-header__title">
                    {config.prevencion.title.text}
                    <br />
                    <span className="u-text-cyan">{config.prevencion.title.highlight}</span>
                  </h2>
                </header>
                <p className="c-prevention-desc js-reveal" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                  {config.prevencion.description}
                </p>
              </div>

              <ul className="c-prevention-list">
                {config.prevencion.steps.map((item, index) => (
                  <li key={item.id} className="c-prevention-item js-reveal" style={{ '--reveal-delay': `${index * 0.15}s` } as React.CSSProperties}>
                    <span className="c-prevention-item__num">0{item.id}</span>
                    <div className="c-prevention-item__content">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="c-cta">
          <div className="o-container u-text-center">
            <h2 className="c-cta__title js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
              {config.cta.title}
            </h2>
            <a href={config.cta.buttonLink} className="c-cta__btn js-reveal" target="_blank" rel="noopener noreferrer" style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
              {config.cta.buttonText}
            </a>
          </div>
        </section>
      </main>

      <footer className="c-footer">
        <span className="c-footer__campaign js-reveal" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
          {config.footer.campaignLabel}
        </span>
        <div className="c-footer__logo js-reveal" style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
          <a href={config.footer.link} target="_blank">
            <img src={config.footer.src} alt="RPP" />
          </a>
        </div>
      </footer>
    </>
  );
}
