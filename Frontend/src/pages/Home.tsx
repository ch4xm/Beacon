import { NavLink } from "react-router";

function HomePage() {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <p>This is the main landing page of the application.</p>

      <button type="submit">
        <nav>
          <NavLink to="/" end>
            Logout
          </NavLink>
        </nav>
      </button>
    </div>
  );
}

export default HomePage;
