import axios from "axios";
import type { AxiosInstance } from "axios";
import { API_BASE_URL } from "@/Service/apiBaseUrl";

export interface FetchPatentsParams {
  tech_q?: string;
  prod_q?: string;
  desc_q?: string;
  claim_q?: string;
  inventor?: string;
  manager?: string;
  applicant?: string;
  app_num?: string;
  reg_num?: string;
  status?: string | string[]; // 법적 상태 (단일 또는 배열)
  page?: number;
  limit?: number;
}

export interface PatentSearchResponse {
  total: number;
  page: number;
  limit: number;
  data: any[];
  engine: string;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

export async function fetchPatents(params: FetchPatentsParams): Promise<PatentSearchResponse> {
  const queryParams: FetchPatentsParams = {
    ...params,
    page: params.page ?? 1,
    limit: params.limit ?? 10000
  };

  const response = await apiClient.get<PatentSearchResponse>("/api/patents", {
    params: queryParams
  });

  return response.data;
}

