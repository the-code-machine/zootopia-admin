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
  Heart,
} from "lucide-react";
import { AdminService } from "@/utils/services"; // Adjust the import path
import { exportToExcel } from "@/utils/exortToExcel"; // Adjust the import path
import { useRouter } from "next/navigation";

// #region Interface Definitions
interface User {
  id: number;
  shopify_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  state: string; // e.g., 'enabled', 'disabled'
  total_spent: string;
  orders_count: number;
  tags: string;
  profile_image: string;
  created_at: string;
}

interface Pet {
  id: number;
  user_id: number;
  name: string;
  type: string;
  breed: string;
  image: string;
  birthday?: string;
  gender?: string;
  is_neutered?: boolean;
}
// #endregion

const PetParentsPage: React.FC = () => {
  const router = useRouter();
  // Data and API states
  const [users, setUsers] = useState<User[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]); // State to store all pets
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
  const [filters, setFilters] = useState({ state: "all" });

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "delete">(
    "view"
  );
  const [editedData, setEditedData] = useState<Partial<User>>({});

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const tableName = "users";
  const columns = [
    { key: "profile_image", label: "Image" },
    { key: "first_name", label: "First Name", editable: true },
    { key: "last_name", label: "Last Name", editable: true },
    { key: "email", label: "Email", editable: true },
    { key: "petsCount", label: "# of Pets" }, // New column
    { key: "created_at", label: "Joined" },
  ];

  // Data fetching
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        // Fetch users and all pets in parallel
        const [userResponse, petsResponse] = await Promise.all([
          AdminService.getPaginatedData<User>(
            tableName,
            page,
            pagination.limit
          ),
          AdminService.getPaginatedData<Pet>("pets", 1, 1000), // Fetch all pets
        ]);
        setUsers(userResponse.data);
        setPagination(userResponse.pagination);
        setAllPets(petsResponse.data);
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

  // Combine user data with their pet count
  const usersWithPetCount = useMemo(() => {
    return users.map((user) => ({
      ...user,
      petsCount: allPets.filter((pet) => pet.user_id === user.id).length,
    }));
  }, [users, allPets]);

  // Client-side filtering and searching
  const filteredData = useMemo(() => {
    return usersWithPetCount.filter((user) => {
      const searchMatch = searchTerm
        ? (user.first_name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          ) ||
          (user.last_name?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          ) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const stateMatch =
        filters.state === "all" || user.state === filters.state;
      return searchMatch && stateMatch;
    });
  }, [usersWithPetCount, searchTerm, filters]);

  // Handlers
  const handleUpdate = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const updatedData = {
        first_name: editedData.first_name || selectedItem.first_name,
        last_name: editedData.last_name || selectedItem.last_name,
        email: editedData.email || selectedItem.email,
      };
      await AdminService.updateRecord(tableName, selectedItem.id, updatedData);
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
    const formattedData = filteredData.map((user) => ({
      ID: user.id,
      "First Name": user.first_name,
      "Last Name": user.last_name,
      Email: user.email,
      Phone: user.phone,
      State: user.state,
      "Pets Count": user.petsCount,
      "Registration Date": new Date(user.created_at).toLocaleString(),
    }));
    exportToExcel(formattedData, "Pet_Parents_Records");
  };

  // Modal and selection functions
  const openModal = (item: User | null, mode: "view" | "edit" | "delete") => {
    setSelectedItem(item);
    if (item) setEditedData({ ...item });
    setModalMode(mode);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
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
  const getAge = (birthday) => {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Pet Parent Records
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all user data.
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
                        placeholder="Search by name, email..."
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
                      Status
                    </label>
                    <select
                      value={filters.state}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, state: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  <div className="flex items-end col-start-3 justify-end">
                    <button
                      onClick={() => setFilters({ state: "all" })}
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
                  filteredData.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(user.id)}
                          onChange={() => toggleSelectItem(user.id)}
                          className="rounded"
                        />
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="p-4 whitespace-nowrap text-sm text-gray-700"
                        >
                          {col.key === "profile_image" ? (
                            <img
                              src={
                                user.profile_image ||
                                "https://placehold.co/40x40"
                              }
                              alt={`${user.first_name} ${user.last_name}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : col.key === "created_at" ? (
                            new Date(user.created_at).toLocaleDateString()
                          ) : (
                            user[col.key] || "—"
                          )}
                        </td>
                      ))}
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(user, "view")}
                            title="View"
                          >
                            <Eye className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => openModal(user, "edit")}
                            title="Edit"
                          >
                            <Edit className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => openModal(user, "delete")}
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
                      No users found.
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
                    ? `${selectedItems.size} users`
                    : `"${selectedItem?.first_name} ${selectedItem?.last_name}"`}
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
                    {modalMode === "view" ? "User Details" : "Edit User"}
                  </h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={
                        editedData.profile_image ||
                        "https://placehold.co/150x150"
                      }
                      alt={`${editedData.first_name}`}
                      className="w-32 h-32 rounded-full object-cover border-4"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {columns
                      .filter(
                        (c) =>
                          c.key !== "profile_image" && c.key !== "petsCount"
                      )
                      .map((col) => (
                        <div key={col.key}>
                          <label className="block text-sm font-medium capitalize">
                            {col.label}
                          </label>
                          {modalMode === "view" || !col.editable ? (
                            <p className="mt-1 p-3 bg-gray-100 rounded-md min-h-[48px]">
                              {selectedItem?.[col.key] || "—"}
                            </p>
                          ) : (
                            <input
                              type="text"
                              value={editedData[col.key] || ""}
                              onChange={(e) =>
                                setEditedData((prev) => ({
                                  ...prev,
                                  [col.key]: e.target.value,
                                }))
                              }
                              className="mt-1 w-full p-2 border rounded-md"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  {/* Registered Pets Section */}
                  {modalMode === "view" && (
                    <div>
                      <h3 className="text-md font-semibold mb-2 border-t p-4 rounded">
                        Registered Pets
                      </h3>
                      <div className="space-y-3">
                        {allPets
                          .filter((p) => p.user_id === selectedItem?.id)
                          .map((pet) => (
                            <div
                              key={pet.id}
                              className="flex items-center gap-3 p-2 bg-gray-50 rounded-md"
                            >
                              <img
                                src={pet.image || "https://placehold.co/40x40"}
                                alt={pet.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div>
                                <p className="font-medium">{pet.name}</p>
                                <p className="text-xs text-gray-500">
                                  {pet.breed} ({pet.type}) | {pet.gender} |{" "}
                                  {getAge(pet.birthday)} year old |{" "}
                                  {pet.is_neutered ? "Neutered" : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        {allPets.filter((p) => p.user_id === selectedItem?.id)
                          .length === 0 && (
                          <p className="text-sm text-gray-500">
                            No pets registered for this user.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {modalMode === "edit" && (
                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={handleUpdate}
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

export default PetParentsPage;
