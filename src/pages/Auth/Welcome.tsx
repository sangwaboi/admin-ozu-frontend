
import { Link } from 'react-router-dom';
import './welcome.css';

export default function Welcome() {
  return (
    <div className="welcome-bg">
      <div className="welcome-container">

        {/* OZU TEXT (NOT LOGO IMAGE) */}
       <img
  src="/ozu-logo.png"
  alt="OZU"
  className="welcome-logo"
/>


        {/* TAGLINE TEXT */}
        <p className="welcome-text">
          Delivery riders near you <br />
          Take control of your deliveries. <br />
          Keep Profits.
        </p>

        {/* ILLUSTRATION */}
        <img
          src="/courier.png"
          alt="Courier"
          className="welcome-illustration"
        />

        {/* ACTION BUTTONS */}
        <div className="welcome-actions">
          <Link to="/signup" className="btn-main">
            Register Now
          </Link>

          <Link to="/login" className="btn-secondary">
            Already registered? <span>Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
