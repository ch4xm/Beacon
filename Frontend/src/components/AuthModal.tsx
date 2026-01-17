import { useState } from "react";
import { BASE_API_URL } from '../../constants';

type AuthMode = "login" | "register";
interface AuthModalProps {
    isOpen: boolean;
    onClose?: () => void;
    onAuthSuccess: () => void;
}

export default function AuthModal({
    isOpen,
    onClose,
    onAuthSuccess,
}: AuthModalProps) {
    const [authMode, setAuthMode] = useState<AuthMode>("login");
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [credentials, setCredentials] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials({ ...credentials, [name]: value });
        if (error) setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!credentials.email.trim() || !credentials.password.trim()) {
            setError("Please fill in all fields");
            return;
        }

        setIsLoading(true);

        try {
            const endpoint =
                authMode === "register" ? "/api/register" : "/api/login";

            const response = await fetch(`${BASE_API_URL}${endpoint}`, {
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
                throw new Error(
                    data.message ||
                        (authMode === "register"
                            ? "Registration failed"
                            : "Login failed"),
                );
            }

            // Store the token and user email
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("userEmail", credentials.email);
            if (data.user?.id)
                localStorage.setItem("userId", data.user.id.toString());
            setCredentials({ email: "", password: "" });
            onAuthSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const switchAuthMode = () => {
        setAuthMode(authMode === "login" ? "register" : "login");
        setError("");
        setCredentials({ email: "", password: "" });
    };

    if (!isOpen) return null;

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <div className="auth-modal-header">
                    <div className="auth-brand">
                        <svg
                            className="auth-logo"
                            viewBox="0 0 80 80"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <circle
                                cx="40"
                                cy="40"
                                r="36"
                                stroke="#2d6a4f"
                                strokeWidth="2"
                                fill="#e9f5e9"
                            />
                            <path
                                d="M40 20C32 20 26 28 26 36C26 48 40 60 40 60C40 60 54 48 54 36C54 28 48 20 40 20Z"
                                fill="#2d6a4f"
                            />
                            <circle cx="40" cy="35" r="6" fill="#faf9f7" />
                        </svg>
                    </div>
                    <h2>
                        {authMode === "login"
                            ? "Welcome back"
                            : "Create account"}
                    </h2>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                        onClick={() => setAuthMode("login")}
                    >
                        Login
                    </button>
                    <button
                        className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                        onClick={() => setAuthMode("register")}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            autoComplete="email"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            autoComplete={
                                authMode === "login"
                                    ? "current-password"
                                    : "new-password"
                            }
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? "Please wait..."
                            : authMode === "login"
                              ? "Sign In"
                              : "Create Account"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {authMode === "login"
                            ? "Don't have an account?"
                            : "Already have an account?"}
                        <button
                            onClick={switchAuthMode}
                            className="auth-switch-btn"
                        >
                            {authMode === "login" ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
