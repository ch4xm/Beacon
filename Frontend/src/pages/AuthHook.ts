import { useState } from "react";

export default function AuthHook() {
	const [userEmail, setUserEmail] = useState<string>(() => {
        const email = localStorage.getItem("userEmail");
        return email || "";
    });
    const [userId, setUserId] = useState<number | null>(() => {
        const id = localStorage.getItem("userId");
        return id ? parseInt(id) : null;
    });
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
        return !!localStorage.getItem("accessToken");
    });

	const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userId");
        setIsLoggedIn(false);
        setUserEmail("");
        setUserId(null);
    }; 

	
    const authSuccess = () => {
        setIsLoggedIn(true);
        setUserEmail(localStorage.getItem("userEmail") || "");
        const storedId = localStorage.getItem("userId");
        if (storedId) setUserId(parseInt(storedId));
    };

	return [userEmail, userId, isLoggedIn, logout, authSuccess] as const;
}