import { ApiResponse, PaginatedResponse } from "../types/common";
import { Response } from "express";

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  data: T | null,
  message: string,
  path?: string
): Response => {
  // Check if data is a PaginatedResponse (has data, total, page, limit, totalPages)
  const isPaginated = (
    data !== null &&
    typeof data === "object" &&
    "data" in data &&
    "total" in data &&
    "page" in data &&
    "limit" in data &&
    "totalPages" in data &&
    Array.isArray((data as any).data)
  );

  if (isPaginated) {
    // Handle paginated response: spread pagination fields at top level
    const paginatedData = data as unknown as PaginatedResponse<any>;
    const response = {
      success: statusCode >= 200 && statusCode < 300,
      data: paginatedData.data, // Array directly, no nesting
      total: paginatedData.total,
      page: paginatedData.page,
      limit: paginatedData.limit,
      totalPages: paginatedData.totalPages,
      message,
      timestamp: Date.now(),
      path,
    };
    return res.status(statusCode).json(response);
  }

  // Standard response (non-paginated)
  const response: ApiResponse<T> = {
    success: statusCode >= 200 && statusCode < 300,
    data: data || undefined,
    message,
    timestamp: Date.now(),
    path,
  };

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  error: string,
  path?: string
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    error,
    timestamp: Date.now(),
    path,
  };

  return res.status(statusCode).json(response);
};
