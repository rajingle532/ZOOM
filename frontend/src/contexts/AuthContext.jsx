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

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || {};
        } catch {
            return {};
        }
    });
    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            const response = await client.post("/register", {
                name,
                username,
                password
            });

            if (response.status === httpStatus.CREATED) {
                return response.data.message;
            }
        } catch (err) {
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

    const data = {
        userData,
        setUserData,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};
