import "./Landing.css";
import { NavLink, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

function Landing() {
  const navigate = useNavigate();
  const mapPreviewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const heartbeat = async () => {
      try {
        const res = await fetch("/heartbeat");
        const data = await res.json();
        console.log("[Client-side] Server reachable:", data);
      } catch (err) {
        console.error("[Client-side] Server unreachable:", err);
      }
    };

    heartbeat();
  }, []);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token || !mapPreviewRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    mapRef.current = new mapboxgl.Map({
      container: mapPreviewRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-122, 37],
      zoom: 9,
      interactive: false, // Disable interactions for preview
      attributionControl: false,
    });

    // Create a hidden map to preload tiles at different zoom levels
    const preloaderContainer = document.createElement("div");
    preloaderContainer.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;";
    document.body.appendChild(preloaderContainer);

    const preloaderMap = new mapboxgl.Map({
      container: preloaderContainer,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-122, 37],
      zoom: 9,
      interactive: false,
      attributionControl: false,
    });

    // Preload tiles at zoom levels the user might use on Home page
    preloaderMap.on("load", () => {
      const zoomLevels = [7, 8, 10, 11, 12];
      let currentIndex = 0;

      const preloadNextZoom = () => {
        if (currentIndex >= zoomLevels.length) {
          // Clean up preloader after all zooms are cached
          preloaderMap.remove();
          preloaderContainer.remove();
          return;
        }

        preloaderMap.setZoom(zoomLevels[currentIndex]);
        currentIndex++;
        preloaderMap.once("idle", () => setTimeout(preloadNextZoom, 50));
      };

      preloaderMap.once("idle", preloadNextZoom);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleMapPreviewClick = () => {
    navigate("/home", { viewTransition: true });
  };

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__brand">
          <span className="landing__brand-mark">Beacon</span>
          <span className="landing__brand-tag">Local gems, mapped together</span>
        </div>
        <nav className="landing__nav">
          <a href="#product">Product</a>
          <a href="#impact">Impact</a>
          <a href="#community">Community</a>
          <a href="#guide">Guides</a>
          <NavLink to="/home" className="button button--primary" prefetch="intent">
              Open App
            </NavLink>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero__content">
            <svg className="hero__mark" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="36" stroke="#2d6a4f" strokeWidth="2" fill="#e9f5e9"/>
              <path d="M40 20C32 20 26 28 26 36C26 48 40 60 40 60C40 60 54 48 54 36C54 28 48 20 40 20Z" fill="#2d6a4f"/>
              <circle cx="40" cy="35" r="6" fill="#faf9f7"/>
            </svg>
            <h1>Map the world's local gems.</h1>
            <p>
              Beacon is a sustainability-first travel assistant. Drop pins on hidden
              spots, attach a photo and story, and tag places that aren’t part of the corporate rat race.
            </p>
            <div className="hero__actions">
              <NavLink to="/home" className="button button--primary" prefetch="intent">
                Open App
              </NavLink>
            </div>
            <div className="hero__meta">
              <span>Map-first trips</span>
              <span>Carbon-neutral planning</span>
              <span>AI-guided walking tours</span>
            </div>
          </div>
          <div className="hero__visual">
            <div 
              className="map-preview-window"
              onClick={handleMapPreviewClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleMapPreviewClick()}
            >
              <div className="map-preview-header">
                <div className="map-preview-dots">
                  <span className="dot dot--red" />
                  <span className="dot dot--yellow" />
                  <span className="dot dot--green" />
                </div>
                <span className="map-preview-title">Beacon Map</span>
                {/* <span className="map-preview-badge">Live</span> */}
              </div>
              <div className="map-preview-container" ref={mapPreviewRef} />
              <div className="map-preview-overlay">
                <div className="map-preview-cta">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Click to explore</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="highlight" id="product">
          <div className="highlight__content">
            <h2>One place for every local gem you love.</h2>
            <p>
              Upload photos, add notes about ethical practices, and keep a living
              map of the places that deserve the spotlight.
            </p>
            <ul>
              <li>Share pins with friends planning a group adventure.</li>
              <li>Automatically label independent, community-run businesses.</li>
              <li>See carbon-neutral routes across the city.</li>
            </ul>
          </div>
          <div className="highlight__panel">
            <div className="highlight__panel-card">
              <span className="highlight__panel-label">Today’s gem</span>
              <h3>Harbor Street Cafe</h3>
              <p>
                Solar-powered kitchen, zero-plastic policy, locally sourced menu.
              </p>
              <div className="highlight__panel-tags">
                <span>Green-certified</span>
                <span>Family-owned</span>
                <span>Walkable</span>
              </div>
              <div className="highlight__panel-photo" />
            </div>
          </div>
        </section>

        {/* <section className="logos" aria-label="Community partners">
          <p>Used by neighborhood collectives and sustainable travel clubs</p>
          <div className="logos__row">
            <span>Urban Roots</span>
            <span>CityCycle</span>
            <span>Green Atlas</span>
            <span>Locals First</span>
            <span>Coastline Co-op</span>
          </div>
        </section> */}

        <section className="features" id="impact">
          <h2>Understand the impact of where you go.</h2>
          <div className="features__grid">
            <article>
              <h3>AI that actually gets it</h3>
              <p>
                Beacon tags photos for sustainability signals and flags large
                corporate chains automatically.
              </p>
            </article>
            <article>
              <h3>Real-time guidance</h3>
              <p>
                Get suggestions for hole-in-the-wall spots, ethical stays, and
                low-impact routes while you plan.
              </p>
            </article>
            <article>
              <h3>Walking guides for every stop</h3>
              <p>
                AI builds a friendly tour with history, highlights, and tips you
                can share with friends instantly.
              </p>
            </article>
          </div>
        </section>

        <section className="workflow" id="guide">
          <div className="workflow__content">
            <h2>Plan carbon-neutral adventures with friends.</h2>
            <p>
              Coordinate trips, vote on pins, and co-create itineraries that
              prioritize sustainability over convenience.
            </p>
            <div className="workflow__list">
              <div>
                <h4>Collaborate in real time</h4>
                <p>Invite friends to add pins, stories, and accessibility notes.</p>
              </div>
              <div>
                <h4>Track your footprint</h4>
                <p>See emissions saved and make carbon-positive choices.</p>
              </div>
              <div>
                <h4>Discover together</h4>
                <p>Find community events and neighborhood gems nearby.</p>
              </div>
            </div>
          </div>
          <div className="workflow__card">
            <h3>Friends trip: Kyoto</h3>
            <ul>
              <li>Morning: Nishiki Market (local vendors)</li>
              <li>Midday: River walk + bike share</li>
              <li>Evening: Rooftop solar izakaya</li>
            </ul>
            <div className="workflow__footer">
              <span>Projected impact: +12 kg CO₂ offset</span>
              <button className="button button--tiny" type="button">
                Share plan
              </button>
            </div>
          </div>
        </section>

        <section className="testimonial" id="community">
          <div className="testimonial__quote">
            <p>
              “I used to juggle five apps to plan ethical trips. Now Beacon keeps
              every local gem, guide, and sustainability insight connected.”
            </p>
            <span>Riya · Climate-minded traveler</span>
          </div>
          <div className="testimonial__cards">
            <div className="testimonial__card">
              <h4>Community-powered</h4>
              <p>Follow local curators and see their newest discoveries.</p>
            </div>
            <div className="testimonial__card">
              <h4>Always independent</h4>
              <p>We prioritize small businesses and avoid corporate chains.</p>
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>Your travels deserve better tools.</h2>
          <p>
            Start mapping, tagging, and sharing the places that keep communities
            thriving.
          </p>
          <div className="cta__actions">
            <NavLink to="/home" className="button button--primary" prefetch="intent">
              Open App
            </NavLink>
          </div>
        </section>
      </main>

      <footer className="footer">
        <nav>
          <a href="#">Our Mission</a>
          <a href="#">Pricing</a>
          <a href="#">Community</a>
          <a href="#">Careers</a>
          <a href="#">Blog</a>
          <a href="#">Privacy Policy</a>
        </nav>
        <p>© 2026 Beacon. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Landing;
