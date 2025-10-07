export const ANIXART_API_URL = "https://api.anixart.app";
export const ANIXART_USER_AGENT = "AnixartApp/9.0 BETA 5-25062213 (Android 9; SDK 28; x86_64; ROG ASUS AI2201_B; ru)";
export const INSTANCE_API_URL = "YOUR_INSTANCE_URL";

export type ANIXART_HEADERS = {
    "User-Agent": string;
    "Content-Type": string;
    "Api-Version"?: string;
};

export const DEFAULT_ANIXART_HEADERS: ANIXART_HEADERS = {
    "User-Agent": ANIXART_USER_AGENT,
    "Content-Type": "application/json"
};

export const SERVER_VERSION: string = "0.0.1";
export const SERVER_PORT: number = 3000;