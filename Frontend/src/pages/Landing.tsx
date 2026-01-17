import "./Landing.css";
import { NavLink } from "react-router";

function Landing() {
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
          <NavLink to="/login" className="button button--primary">
            Get started free
          </NavLink>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero__content">
            <img
              className="hero__mark"
              src="https://www.opennote.com/img/hero-illustration.svg"
              alt="Illustration of a traveler mapping a journey"
            />
            <h1>Map the world’s most sustainable local gems.</h1>
            <p>
              Beacon is a sustainability-first travel assistant. Drop pins on hidden
              spots, attach a photo and story, and let AI tag the most eco-friendly
              places that aren’t part of the corporate rat race.
            </p>
            <div className="hero__actions">
              <NavLink to="/login" className="button button--primary">
                Try for free
              </NavLink>
              <button className="button button--ghost" type="button">
                Watch the walkthrough
              </button>
            </div>
            <div className="hero__meta">
              <span>Map-first trips</span>
              <span>Carbon-neutral planning</span>
              <span>AI-guided walking tours</span>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__card">
              <div className="hero__card-bar">
                <span>Beacon Map</span>
                <span className="hero__badge">Live</span>
              </div>
              <div className="hero__card-body">
                <aside className="hero__sidebar">
                  <h4>Local Gems</h4>
                  <div className="hero__pill">🌱 84% green</div>
                  <ul>
                    <li>Sunrise Market</li>
                    <li>Riverwalk Bakery</li>
                    <li>Community Bike Hub</li>
                  </ul>
                </aside>
                <div className="hero__map">
                  <img
                    src="https://illustrations.popsy.co/gray/map.svg"
                    alt="Illustrated world map with pins"
                  />
                  <div className="hero__pin hero__pin--one" />
                  <div className="hero__pin hero__pin--two" />
                  <div className="hero__pin hero__pin--three" />
                </div>
              </div>
              <div className="hero__card-footer">
                <div>
                  <strong>Walking guide:</strong> 4.2 km · 3 hrs · net-zero
                </div>
                <button className="button button--tiny" type="button">
                  View itinerary
                </button>
              </div>
            </div>
            <div className="hero__stamp">
              <p>AI tags photos, suggests green alternatives, and builds itineraries.</p>
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

        <section className="logos" aria-label="Community partners">
          <p>Used by neighborhood collectives and sustainable travel clubs</p>
          <div className="logos__row">
            <span>Urban Roots</span>
            <span>CityCycle</span>
            <span>Green Atlas</span>
            <span>Locals First</span>
            <span>Coastline Co-op</span>
          </div>
        </section>

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
          <NavLink to="/login" className="button button--primary">
            Try Beacon free
          </NavLink>
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
