import { AdminService } from "./services"; // Assuming it's in the same directory

// Define the structure for a blocked slot
export interface BlockedSlot {
  id: number;
  date: string;
  time: string | null; // HH:MM or null
  reason?: string;
}

// Define the payload for creating a new blocked slot
export interface NewBlockedSlot {
  date: string;
  time: string | null; // HH:MM or null
  reason?: string;
}

/**
 * Service for managing appointment slots using the generic AdminService.
 */
export const SlotService = {
  /**
   * Fetches all blocked slots from the API.
   */
  async getBlockedSlots(): Promise<BlockedSlot[]> {
    try {
      // Use the generic getPaginatedData service, fetching a large limit to get all slots.
      const response = await AdminService.getPaginatedData<BlockedSlot>(
        "blocked_slot",
        1,
        1000 // Assuming you won't have more than 1000 blocked slots at once
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching blocked slots:", error);
      throw error;
    }
  },

  /**
   * Creates a new blocked slot.
   */
  async blockSlot(slotData: NewBlockedSlot): Promise<BlockedSlot> {
    try {
      // Handle 'ALL' day case for the API
      const payload = {
        ...slotData,
        time_slot: slotData.time_slot === "ALL" ? null : slotData.time_slot,
      };
      // Use the generic createRecord service
      return await AdminService.createRecord("blocked_slot", payload);
    } catch (error) {
      console.error("Error blocking slot:", error);
      throw error;
    }
  },

  /**
   * Deletes a blocked slot by its ID.
   */
  async unblockSlot(id: number): Promise<{ message: string }> {
    try {
      // Use the generic deleteRecords service, passing the ID in an array
      return await AdminService.deleteRecords("blocked_slot", [id]);
    } catch (error) {
      console.error("Error unblocking slot:", error);
      throw error;
    }
  },
};
