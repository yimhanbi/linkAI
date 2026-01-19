import axios from 'axios';
import { API_BASE_URL } from '@/Service/apiBaseUrl';

const API_URL = `${API_BASE_URL}/api/auth`;

export const authService = {
  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data; // 여기서 access_token이 넘어옵니다.
  },
  signup: async (userData: {name: string; email: string; password: string; role: string}) => {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  }
};