import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage first, default to dark if not set
        const saved = localStorage.getItem("theme");
        return saved ? saved === "dark" : true; // Default to dark
    });

    useEffect(() => {
        // Apply theme class to document
        if (isDark) {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
        } else {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
