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
} from "lucide-react";
import { AdminService } from "@/utils/services";
import { exportToExcel } from "@/utils/exortToExcel"; // Adjust the import path
import { useRouter } from "next/navigation";

// #region Interface Definitions
interface Pet {
  id: number;
  user_id: number;
  name: string;
  type: "Dog" | "Cat";
  gender: string;
  is_neutered: boolean;
  breed: string;
  birthday: string;
  image: string;
  created_at: string;
}

interface Breed {
  id: number;
  name: string;
  type: "Dog" | "Cat";
}
// #endregion

const PetsPage: React.FC = () => {
  const router = useRouter();
  // Data and API states
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
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
  const [filters, setFilters] = useState({
    type: "all",
    gender: "all",
    is_neutered: "all",
  });

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<Pet | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "delete">(
    "view"
  );
  const [editedData, setEditedData] = useState<Partial<Pet>>({});

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const tableName = "pets";
  const columns = [
    { key: "image", label: "Image" },
    { key: "name", label: "Pet Name", editable: true },
    { key: "type", label: "Species", editable: true },
    { key: "breed", label: "Breed", editable: true },
    { key: "gender", label: "Gender", editable: true },
    { key: "is_neutered", label: "Neutered", editable: true },
    { key: "user_id", label: "Owner ID" },
  ];

  // Data fetching
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        // Fetch pets and breeds in parallel
        const [petsResponse, breedsResponse] = await Promise.all([
          AdminService.getPaginatedData<Pet>(tableName, page, pagination.limit),
          AdminService.getPaginatedData<Breed>("breeds", 1, 1000), // Fetch all breeds
        ]);
        setPets(petsResponse.data);
        setPagination(petsResponse.pagination);
        setBreeds(breedsResponse.data);
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

  // Client-side filtering and searching
  const filteredData = useMemo(() => {
    return pets.filter((pet) => {
      const searchMatch = searchTerm
        ? pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pet.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pet.breed.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const typeMatch = filters.type === "all" || pet.type === filters.type;
      const genderMatch =
        filters.gender === "all" || pet.gender === filters.gender;
      const neuteredMatch =
        filters.is_neutered === "all" ||
        (filters.is_neutered === "yes" && pet.is_neutered) ||
        (filters.is_neutered === "no" && !pet.is_neutered);
      return searchMatch && typeMatch && genderMatch && neuteredMatch;
    });
  }, [pets, searchTerm, filters]);

  // Filter breeds for the edit modal based on selected species
  const availableBreeds = useMemo(() => {
    if (!editedData.type) return [];
    return breeds.filter((b) => b.type === editedData.type);
  }, [breeds, editedData.type]);

  // Handlers
  const handleUpdate = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await AdminService.updateRecord(tableName, selectedItem.id, editedData);
      closeModal();
      fetchData(pagination.page);
    } catch (err) {
      alert("Failed to update record.");
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
    const formattedData = filteredData.map((pet) => ({
      ID: pet.id,
      "Pet Name": pet.name,
      Species: pet.type,
      Breed: pet.breed,
      Birthday: pet.birthday
        ? new Date(pet.birthday).toLocaleDateString()
        : "N/A",
      Gender: pet.gender,
      Neutered: pet.is_neutered ? "Yes" : "No",
      "Owner ID": pet.user_id,
      "Created At": new Date(pet.created_at).toLocaleString(),
    }));
    exportToExcel(formattedData, "Pet_Records");
  };

  // Modal and selection functions
  const openModal = (item: Pet | null, mode: "view" | "edit" | "delete") => {
    setSelectedItem(item);
    if (item) setEditedData({ ...item });
    setModalMode(mode);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
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

  const handleEditChange = (field: keyof Pet, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Pet Records
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all pet data efficiently.
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
                        placeholder="Search by name, species..."
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Species
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, type: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      value={filters.gender}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, gender: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Neutered
                    </label>
                    <select
                      value={filters.is_neutered}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          is_neutered: e.target.value,
                        }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() =>
                        setFilters({
                          type: "all",
                          gender: "all",
                          is_neutered: "all",
                        })
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
                  filteredData.map((pet) => (
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(pet.id)}
                          onChange={() => toggleSelectItem(pet.id)}
                          className="rounded"
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="p-4 whitespace-nowrap text-sm text-gray-700"
                        >
                          {col.key === "image" ? (
                            <img
                              src={pet.image || "https://placehold.co/40x40"}
                              alt={pet.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : col.key === "is_neutered" ? (
                            pet.is_neutered ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                                No
                              </span>
                            )
                          ) : (
                            pet[col.key] || "—"
                          )}
                        </td>
                      ))}
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(pet, "view")}
                            title="View"
                          >
                            <Eye className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => openModal(pet, "edit")}
                            title="Edit"
                          >
                            <Edit className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => openModal(pet, "delete")}
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-gray-500"
                    >
                      No pets found.
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {modalMode === "delete" ? (
              <div className="p-8 text-center flex flex-col items-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Confirm Deletion</h2>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete{" "}
                  {selectedItems.size > 0
                    ? `${selectedItems.size} pets`
                    : `"${selectedItem?.name}"`}
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
                    {modalMode === "view" ? "Pet Details" : "Edit Pet"}
                  </h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={editedData.image || "https://placehold.co/150x150"}
                      alt={editedData.name}
                      className="w-32 h-32 rounded-full object-cover border-4"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">
                        Pet Name
                      </label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.name}
                        </p>
                      ) : (
                        <input
                          type="text"
                          value={editedData.name || ""}
                          onChange={(e) =>
                            handleEditChange("name", e.target.value)
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Species
                      </label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.type}
                        </p>
                      ) : (
                        <select
                          value={editedData.type || ""}
                          onChange={(e) =>
                            handleEditChange("type", e.target.value)
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Breed</label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.breed}
                        </p>
                      ) : (
                        <select
                          value={editedData.breed || ""}
                          onChange={(e) =>
                            handleEditChange("breed", e.target.value)
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        >
                          <option value="">Select Breed</option>
                          {availableBreeds.map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Gender
                      </label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.gender}
                        </p>
                      ) : (
                        <select
                          value={editedData.gender || ""}
                          onChange={(e) =>
                            handleEditChange("gender", e.target.value)
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Birthday
                      </label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.birthday
                            ? new Date(editedData.birthday).toLocaleDateString()
                            : "—"}
                        </p>
                      ) : (
                        <input
                          type="date"
                          value={
                            editedData.birthday
                              ? editedData.birthday.split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            handleEditChange("birthday", e.target.value)
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md">
                          {editedData.is_neutered ? "Yes" : "No"}
                        </p>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            id="is_neutered"
                            checked={!!editedData.is_neutered}
                            onChange={(e) =>
                              handleEditChange("is_neutered", e.target.checked)
                            }
                            className="h-4 w-4 rounded"
                          />
                          <label
                            htmlFor="is_neutered"
                            className="text-sm font-medium"
                          >
                            Is Neutered?
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {modalMode === "edit" && (
                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center disabled:bg-green-40Ā00"
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

export default PetsPage;
