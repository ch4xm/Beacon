import { useState } from "react";
import { NavLink, useNavigate } from "react-router";

export function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store the token in localStorage
      localStorage.setItem("accessToken", data.accessToken);

      // Navigate to home page on successful login
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: "red", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <button type="button" disabled={isLoading}>
          <nav>
            <NavLink to="/home" end>
              Skip login and go to Homepage
            </NavLink>
          </nav>
        </button>
      </form>
    </div>
  );
}
