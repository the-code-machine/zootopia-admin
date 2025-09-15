import axios from "axios";
import { BASE_URL } from "./config"; // Assuming config.ts is in the same directory

// Create an axios instance for your API
const adminApiClient = axios.create({
  baseURL: `${BASE_URL}/admin`,
});

// Define common types for pagination and API responses
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * A generic service for interacting with the admin API endpoints.
 */
export const AdminService = {
  /**
   * Fetches paginated data from a specified table.
   * @param tableName - The name of the table to fetch data from.
   * @param page - The page number to retrieve.
   * @param limit - The number of records per page.
   * @returns A promise that resolves to a paginated list of records.
   */
  async getPaginatedData<T>(
    tableName: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<T>> {
    try {
      const response = await adminApiClient.get(`/${tableName}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching data from ${tableName}:`, error);
      throw error;
    }
  },

  /**
   * Updates a single record in a specified table by its ID.
   * @param tableName - The name of the table where the record exists.
   * @param id - The ID of the record to update.
   * @param updates - An object containing the fields to update.
   * @returns A promise that resolves to the updated record.
   */
  async updateRecord<T>(
    tableName: string,
    id: number | string,
    updates: Partial<T>
  ): Promise<T> {
    try {
      const response = await adminApiClient.put(`/${tableName}/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating record in ${tableName}:`, error);
      throw error;
    }
  },
  async createRecord<T>(tableName: string, newData: Partial<T>): Promise<T> {
    try {
      const response = await adminApiClient.post(`/${tableName}`, newData);
      return response.data;
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      throw error;
    }
  },
  /**
   * Deletes one or more records from a specified table in bulk.
   * @param tableName - The name of the table to delete records from.
   * @param ids - An array of record IDs to delete.
   * @returns A promise that resolves to the success message from the API.
   */
  async deleteRecords(
    tableName: string,
    ids: (number | string)[]
  ): Promise<{ message: string }> {
    try {
      // For DELETE requests with a body, axios requires a `data` property in the config
      const response = await adminApiClient.delete(`/${tableName}`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      console.error(`Error deleting records from ${tableName}:`, error);
      throw error;
    }
  },
};

export const FcmService = {
  /**
   * Triggers the backend to send a notification for a specific event.
   * @param eventId The ID of the upcoming_event.
   */
  sendEventNotification: async (eventId: number) => {
    try {
      const response = await axios.post(`${BASE_URL}/fcm/send/${eventId}`);
      return response.data; // Should return { message, successCount, failureCount }
    } catch (error) {
      console.error(`Error sending notification for event ${eventId}:`, error);
      // Re-throw the error to be handled by the component
      throw error.response?.data || new Error("An API error occurred");
    }
  },
};
