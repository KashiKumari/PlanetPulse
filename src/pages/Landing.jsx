import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Brain,
  Globe2,
  Leaf,
  MessageSquare,
  Satellite,
  ShieldAlert,
  Sprout,
  Thermometer,
  Trees,
  TrendingUp,
  Wind,
} from "lucide-react";

const indicators = [
  { icon: Trees, label: "Forest Cover", color: "green" },
  { icon: Leaf, label: "NDVI", color: "cyan" },
  { icon: Thermometer, label: "Temperature", color: "amber" },
  { icon: Wind, label: "Air Quality", color: "violet" },
];

const capabilities = [
  {
    icon: Satellite,
    label: "Deterministic",
    title: "Environmental Change Detection",
    description:
      "Compare historical and current satellite observations to explore forest change, vegetation indicators, and temperature trends.",
    color: "green",
  },
  {
    icon: TrendingUp,
    label: "ML Prediction",
    title: "Machine Learning Forecast",
    description:
      "Explore future environmental trends with transparent models and confidence intervals. Forecasts are not guaranteed outcomes.",
    color: "cyan",
  },
  {
    icon: ShieldAlert,
    label: "Composite Index",
    title: "Prototype Risk Score",
    description:
      "Review a transparent prototype score and its contributing components. It is not an internationally validated index.",
    color: "amber",
  },
  {
    icon: Brain,
    label: "Grounded Analyst",
    title: "AI Environmental Analyst",
    description:
      "Ask questions in plain language and explore answers grounded in available regional data and clearly stated limitations.",
    color: "violet",
  },
];

export default function Landing() {
  return (
    <main className="showcase-page">
      <section className="showcase-hero">
        <div className="showcase-grid" aria-hidden="true" />
        <div className="showcase-hero-content">
          <div className="showcase-eyebrow">
            <Satellite size={15} aria-hidden="true" />
            AI-Powered Earth Intelligence
          </div>
          <h1>
            PLANET <span>PULSE</span>
          </h1>
          <p className="showcase-tagline">
            See Earth&apos;s Past. Understand Its Present. <strong>Predict Its Future.</strong>
          </p>
          <div className="showcase-actions">
            <Link to="/map" className="showcase-button showcase-button-primary">
              <Globe2 size={19} aria-hidden="true" />
              Explore Earth
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <Link to="/eco-analyst" className="showcase-button showcase-button-secondary">
              <MessageSquare size={19} aria-hidden="true" />
              Ask Eco Agent
            </Link>
          </div>
          <div className="showcase-indicators" aria-label="Environmental indicators explored">
            {indicators.map(({ icon: Icon, label, color }) => (
              <div className={`showcase-indicator showcase-${color}`} key={label}>
                <Icon size={23} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <a className="showcase-scroll" href="#about">
          <span>Discover the platform</span>
          <span className="showcase-scroll-line" />
        </a>
      </section>

      <section className="showcase-about" id="about">
        <article className="showcase-about-card">
          <span className="showcase-section-kicker">The Problem</span>
          <h2>Earth is changing faster than we can measure it.</h2>
          <p>
            Forests disappear, temperatures rise, and air quality shifts — often before communities
            can respond. Decision-makers need a clear way to explore what is happening, understand
            why, and anticipate what may come next.
          </p>
        </article>
        <article className="showcase-about-card showcase-solution">
          <span className="showcase-section-kicker">The Solution</span>
          <h2>One intelligence layer for the whole planet.</h2>
          <p>
            Planet Pulse brings satellite imagery, environmental datasets, and machine learning
            tools into a single workspace. Sources, dates, and model limitations stay visible as
            you explore.
          </p>
        </article>
      </section>

      <section className="showcase-capabilities" id="capabilities">
        <div className="showcase-section-heading">
          <span className="showcase-section-kicker">Four Intelligent Components</span>
          <h2>Not a chatbot. An intelligence platform.</h2>
        </div>
        <div className="showcase-capability-grid">
          {capabilities.map(({ icon: Icon, label, title, description, color }, index) => (
            <article className={`showcase-capability showcase-${color}`} key={title}>
              <div className="showcase-capability-top">
                <span className="showcase-capability-icon"><Icon size={21} aria-hidden="true" /></span>
                <span className="showcase-capability-number">0{index + 1}</span>
              </div>
              <span className="showcase-capability-label">{label}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <p className="showcase-disclaimer">
          Historical forest and NDVI series and prototype risk scores are illustrative estimates,
          not validated satellite measurements.
        </p>
      </section>

      <section className="showcase-cta">
        <div className="showcase-cta-icon"><Globe2 size={24} aria-hidden="true" /></div>
        <span className="showcase-section-kicker">Your planet. A clearer picture.</span>
        <h2>Start monitoring Earth.</h2>
        <p>
          Select a region on the interactive map and explore its environmental pulse — past,
          present, and predicted.
        </p>
        <Link to="/map" className="showcase-button showcase-button-primary">
          <Globe2 size={18} aria-hidden="true" />
          Explore Earth
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="showcase-footer">
        <Link to="/" className="showcase-footer-brand">
          <Activity size={17} aria-hidden="true" />
          PLANET<span>PULSE</span>
        </Link>
        <p>Hackathon prototype · Scientifically honest, clearly labeled · Not an internationally validated index</p>
        <Link to="/greenery" className="showcase-footer-link">
          <Sprout size={15} aria-hidden="true" />
          Greenery
        </Link>
      </footer>
    </main>
  );
}
