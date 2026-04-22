'use client';
import { useState, useEffect } from "react";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved ?? "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className={styles["slider-container"]}>
      <button
        className={`${styles.slider} ${theme === "dark" ? styles.active : ""}`}
        onClick={toggleTheme}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <div className={styles["slider-track"]}>
          <div className={styles["slider-thumb"]}></div>
        </div>
        <span className={styles["slider-icon-moon"]}>🌙</span>
        <span className={styles["slider-icon-sun"]}>☀️</span>
      </button>
    </div>
  );
}