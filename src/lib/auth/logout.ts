// src/lib/auth/logout.ts
export const logout = async () => {
    try {
        const res = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include", // Important for cookies
        });

        const data = await res.json();

        if (data.success) {
            // Clear ALL sessionStorage at once
            sessionStorage.clear();

            // Clear localStorage
            localStorage.clear();

            // Redirect to login page
            window.location.href = "/login";
        } else {
            alert("Logout failed. Please try again.");
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Something went wrong during logout.");
    }
};