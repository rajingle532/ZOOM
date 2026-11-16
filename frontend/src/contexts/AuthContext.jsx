import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Automatically inject JWT Bearer token into all requests
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle expired tokens on protected endpoints: clear auth and redirect
client.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || "";
        const isAuthEndpoint = url.includes("/login") || url.includes("/register");
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            if (typeof window !== "undefined") {
                window.location.href = "/auth?expired=true";
            }
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || {};
        } catch {
            return {};
        }
    });
    const router = useNavigate();

    const handleRegister = async (name, username, password, email) => {
        try {
            const response = await client.post("/register", {
                name,
                username,
                password,
                ...(email !== undefined && { email })
            });

            if (response.status === httpStatus.CREATED) {
                return response.data.message;
            }
        } catch (err) {
            if (!err.response) {
                err.isNetworkError = true;
            }
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const response = await client.post("/login", {
                username,
                password
            });

            if (response.status === httpStatus.OK) {
                localStorage.setItem("token", response.data.token);
                if (response.data.user) {
                    setUserData(response.data.user);
                    localStorage.setItem("user", JSON.stringify(response.data.user));
                }
                router("/home");
            }
        } catch (err) {
            if (!err.response) {
                err.isNetworkError = true;
            }
            throw err;
        }
    };

    const getHistoryOfUser = async () => {
        try {
            const response = await client.get("/get_all_activity");
            return response.data;
        } catch (err) {
            throw err;
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            const response = await client.post("/add_to_activity", {
                meeting_code: meetingCode
            });
            return response.data;
        } catch (e) {
            throw e;
        }
    };

    const sendVerification = async (email) => {
        const response = await client.post("/send-verification", { ...(email && { email }) });
        return response.data;
    };

    const verifyEmail = async (code, email) => {
        const response = await client.post("/verify-email", {
            code,
            ...(email && { email })
        });
        if (response.data?.isVerified) {
            setUserData((prev) => {
                const updated = { ...prev, isVerified: true };
                localStorage.setItem("user", JSON.stringify(updated));
                return updated;
            });
        }
        return response.data;
    };

    const forgotPassword = async (email) => {
        const response = await client.post("/forgot-password", { email });
        return response.data;
    };

    const resetPassword = async (token, password) => {
        const response = await client.post("/reset-password", { token, password });
        return response.data;
    };

    const addEmail = async (email) => {
        const response = await client.post("/add-email", { email });
        if (response.data?.email) {
            setUserData((prev) => {
                const updated = { ...prev, email: response.data.email, isVerified: false };
                localStorage.setItem("user", JSON.stringify(updated));
                return updated;
            });
        }
        return response.data;
    };

    const data = {
        userData,
        setUserData,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        sendVerification,
        verifyEmail,
        forgotPassword,
        resetPassword,
        addEmail
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};
