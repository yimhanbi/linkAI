// src/services/patentService.ts
import axios from 'axios';
import { API_BASE_URL } from '@/Service/apiBaseUrl';

export const fetchPatents = async (params: any) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/patents/`, {
      params: {
        tech_q: params.techKw,    // 프론트의 techKw를 서버의 tech_q로 매핑
        prod_q: params.prodKw,    // 프론트의 prodKw를 서버의 prod_q로 매핑
        app_num: params.appNo,    // 출원번호 매핑
        applicant: params.applicant,
        page: params.page || 1,
        limit: params.limit || 10
      },
    });
    return response.data;
  } catch (error) {
    console.error("데이터 로드 실패:", error);
    throw error;
  }
};