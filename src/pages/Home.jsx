import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <main className="home-page">
      <section className="home-hero-card" aria-label="Bhaichara landing hero">
        <div className="home-top-row">
          <p className="home-badge">Bhaichara</p>
        </div>

        <h1 className="home-title">Bhaichara – Your Student Support Companion</h1>

        <p className="home-description">
          Bhaichara helps students who feel lonely, stressed, or overwhelmed by
          offering a safe space to talk, connect, and feel supported. Start a
          warm conversation with our companion chatbot or build your support
          circle by making new friends on campus.
        </p>

        <div className="home-actions">
          <Link to="/chat" className="home-button home-button-primary">
            Start Chat
          </Link>
          <Link to="/friends" className="home-button home-button-secondary">
            Make Friends
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Home;
