import { ApiResponse, PaginatedResponse, PaginatedApiResponse, PaginationMeta } from "../types/common";
import { Response } from "express";

/**
 * Helper function to create pagination metadata
 * Calculates additional useful fields like hasNextPage and hasPreviousPage
 */
const createPaginationMeta = (
  page: number,
  limit: number,
  total: number,
  totalPages: number
): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

/**
 * Check if data is a PaginatedResponse
 */
const isPaginatedResponse = (data: any): data is PaginatedResponse<any> => {
  return (
    data !== null &&
    typeof data === "object" &&
    "data" in data &&
    "total" in data &&
    "page" in data &&
    "limit" in data &&
    "totalPages" in data &&
    Array.isArray(data.data)
  );
};

/**
 * Send API response with optimized structure
 * - Paginated responses: Groups pagination metadata in a dedicated object
 * - Standard responses: Simple structure with data
 */
export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  data: T | null,
  message: string,
  path?: string
): Response => {
  // Handle paginated responses with optimized structure
  if (isPaginatedResponse(data)) {
    const paginatedData = data as PaginatedResponse<any>;
    const paginationMeta = createPaginationMeta(
      paginatedData.page,
      paginatedData.limit,
      paginatedData.total,
      paginatedData.totalPages
    );

    const response: PaginatedApiResponse<any> = {
      success: statusCode >= 200 && statusCode < 300,
      message,
      data: paginatedData.data,
      pagination: paginationMeta,
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
