"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  X,
  Eye,
  Edit,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  UploadCloud,
  PlusCircle,
} from "lucide-react";
import { AdminService } from "@/utils/services"; // Adjust the import path
import { exportToExcel } from "@/utils/exortToExcel"; // Adjust the import path
import { useRouter } from "next/navigation";

// #region Interface Definitions
interface Pet {
  id: number;
  name: string;
  image: string;
}

interface VaccineRecordImage {
  id: number;
  vaccine_record_id: number;
  image_data: string;
}

interface VaccineHistoryPhoto {
  id: number;
  vaccine_history_id: number;
  type: string;
  image_url: string;
}

interface VaccineHistory {
  id: number;
  vaccine_id: number;
  pet_id: number;
  treatment_info: string;
  date_administered: string;
  photos?: VaccineHistoryPhoto[]; // Joined client-side
}

interface VaccineRecord {
  id: number;
  pet_id: number;
  vaccine_type: string;
  vaccine_name: string;
  vaccination_date: string;
  due_date: string | null;
  veterinarian: string | null;
  notes: string | null;
  images?: VaccineRecordImage[]; // Joined client-side
  history?: VaccineHistory[]; // Joined client-side
}

interface NewHistoryPhoto {
  type: string;
  imageData: string; // base64
}
// #endregion

const VaccineRecordsPage: React.FC = () => {
  const router = useRouter();
  // #region State Management
  // Data and API states
  const [records, setRecords] = useState<VaccineRecord[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({ petId: "all", vaccineType: "all" });

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<VaccineRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "delete">(
    "view"
  );
  const [editedData, setEditedData] = useState<Partial<VaccineRecord>>({});
  const [newHistoryEntry, setNewHistoryEntry] = useState({
    date_administered: "",
    treatment_info: "",
  });
  const [newHistoryPhotos, setNewHistoryPhotos] = useState<NewHistoryPhoto[]>(
    []
  );
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  // #endregion

  const tableName = "vaccine_records";
  const columns = [
    { key: "pet_name", label: "Pet Name" },
    { key: "vaccine_name", label: "Vaccine" },
    { key: "vaccination_date", label: "Date" },
    { key: "veterinarian", label: "Veterinarian" },
  ];

  // #region Data Fetching and Processing
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const [recordsRes, petsRes, imagesRes, historyRes, historyPhotosRes] =
          await Promise.all([
            AdminService.getPaginatedData<any>(
              tableName,
              page,
              pagination.limit
            ),
            AdminService.getPaginatedData<Pet>("pets", 1, 1000),
            AdminService.getPaginatedData<VaccineRecordImage>(
              "vaccine_record_images",
              1,
              1000
            ),
            AdminService.getPaginatedData<Omit<VaccineHistory, "photos">>(
              "vaccine_history",
              1,
              1000
            ),
            AdminService.getPaginatedData<VaccineHistoryPhoto>(
              "vaccine_history_photos",
              1,
              1000
            ),
          ]);

        const recordsWithData = recordsRes.data.map((record) => {
          const historyForRecord = historyRes.data
            .filter((h) => h.vaccine_id === record.id)
            .map((h) => ({
              ...h,
              photos: historyPhotosRes.data.filter(
                (p) => p.vaccine_history_id === h.id
              ),
            }));
          return {
            ...record,
            images: imagesRes.data.filter(
              (img) => img.vaccine_record_id === record.id
            ),
            history: historyForRecord,
          };
        });

        setRecords(recordsWithData);
        setAllPets(petsRes.data);
        setPagination(recordsRes.pagination);
      } catch (err) {
        setError("Failed to fetch records.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return records.filter((record) => {
      const pet = allPets.find((p) => p.id === record.pet_id);
      const searchMatch = searchTerm
        ? record.vaccine_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          pet?.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const petMatch =
        filters.petId === "all" || String(record.pet_id) === filters.petId;
      const typeMatch =
        filters.vaccineType === "all" ||
        record.vaccine_type === filters.vaccineType;
      return searchMatch && petMatch && typeMatch;
    });
  }, [records, allPets, searchTerm, filters]);
  // #endregion

  // #region Handlers
  const handleAddHistory = async () => {
    if (
      !selectedItem ||
      !newHistoryEntry.date_administered ||
      !newHistoryEntry.treatment_info
    ) {
      setModalError("Please provide both a date and treatment information.");
      return;
    }
    setIsSaving(true);
    setModalError(null);
    try {
      // 1. Create new history entry
      const createdHistory = await AdminService.createRecord<VaccineHistory>(
        "vaccine_history",
        {
          ...newHistoryEntry,
          vaccine_id: selectedItem.id,
          pet_id: selectedItem.pet_id,
        }
      );

      // 2. Create photos for the new history entry
      if (newHistoryPhotos.length > 0) {
        for (const photo of newHistoryPhotos) {
          await AdminService.createRecord("vaccine_history_photos", {
            vaccine_history_id: createdHistory.id,
            type: photo.type,
            image_url: photo.imageData, // Assuming backend handles base64 string
          });
        }
      }

      closeModal();
      fetchData(pagination.page);
    } catch (err) {
      console.error("Failed to save changes:", err);
      setModalError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ids: number[]) => {
    setIsDeleting(true);
    try {
      await AdminService.deleteRecords(tableName, ids);
      setSelectedItems(new Set());
      window.location.reload();

      closeModal();

      await fetchData(1);
    } catch (err) {
      alert(`Failed to delete records.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const formattedData = filteredData.map((record) => {
      const pet = allPets.find((p) => p.id === record.pet_id);
      return {
        "Record ID": record.id,
        "Pet Name": pet?.name || "N/A",
        "Vaccine Name": record.vaccine_name,
        "Vaccination Date": new Date(
          record.vaccination_date
        ).toLocaleDateString(),
        "Due Date": record.due_date
          ? new Date(record.due_date).toLocaleDateString()
          : "N/A",
        Veterinarian: record.veterinarian,
      };
    });
    exportToExcel(formattedData, "Vaccine_Records");
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const photoType = prompt("Enter photo type (e.g., Bill, X-Ray):", "Etc");
    if (!photoType) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewHistoryPhotos((prev) => [
          ...prev,
          { type: photoType, imageData: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };
  // #endregion

  // #region Modal and Selection Functions
  const openModal = (
    item: VaccineRecord | null,
    mode: "view" | "edit" | "delete"
  ) => {
    setSelectedItem(item);
    if (item) setEditedData({ ...item });
    setModalMode(mode);
    setIsModalOpen(true);
    setModalError(null);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setNewHistoryEntry({ date_administered: "", treatment_info: "" });
    setNewHistoryPhotos([]);
    setModalError(null);
  };
  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedItems(newSelected);
  };
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map((item) => item.id)));
    }
  };
  // #endregion

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Vaccine Records
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all vaccine and visit history.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedItems.size > 0 ? (
                  <button
                    onClick={() => openModal(null, "delete")}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete ({selectedItems.size})</span>
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by vaccine, pet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-64"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
                    >
                      <Filter className="w-5 h-5 text-gray-500" />
                      <span>Filters</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          showFilters ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-lg shadow-sm hover:bg-cyan-700"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {showFilters && (
              <div className="bg-gray-100 rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Pet
                    </label>
                    <select
                      value={filters.petId}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, petId: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All Pets</option>
                      {allPets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Vaccine Type
                    </label>
                    <select
                      value={filters.vaccineType}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          vaccineType: e.target.value,
                        }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All Types</option>
                      {/* This could be populated dynamically */}
                      <option value="Core">Core</option>
                      <option value="Non-Core">Non-Core</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() =>
                        setFilters({ petId: "all", vaccineType: "all" })
                      }
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 rounded-md"
                    >
                      <X className="w-5 h-5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 mt-6">
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        selectedItems.size === filteredData.length &&
                        filteredData.length > 0
                      }
                      className="rounded"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="p-4 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="p-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16"
                    >
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-red-500"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((record) => {
                    const pet = allPets.find((p) => p.id === record.pet_id);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(record.id)}
                            onChange={() => toggleSelectItem(record.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 text-sm text-gray-700 flex items-center gap-3">
                          <img
                            src={pet?.image || "https://placehold.co/40x40"}
                            alt={pet?.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {pet?.name || "N/A"}
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {record.vaccine_name}
                        </td>
                        <td className="p-4 text-sm text-gray-700">
                          {new Date(
                            record.vaccination_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {record.veterinarian || "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(record, "view")}
                              title="View"
                            >
                              <Eye className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => openModal(record, "edit")}
                              title="Edit"
                            >
                              <Edit className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => openModal(record, "delete")}
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            {modalMode === "delete" ? (
              <div className="p-8 text-center flex flex-col items-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Confirm Deletion</h2>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete{" "}
                  {selectedItems.size > 0
                    ? `${selectedItems.size} records`
                    : `this record`}
                  ? This cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 border rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(
                        selectedItems.size > 0
                          ? Array.from(selectedItems)
                          : [selectedItem!.id]
                      )
                    }
                    disabled={isDeleting}
                    className="px-6 py-2 bg-red-600 text-white rounded-md flex items-center disabled:bg-red-400"
                  >
                    {isDeleting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">
                    {modalMode === "view"
                      ? "Vaccine Details"
                      : "Add Visit History"}
                  </h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                  {/* Pet Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={
                        allPets.find((p) => p.id === selectedItem?.pet_id)
                          ?.image || "https://placehold.co/60x60"
                      }
                      alt="pet"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-bold text-lg">
                        {
                          allPets.find((p) => p.id === selectedItem?.pet_id)
                            ?.name
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedItem?.vaccine_name} -{" "}
                        {new Date(
                          selectedItem!.vaccination_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {/* Main Record Photos */}
                  <div>
                    <h3 className="text-md font-semibold mb-2">
                      Main Record Photos (User Uploaded)
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {selectedItem?.images?.length ? (
                        selectedItem.images.map((img, i) => (
                          <img
                            key={i}
                            src={img.image_data}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">
                          No photos for this record.
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Existing History */}
                  <div>
                    <h3 className="text-md font-semibold mb-2">
                      Visit History
                    </h3>
                    <div className="space-y-4">
                      {selectedItem?.history?.length ? (
                        selectedItem.history.map((h) => (
                          <div
                            key={h.id}
                            className="p-4 bg-gray-100 rounded-lg"
                          >
                            <p className="font-bold">
                              {new Date(
                                h.date_administered
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-sm my-2">{h.treatment_info}</p>
                            <div className="flex flex-wrap gap-2">
                              {h.photos?.map((p, i) => (
                                <div key={i} className="relative">
                                  <img
                                    src={p.image_url}
                                    className="w-20 h-20 object-cover rounded-md"
                                  />
                                  <span className="absolute top-0 left-0 bg-green-600 text-white text-xs px-1.5 rounded-tl-md rounded-br-md">
                                    {p.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">
                          No visit history recorded yet.
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Add New History (Edit Mode Only) */}
                  {modalMode === "edit" && (
                    <div className="p-6 border-t rounded-2xl">
                      <h3 className="text-lg font-bold mb-4 text-cyan-700">
                        Add New Hospital Visit
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Visit Date
                          </label>
                          <input
                            type="date"
                            value={newHistoryEntry.date_administered}
                            onChange={(e) =>
                              setNewHistoryEntry((prev) => ({
                                ...prev,
                                date_administered: e.target.value,
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Treatment Information
                          </label>
                          <textarea
                            value={newHistoryEntry.treatment_info}
                            onChange={(e) =>
                              setNewHistoryEntry((prev) => ({
                                ...prev,
                                treatment_info: e.target.value,
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded-md h-24"
                            placeholder="Enter treatment notes..."
                          ></textarea>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Add Photos for this Visit
                          </label>
                          <div className="mt-2 grid grid-cols-3 gap-4">
                            {newHistoryPhotos.map((photo, i) => (
                              <div key={i} className="relative">
                                <img
                                  src={photo.imageData}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1.5 rounded-full">
                                  {photo.type}
                                </span>
                              </div>
                            ))}
                            <label className="cursor-pointer w-full h-24 bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-200">
                              <UploadCloud className="w-8 h-8" />
                              <span className="text-xs mt-1">Add Photo</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {modalError && (
                    <p className="text-red-500 text-sm text-center">
                      {modalError}
                    </p>
                  )}
                </div>
                {modalMode === "edit" && (
                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={handleAddHistory}
                      disabled={isSaving}
                      className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center disabled:bg-green-400"
                    >
                      {isSaving && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}{" "}
                      Save Changes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaccineRecordsPage;
