import { supabase } from "@/utils/supabaseClient";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";

interface PreviewClient {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_normalized: string;
  visiting_type: string | null;
  avg_weekly_visits: number | null;
  last_appt: string | null;
  total_appointments: number;
  days_since_last_visit: number;
  days_overdue: number;
  expected_visit_interval_days: number;
  score: number;
  date_last_sms_sent: string | null;
}

interface PreviewStats {
  total_selected: number;
  breakdown: Record<string, number>;
  avg_score: string;
  avg_days_overdue: string;
  avg_days_since_last_visit: string;
}

interface AllClient {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_normalized: string | null;
  email: string | null;
  phone: string | null;
  last_appt: string | null;
  total_appointments: number;
}

interface RecipientPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  messageTitle: string;
  messageId: string | null;
  previewClients: PreviewClient[];
  deselectedPreviewClients: PreviewClient[];
  previewStats: PreviewStats | null;
  maxClients: number;
  initialTotalUnselectedClients: number;
  clientLimit: number;
}

type TabType = "client-list" | "deselected" | "selected";

export default function RecipientPreviewModal({
  isOpen,
  onClose,
  onRefresh,
  messageTitle,
  messageId,
  previewClients,
  deselectedPreviewClients,
  previewStats,
  maxClients,
  initialTotalUnselectedClients,
  clientLimit,
}: RecipientPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("client-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deselectedClients, setDeselectedClients] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<any[]>([]);

  const [batchSelectedForAction, setBatchSelectedForAction] = useState<
    Set<string>
  >(new Set());
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);
  const [batchActionType, setBatchActionType] = useState<
    "select" | "deselect" | null
  >(null);

  // All clients pagination
  const [allClients, setAllClients] = useState<PreviewClient[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingAllClients, setLoadingAllClients] = useState(false);

  const [showDeselectModal, setShowDeselectModal] = useState(false);
  const [showReselectModal, setShowReselectModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showUnselectModal, setShowUnselectModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [totalUnselectedClients, setTotalUnselectedClients] = useState(
    initialTotalUnselectedClients
  );

  const [pendingDeselectPhone, setPendingDeselectPhone] = useState<
    string | null
  >(null);
  const [pendingDeselectName, setPendingDeselectName] = useState<string>("");
  const [pendingReselectPhone, setPendingReselectPhone] = useState<
    string | null
  >(null);
  const [pendingReselectName, setPendingReselectName] = useState<string>("");
  const [pendingSelectClient, setPendingSelectClient] = useState<any | null>(
    null
  );
  const [pendingUnselectClient, setPendingUnselectClient] = useState<
    any | null
  >(null);

  const [clientListPage, setClientListPage] = useState(1);
  const [clientListTotalPages, setClientListTotalPages] = useState(1);
  const CLIENT_LIST_PER_PAGE = 100;

  // One-time sms client
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customFirstName, setCustomFirstName] = useState("");
  const [customLastName, setCustomLastName] = useState("");
  const [customPhone, setCustomPhone] = useState("");

  const [showIncreaseLimitModal, setShowIncreaseLimitModal] = useState(false);

  const [otherClientsPage, setOtherClientsPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (activeTab === "selected") {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Load deselected and selected clients when modal opens
  useEffect(() => {
    if (isOpen && messageId) {
      loadDeselectedClients();
      loadSelectedClients();
    }
  }, [isOpen, messageId]);

  // Load all clients when on selected tab
  useEffect(() => {
    if (activeTab === "deselected") {
      loadAllClients();
    }
  }, [activeTab, currentPage, debouncedSearch, otherClientsPage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("client-list");
      setSearchQuery("");
      setDebouncedSearch("");
      setCurrentPage(1);
      setClientListPage(1);
    }
  }, [isOpen]);

  // Add this useEffect after your other useEffects
  useEffect(() => {
    if (activeTab === "client-list") {
      const selectedPhones = new Set(
        selectedClients.map((c) => c.phone_normalized)
      );

      // Get all non-deselected clients
      let filteredPreview = previewClients.filter((client) => {
        const isDeselected = deselectedClients.includes(
          client.phone_normalized
        );
        return !isDeselected;
      });

      // Apply maxClients limit first
      const limitedClients = filteredPreview.slice(0, maxClients);

      // Then apply search filter across ALL limited clients
      let searchedClients = limitedClients;
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        searchedClients = limitedClients.filter((client) => {
          const fullName =
            `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase();
          const phone = client.phone_normalized.toLowerCase();
          return fullName.includes(search) || phone.includes(search);
        });
      }

      const selectedFromPreview = searchedClients.filter((c) =>
        selectedPhones.has(c.phone_normalized)
      );
      const notSelected = searchedClients.filter(
        (c) => !selectedPhones.has(c.phone_normalized)
      );

      const allFilteredClients = [...selectedFromPreview, ...notSelected];
      
      const totalPages = Math.max(
        1,
        Math.ceil(allFilteredClients.length / CLIENT_LIST_PER_PAGE)
      );

      setClientListTotalPages(totalPages);
    }
  }, [
    activeTab,
    previewClients,
    deselectedClients,
    selectedClients,
    debouncedSearch,
    CLIENT_LIST_PER_PAGE,
    maxClients,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setBatchSelectedForAction(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    setBatchSelectedForAction(new Set());
  }, [activeTab]);

  useEffect(() => {
    setTotalUnselectedClients(initialTotalUnselectedClients);
  }, [initialTotalUnselectedClients]);

  const toggleBatchSelection = (phone: string) => {
    const newSet = new Set(batchSelectedForAction);
    if (newSet.has(phone)) {
      newSet.delete(phone);
    } else {
      newSet.add(phone);
    }
    setBatchSelectedForAction(newSet);
  };

  // Handle batch confirm button
  const handleBatchConfirm = async (actionType: "select" | "deselect") => {
    if (batchSelectedForAction.size === 0) {
      Alert.alert(
        "No client selected",
        "Please select at least one client"
      );
      return;
    }

    if (!(await checkMessageExistsInDatabase())) {
      Alert.alert(
        "Save Required",
        "Please save this message as a draft first"
      );
      return;
    }

    setBatchActionType(actionType);
    setShowBatchConfirmModal(true);
  };

  // Confirm batch action
  const confirmBatchAction = async () => {
    if (
      !messageId ||
      batchSelectedForAction.size === 0 ||
      !batchActionType
    )
      return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const phonesToProcess = Array.from(batchSelectedForAction);

      if (batchActionType === "deselect") {
        // Add to deselected list
        const updatedDeselected = [
          ...new Set([...deselectedClients, ...phonesToProcess]),
        ];

        // Remove from selected list
        const updatedSelected = selectedClients.filter(
          (c) => !phonesToProcess.includes(c.phone_normalized)
        );

        const { error } = await supabase
          .from("sms_scheduled_messages")
          .update({
            deselected_clients: updatedDeselected,
            selected_clients: updatedSelected,
          })
          .eq("id", messageId)
          .eq("user_id", user.id);

        if (error) throw error;

        setDeselectedClients(updatedDeselected);
        setSelectedClients(updatedSelected);
        Toast.show({
          type: "success",
          text1: `${phonesToProcess.length} client${phonesToProcess.length > 1 ? "s" : ""} deselected`,
        });
      } else {
        // When selecting from Other Clients tab
        const phonesToProcess = Array.from(batchSelectedForAction);

        // Remove from deselected list
        const updatedDeselected = deselectedClients.filter(
          (phone) => !phonesToProcess.includes(phone)
        );

        // Only add to selected_clients if they were NOT manually deselected
        const clientsToAdd = allClients
          .filter((c) => {
            const phone = c.phone_normalized || "";
            const wasManuallyDeselected = deselectedClients.includes(phone);

            // // console.log(
            //   `Phone ${phone}: wasManuallyDeselected=${wasManuallyDeselected}`
            // );

            return phonesToProcess.includes(phone) && !wasManuallyDeselected;
          })
          .map((c) => ({
            client_id: c.client_id,
            first_name: c.first_name,
            last_name: c.last_name,
            phone_normalized: c.phone_normalized,
          }));

        // console.log("Clients to add:", clientsToAdd);

        const updatedSelected = [...selectedClients, ...clientsToAdd];

        const { error } = await supabase
          .from("sms_scheduled_messages")
          .update({
            selected_clients: updatedSelected,
            deselected_clients: updatedDeselected,
          })
          .eq("id", messageId)
          .eq("user_id", user.id);

        if (error) throw error;

        setSelectedClients(updatedSelected);
        setDeselectedClients(updatedDeselected);
        Toast.show({
          type: "success",
          text1: `${phonesToProcess.length} client${phonesToProcess.length > 1 ? "s" : ""} selected`,
        });
      }

      // Clear batch selection and close modal
      setBatchSelectedForAction(new Set());
      setShowBatchConfirmModal(false);
      setBatchActionType(null);

      // Close and refresh the modal
      onClose();
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to process batch action:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update clients",
      });
      setShowBatchConfirmModal(false);
      setBatchActionType(null);
    }
  };

  const loadDeselectedClients = async () => {
    if (!messageId) return;

    try {
      const { data, error } = await supabase
        .from("sms_scheduled_messages")
        .select("deselected_clients")
        .eq("id", messageId)
        .maybeSingle();

      if (error) throw error;

      setDeselectedClients(data?.deselected_clients || []);
    } catch (error) {
      console.error("Failed to load deselected clients:", error);
    }
  };

  const loadSelectedClients = async () => {
    if (!messageId) return;

    try {
      const { data, error } = await supabase
        .from("sms_scheduled_messages")
        .select("selected_clients")
        .eq("id", messageId)
        .maybeSingle();

      if (error) throw error;

      setSelectedClients(data?.selected_clients || []);
    } catch (error) {
      console.error("Failed to load selected clients:", error);
    }
  };

  // Load all OTHER clients for Deselected Clients tab (NOT in algorithm)
  const loadAllClients = async () => {
    setLoadingAllClients(true);

    try {
      const clients = deselectedPreviewClients || [];

      // Put manually deselected ones at the top
      const manuallyDeselected = clients.filter((c: any) =>
        deselectedClients.includes(c.phone_normalized || "")
      );

      const notDeselected = clients.filter(
        (c: any) => !deselectedClients.includes(c.phone_normalized || "")
      );

      const sortedClients = [...manuallyDeselected, ...notDeselected];

      // Apply search filter to ALL clients
      let searchedClients = sortedClients;
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        searchedClients = sortedClients.filter((client) => {
          const fullName =
            `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase();
          const phone = (client.phone_normalized || "").toLowerCase();
          return fullName.includes(search) || phone.includes(search);
        });
      }

      // Calculate pagination based on search results
      const totalPages = Math.ceil(searchedClients.length / CLIENT_LIST_PER_PAGE);
      const startIndex = (otherClientsPage - 1) * CLIENT_LIST_PER_PAGE;
      const endIndex = startIndex + CLIENT_LIST_PER_PAGE;
      const paginatedClients = searchedClients.slice(startIndex, endIndex);

      setAllClients(paginatedClients);
      setTotalUnselectedClients(searchedClients.length); // Show search result count
      setTotalPages(totalPages);
      setCurrentPage(otherClientsPage);
    } catch (error) {
      console.error("Failed to load all clients:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load clients",
      });
    } finally {
      setLoadingAllClients(false);
    }
  };

  const checkMessageExistsInDatabase = async (): Promise<boolean> => {
    if (!messageId) {
      Toast.show({
        type: "error",
        text1: "Please save this message as a draft first",
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("sms_scheduled_messages")
        .select("id")
        .eq("id", messageId)
        .maybeSingle();

      if (error || !data) {
        Toast.show({
          type: "error",
          text1: "Please save this message as a draft first",
        });
        return false;
      }

      return true;
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Please save this message as a draft first",
      });
      return false;
    }
  };

  const handleDeselectRequest = async (phone: string, name: string) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingDeselectPhone(phone);
    setPendingDeselectName(name);
    setShowDeselectModal(true);
  };

  const handleRemoveFromDeselected = async (client: any) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingReselectPhone(client.phone_normalized || "");
    setPendingReselectName(
      `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
        "Unknown Client"
    );
    setShowReselectModal(true);
  };

  const handleAddToDeselected = async (client: AllClient) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingDeselectPhone(client.phone_normalized || "");
    setPendingDeselectName(
      `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
        "Unknown Client"
    );
    setShowDeselectModal(true);
  };

  const handleMoveToDeselected = async (phone: string, name: string) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingDeselectPhone(phone);
    setPendingDeselectName(name);
    setShowDeselectModal(true);
  };

  const confirmDeselect = async () => {
    if (!pendingDeselectPhone || !messageId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const clientToDeselect = selectedClients.find(
        (c) => c.phone_normalized === pendingDeselectPhone
      );
      const isCustomClient = clientToDeselect?.is_custom;

      let updatedDeselected = deselectedClients;
      let updatedSelected = selectedClients;

      if (isCustomClient) {
        updatedSelected = selectedClients.filter(
          (c) => c.phone_normalized !== pendingDeselectPhone
        );
      } else {
        updatedDeselected = [...deselectedClients, pendingDeselectPhone];
        updatedSelected = selectedClients.filter(
          (c) => c.phone_normalized !== pendingDeselectPhone
        );
      }

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({
          deselected_clients: updatedDeselected,
          selected_clients: updatedSelected,
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setDeselectedClients(updatedDeselected);
      setSelectedClients(updatedSelected);
      Toast.show({
        type: "success",
        text1: isCustomClient
          ? "One-time recipient removed"
          : "Client moved to deselected list",
      });
    } catch (error) {
      console.error("Failed to deselect client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to deselect client",
      });
    } finally {
      setShowDeselectModal(false);
      setPendingDeselectPhone(null);
      setPendingDeselectName("");
    }
  };

  const confirmReselect = async () => {
    if (!pendingReselectPhone || !messageId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // console.log("Removing phone:", pendingReselectPhone);
      // console.log("Current deselected:", deselectedClients);
      // console.log("Current selected:", selectedClients);

      const updatedDeselected = deselectedClients.filter(
        (phone) => phone !== pendingReselectPhone
      );

      const updatedSelected = selectedClients.filter(
        (c) => c.phone_normalized !== pendingReselectPhone
      );

      // console.log("Updated deselected:", updatedDeselected);
      // console.log("Updated selected:", updatedSelected);

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({
          deselected_clients: updatedDeselected,
          selected_clients: updatedSelected,
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      // console.log("Database updated successfully");

      setDeselectedClients(updatedDeselected);
      setSelectedClients(updatedSelected);

      Toast.show({
        type: "success",
        text1: "Client removed from deselected list",
      });

      onClose();
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to reselect client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to reselect client",
      });
    } finally {
      setShowReselectModal(false);
      setPendingReselectPhone(null);
      setPendingReselectName("");
    }
  };

  const confirmSelect = async () => {
    if (!pendingSelectClient || !messageId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const clientToAdd = {
        client_id: pendingSelectClient.client_id,
        first_name: pendingSelectClient.first_name,
        last_name: pendingSelectClient.last_name,
        phone_normalized: pendingSelectClient.phone_normalized,
      };

      const updatedSelected = [...selectedClients, clientToAdd];

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({ selected_clients: updatedSelected })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setSelectedClients(updatedSelected);

      if (activeTab === "selected") {
        loadAllClients();
      }

      Toast.show({
        type: "success",
        text1: "Client added to selected list",
      });
    } catch (error) {
      console.error("Failed to select client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to select client",
      });
    } finally {
      setShowSelectModal(false);
      setPendingSelectClient(null);
    }
  };

  const confirmUnselect = async () => {
    if (!pendingUnselectClient || !messageId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const updatedSelected = selectedClients.filter(
        (c) => c.phone_normalized !== pendingUnselectClient.phone_normalized
      );

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({ selected_clients: updatedSelected })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setSelectedClients(updatedSelected);

      if (activeTab === "selected") {
        loadAllClients();
      }

      Toast.show({
        type: "success",
        text1: "Client removed from selected list",
      });
    } catch (error) {
      console.error("Failed to unselect client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to unselect client",
      });
    } finally {
      setShowUnselectModal(false);
      setPendingUnselectClient(null);
    }
  };

  const getFilteredClients = () => {
    if (clientLimit === 0 && !debouncedSearch) {
      return [];
    }

    if (activeTab === "client-list") {
      // Start with all non-deselected clients
      let filteredPreview = previewClients.filter((client) => {
        const isDeselected = deselectedClients.includes(
          client.phone_normalized
        );
        return !isDeselected;
      });

      // First respect maxClients limit (before search)
      const limitedClients = filteredPreview.slice(0, maxClients);

      // Then apply search filter - this searches through ALL clients in the limit
      let searchedClients = limitedClients;
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        searchedClients = limitedClients.filter((client) => {
          const fullName =
            `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase();
          const phone = client.phone_normalized.toLowerCase();
          return fullName.includes(search) || phone.includes(search);
        });
      }

      // console.log('Filtered and searched clients:', searchedClients.length);

      // Finally apply pagination to the search results
      const start = (clientListPage - 1) * CLIENT_LIST_PER_PAGE;
      const paginated = searchedClients.slice(start, start + CLIENT_LIST_PER_PAGE);
      // console.log('Paginated clients:', paginated.length, 'from', start, 'to', start + CLIENT_LIST_PER_PAGE);
      return paginated;
    }

    if (activeTab === "deselected") {
      // console.log('Deselected tab, searching through all other clients');
      
      // Get ALL other clients (not just current page)
      const allOtherClients = deselectedPreviewClients || [];
      
      // Put manually deselected ones at the top
      const manuallyDeselected = allOtherClients.filter((c: any) =>
        deselectedClients.includes(c.phone_normalized || "")
      );

      const notDeselected = allOtherClients.filter(
        (c: any) => !deselectedClients.includes(c.phone_normalized || "")
      );

      const sortedClients = [...manuallyDeselected, ...notDeselected];
      
      // Apply search across ALL other clients
      let searchedClients = sortedClients;
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        searchedClients = sortedClients.filter((client) => {
          const fullName =
            `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase();
          const phone = (client.phone_normalized || "").toLowerCase();
          return fullName.includes(search) || phone.includes(search);
        });
      }

      // Then paginate the search results
      const startIndex = (otherClientsPage - 1) * CLIENT_LIST_PER_PAGE;
      const endIndex = startIndex + CLIENT_LIST_PER_PAGE;
      return searchedClients.slice(startIndex, endIndex);
    }

    // console.log('No tab matched, returning empty array');
    return [];
  };

  const handleSelectRequest = async (client: AllClient) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingSelectClient(client);
    setShowSelectModal(true);
  };

  const handleUnselectRequest = async (client: any) => {
    if (!(await checkMessageExistsInDatabase())) return;

    setPendingUnselectClient(client);
    setShowUnselectModal(true);
  };

  const handleResetSelections = async () => {
    if (!messageId) {
      Toast.show({
        type: "error",
        text1: "Please save this message as a draft first",
      });
      return;
    }

    setShowResetModal(true);
  };

  const confirmReset = async () => {
    if (!messageId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({
          deselected_clients: [],
          selected_clients: [],
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setDeselectedClients([]);
      setSelectedClients([]);
      setBatchSelectedForAction(new Set());

      Toast.show({
        type: "success",
        text1: "All selections reset",
      });

      setShowResetModal(false);

      if (onRefresh) {
        onClose();
        setTimeout(() => {
          onRefresh();
        }, 100);
      }
    } catch (error) {
      console.error("Failed to reset selections:", error);
      Toast.show({
        type: "error",
        text1: "Failed to reset selections",
      });
      setShowResetModal(false);
    }
  };

  const validateCustomPhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const handleAddCustomClient = async () => {
    if (!customFirstName.trim() || !customLastName.trim()) {
      Toast.show({
        type: "error",
        text1: "Please enter both first and last name",
      });
      return;
    }

    if (!validateCustomPhone(customPhone)) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid 10-digit phone number",
      });
      return;
    }

    const phoneNormalized = "+1" + customPhone.replace(/\D/g, "");

    const isDuplicateSelected = selectedClients.some(
      (c) => c.phone_normalized === phoneNormalized
    );

    if (isDuplicateSelected) {
      Toast.show({
        type: "error",
        text1: "This phone number is already in your selected clients",
      });
      return;
    }

    const isDuplicatePreview = previewClients.some(
      (c) => c.phone_normalized === phoneNormalized
    );

    if (isDuplicatePreview) {
      Toast.show({
        type: "error",
        text1: "This client is already in your client list",
      });
      return;
    }

    if (!messageId) {
      Toast.show({
        type: "error",
        text1: "Please save this message as a draft first",
      });
      return;
    }

    if (clientLimit === 0 && selectedClients.length > 0) {
      setShowAddCustomModal(false);
      setShowIncreaseLimitModal(true);
      return;
    }

    if (clientLimit === 0 && selectedClients.length === 0) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("available_credits")
          .eq("user_id", user.id)
          .single();

        if (!profile || profile.available_credits < 1) {
          Toast.show({
            type: "error",
            text1:
              "You need at least 1 credit available to add a one-time recipient when max clients is 0",
          });
          return;
        }

        const { error: updateError } = await supabase
          .from("sms_scheduled_messages")
          .update({ message_limit: 1 })
          .eq("id", messageId)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Failed to update message limit:", updateError);
          Toast.show({
            type: "error",
            text1: "Failed to update message limit",
          });
          return;
        }

        Toast.show({
          type: "success",
          text1: "Message limit increased to 1 for one-time recipient",
        });
      } catch (error) {
        console.error("Failed to check credits:", error);
        Toast.show({
          type: "error",
          text1: "Failed to verify credits",
        });
        return;
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const customClient = {
        client_id: `custom_${Date.now()}`,
        first_name: customFirstName.trim(),
        last_name: customLastName.trim(),
        phone_normalized: phoneNormalized,
        is_custom: true,
      };

      const updatedSelected = [...selectedClients, customClient];

      const { error } = await supabase
        .from("sms_scheduled_messages")
        .update({ selected_clients: updatedSelected })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setSelectedClients(updatedSelected);
      Toast.show({
        type: "success",
        text1: "One-time recipient added successfully",
      });

      setCustomFirstName("");
      setCustomLastName("");
      setCustomPhone("");
      setShowAddCustomModal(false);

      onClose();
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to add custom client:", error);
      Toast.show({
        type: "error",
        text1: "Failed to add recipient",
      });
    }
  };

  const filteredClients = getFilteredClients();
  
  // Calculate active client count respecting maxClients
  const nonDeselectedClients = previewClients.filter(
    (client) => !deselectedClients.includes(client.phone_normalized)
  );
  const activeClientCount = Math.min(nonDeselectedClients.length, maxClients);

  const isClientSelected = (phone: string | null) => {
    if (!phone) return false;
    return selectedClients.some((c) => c.phone_normalized === phone);
  };

  const getVisitingTypeStyle = (type: string | null) => {
    switch (type) {
      case "consistent":
        return "bg-green-500/20 text-green-400";
      case "semi-consistent":
        return "bg-blue-500/20 text-blue-400";
      case "easy-going":
        return "bg-yellow-500/20 text-yellow-400";
      case "rare":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const capitalize = (str: string | null) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 items-center justify-center p-3">
        <Pressable 
          className="absolute inset-0" 
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }} 
        />
        <View className="bg-[#1a1a1a] border border-white/10 rounded-xl w-[95%] h-[75%] overflow-hidden">
          {/* Header */}
          <View className="px-4 py-3 border-b border-white/10">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1">
                <Users size={18} color="#7dd3fc" />
                <Text className="text-base font-bold text-white flex-1" numberOfLines={1}>
                  {messageTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 rounded-full active:bg-white/10">
                <X size={20} color="#bdbdbd" />
              </TouchableOpacity>
            </View>
            {previewStats && (
              <Text className="text-xs text-[#bdbdbd] mt-1">
                {clientLimit === 0 ? 0 : activeClientCount} active • {selectedClients.length} selected
              </Text>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row border-b border-white/10">
            <TouchableOpacity
              onPress={() => setActiveTab("client-list")}
              className={`flex-1 px-4 py-2.5 items-center ${activeTab === "client-list" ? "border-b-2 border-sky-300" : ""}`}
            >
              <Text className={`text-sm font-semibold ${activeTab === "client-list" ? "text-sky-300" : "text-[#bdbdbd]"}`}>
                Clients ({activeClientCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("deselected")}
              className={`flex-1 px-4 py-2.5 items-center ${activeTab === "deselected" ? "border-b-2 border-sky-300" : ""}`}
            >
              <Text className={`text-sm font-semibold ${activeTab === "deselected" ? "text-sky-300" : "text-[#bdbdbd]"}`}>
                Other ({totalUnselectedClients > 0 ? totalUnselectedClients : '...'})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-4 py-2.5 border-b border-white/10">
            <View className="relative">
              <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <Search size={16} color="#bdbdbd" />
              </View>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or phone..."
                placeholderTextColor="#bdbdbd80"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white"
              />
            </View>
          </View>

          {/* Pagination - Client List */}
          {activeTab === "client-list" && (
            <View className="bg-[#1a1a1a] border-b border-white/10 px-4 py-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-sm text-[#bdbdbd]">{filteredClients.length} clients</Text>
                <View className="flex-row gap-2 items-center">
                  <TouchableOpacity onPress={() => setShowAddCustomModal(true)} className="px-3 py-1.5 rounded-lg bg-lime-300/20 border border-lime-300/30">
                    <Text className="text-xs font-semibold text-lime-300">Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResetSelections} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <Text className="text-xs font-semibold text-red-400">Reset</Text>
                  </TouchableOpacity>
                  {batchSelectedForAction.size > 0 && (
                    <>
                      <TouchableOpacity onPress={() => setBatchSelectedForAction(new Set())} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Text className="text-xs font-semibold text-[#bdbdbd]">Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleBatchConfirm("deselect")} className="px-3 py-1.5 rounded-lg bg-amber-300/20 border border-amber-300/30">
                        <Text className="text-xs font-semibold text-amber-300">-{batchSelectedForAction.size}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {clientListTotalPages > 1 && (
                    <>
                      <View className="w-px h-6 bg-white/10" />
                      <TouchableOpacity onPress={() => setClientListPage((p) => Math.max(1, p - 1))} disabled={clientListPage === 1} className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50">
                        <ChevronLeft size={16} color="#ffffff" />
                      </TouchableOpacity>
                      <Text className="text-xs text-white font-medium px-2">
                        {clientListPage} / {clientListTotalPages}
                      </Text>
                      <TouchableOpacity onPress={() => setClientListPage((p) => Math.min(clientListTotalPages, p + 1))} disabled={clientListPage === clientListTotalPages} className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50">
                        <ChevronRight size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {activeTab === "deselected" && (
            <View className="bg-[#1a1a1a] border-b border-white/10 px-4 py-2.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-sm text-[#bdbdbd]">{allClients.length} clients</Text>
                <View className="flex-row gap-2 items-center">
                  <TouchableOpacity onPress={handleResetSelections} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <Text className="text-xs font-semibold text-red-400">Reset</Text>
                  </TouchableOpacity>
                  {batchSelectedForAction.size > 0 && (
                    <>
                      <TouchableOpacity onPress={() => setBatchSelectedForAction(new Set())} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Text className="text-xs font-semibold text-[#bdbdbd]">Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleBatchConfirm("select")} className="px-3 py-1.5 rounded-lg bg-sky-300/20 border border-sky-300/30">
                        <Text className="text-xs font-semibold text-sky-300">+{batchSelectedForAction.size}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {totalPages > 1 && (
                    <>
                      <View className="w-px h-6 bg-white/10" />
                      <TouchableOpacity onPress={() => setOtherClientsPage((p) => Math.max(1, p - 1))} disabled={otherClientsPage === 1} className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50">
                        <ChevronLeft size={16} color="#ffffff" />
                      </TouchableOpacity>
                      <Text className="text-xs text-white font-medium px-2">
                        {otherClientsPage} / {totalPages}
                      </Text>
                      <TouchableOpacity onPress={() => setOtherClientsPage((p) => Math.min(totalPages, p + 1))} disabled={otherClientsPage === totalPages} className="p-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50">
                        <ChevronRight size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Client List */}
          {loadingAllClients && activeTab === "deselected" ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#7dd3fc" />
              <Text className="text-[#bdbdbd] text-xs mt-2">Loading...</Text>
            </View>
          ) : filteredClients.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Users size={40} color="#bdbdbd" opacity={0.5} />
              <Text className="text-xs text-[#bdbdbd] mt-2">
                {debouncedSearch ? "No clients found" : "No clients"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.client_id}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
              ListHeaderComponent={
                previewStats && activeTab === "client-list" ? (
                  <View className="mb-2 bg-white/5 rounded-lg p-4">
                    <View className="flex-row flex-wrap gap-4 mb-3">
                      <View>
                        <Text className="text-xs text-[#bdbdbd] mb-1">Avg Score</Text>
                        <Text className="text-lg font-bold text-sky-300">{previewStats.avg_score}</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-[#bdbdbd] mb-1">Avg Days Since</Text>
                        <Text className="text-lg font-bold text-purple-400">{previewStats.avg_days_since_last_visit}</Text>
                      </View>
                      <View>
                        <Text className="text-xs text-[#bdbdbd] mb-1">Avg Overdue</Text>
                        <Text className="text-lg font-bold text-orange-400">{previewStats.avg_days_overdue}</Text>
                      </View>
                    </View>

                    {/* Client Types with full names and matching colors */}
                    <View className="flex-row flex-wrap gap-2">
                      {previewStats.breakdown.consistent > 0 && (
                        <View className="bg-green-500/20 px-2 py-1 rounded flex-row items-center gap-1.5">
                          <Text className="text-xs text-green-400 font-medium">Consistent</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-green-500/30">
                            <Text className="text-xs text-green-400 font-semibold">{previewStats.breakdown.consistent}</Text>
                          </View>
                        </View>
                      )}
                      {previewStats.breakdown["semi-consistent"] > 0 && (
                        <View className="bg-blue-500/20 px-2 py-1 rounded flex-row items-center gap-1.5">
                          <Text className="text-xs text-blue-400 font-medium">Semi</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-blue-500/30">
                            <Text className="text-xs text-blue-400 font-semibold">{previewStats.breakdown["semi-consistent"]}</Text>
                          </View>
                        </View>
                      )}
                      {previewStats.breakdown["easy-going"] > 0 && (
                        <View className="bg-yellow-500/20 px-2 py-1 rounded flex-row items-center gap-1.5">
                          <Text className="text-xs text-yellow-400 font-medium">Easy</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-yellow-500/30">
                            <Text className="text-xs text-yellow-400 font-semibold">{previewStats.breakdown["easy-going"]}</Text>
                          </View>
                        </View>
                      )}
                      {previewStats.breakdown.rare > 0 && (
                        <View className="bg-red-500/20 px-2 py-1 rounded flex-row items-center gap-1.5">
                          <Text className="text-xs text-red-400 font-medium">Rare</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-red-500/30">
                            <Text className="text-xs text-red-400 font-semibold">{previewStats.breakdown.rare}</Text>
                          </View>
                        </View>
                      )}
                      {previewStats.breakdown.new > 0 && (
                        <View className="bg-gray-500/20 px-2 py-1 rounded flex-row items-center gap-1.5">
                          <Text className="text-xs text-gray-400 font-medium">New</Text>
                          <View className="px-1.5 py-0.5 rounded-full bg-gray-500/30">
                            <Text className="text-xs text-gray-400 font-semibold">{previewStats.breakdown.new}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item: client }) => {
                const isDeselected = deselectedClients.includes(client.phone_normalized);
                const isBatchSelected = batchSelectedForAction.has(client.phone_normalized || "");

                return (
                  <TouchableOpacity
                    onPress={() => toggleBatchSelection(client.phone_normalized || "")}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`p-4 border rounded-xl mb-2 ${
                        isBatchSelected ? "bg-purple-300/10 border-purple-300/30" :
                        isDeselected ? "bg-amber-300/10 border-amber-300/30" :
                        "bg-white/5 border-white/10"
                      }`}
                    >
                      <View className="flex-row items-start gap-3">
                        <View className={`w-5 h-5 rounded border mt-0.5 ${isBatchSelected ? "bg-purple-300 border-purple-300" : "border-white/20 bg-white/5"}`} />

                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="font-semibold text-white text-base" numberOfLines={1}>
                              {capitalize(client.first_name)} {capitalize(client.last_name)}
                            </Text>
                            <View className={`px-2 py-1 rounded-full ${
                              client.visiting_type === "consistent" ? "bg-green-500/20" :
                              client.visiting_type === "semi-consistent" ? "bg-blue-500/20" :
                              client.visiting_type === "easy-going" ? "bg-yellow-500/20" :
                              client.visiting_type === "rare" ? "bg-red-500/20" :
                              "bg-gray-500/20"
                            }`}>
                              <Text className={`text-xs ${
                                client.visiting_type === "consistent" ? "text-green-400" :
                                client.visiting_type === "semi-consistent" ? "text-blue-400" :
                                client.visiting_type === "easy-going" ? "text-yellow-400" :
                                client.visiting_type === "rare" ? "text-red-400" :
                                "text-gray-400"
                              }`}>
                                {client.visiting_type === "consistent" ? "Consistent" : 
                                 client.visiting_type === "semi-consistent" ? "Semi-Consistent" : 
                                 client.visiting_type === "easy-going" ? "Easy-Going" : 
                                 client.visiting_type === "rare" ? "Rare" : "New"}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                            <Text className="text-xs text-[#bdbdbd]" numberOfLines={1}>
                              {client.phone_normalized}
                            </Text>
                            <Text className="text-xs text-[#bdbdbd]">•</Text>
                            <Text className="text-xs text-[#bdbdbd]">
                              {client.days_since_last_visit} days since visit
                            </Text>
                            <Text className="text-xs text-[#bdbdbd]">•</Text>
                            <Text className="text-xs text-orange-400">
                              {client.days_overdue} days overdue
                            </Text>
                          </View>
                        </View>

                        <View className="items-end">
                          <Text className="text-sm font-semibold text-sky-300">Score: {client.score}</Text>
                          {client.avg_weekly_visits ? (
                            <Text className="text-xs text-[#bdbdbd]">
                              Every ~{Math.round(7 / client.avg_weekly_visits)} days
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
            </View>
        </View>

      {/* All confirmation modals remain the same as in your original file */}
      {/* I'm including them all to preserve functionality, but they're unchanged */}
      
      {/* Deselect Modal - keeping exact same */}
      {showDeselectModal && (
        <Modal visible={showDeselectModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-amber-300/20 items-center justify-center">
                  <AlertCircle size={24} color="#fcd34d" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Deselect Client?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    <Text className="text-white font-semibold">
                      {pendingDeselectName}
                    </Text>{" "}
                    will not receive this message and will be moved to the
                    Deselected Clients list.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#fcd34d" className="mt-0.5" />
                  <Text className="text-sm text-amber-300 flex-1">
                    This client will be excluded from all future sends of this
                    campaign.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowDeselectModal(false);
                    setPendingDeselectPhone(null);
                    setPendingDeselectName("");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmDeselect}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-300/20 border border-amber-300/30 active:bg-amber-300/30"
                >
                  <Text className="text-base font-bold text-amber-300 text-center">
                    Deselect Client
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Reselect Modal */}
      {showReselectModal && (
        <Modal visible={showReselectModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-lime-300/20 items-center justify-center">
                  <AlertCircle size={24} color="#bef264" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Remove from Deselected?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    <Text className="text-white font-semibold">
                      {pendingReselectName}
                    </Text>{" "}
                    will be added back to the algorithm and may receive future
                    campaign messages.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#bef264" className="mt-0.5" />
                  <Text className="text-sm text-lime-300 flex-1">
                    This client will be eligible to receive messages from this
                    campaign again based on the algorithm.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowReselectModal(false);
                    setPendingReselectPhone(null);
                    setPendingReselectName("");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmReselect}
                  className="flex-1 px-4 py-3 rounded-xl bg-lime-300/20 border border-lime-300/30 active:bg-lime-300/30"
                >
                  <Text className="text-base font-bold text-lime-300 text-center">
                    Remove from Deselected
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Select Modal */}
      {showSelectModal && pendingSelectClient && (
        <Modal visible={showSelectModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-sky-300/20 items-center justify-center">
                  <AlertCircle size={24} color="#7dd3fc" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Select Client?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    <Text className="text-white font-semibold">
                      {pendingSelectClient.first_name}{" "}
                      {pendingSelectClient.last_name}
                    </Text>{" "}
                    will always receive this message regardless of the
                    algorithm.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#7dd3fc" className="mt-0.5" />
                  <Text className="text-sm text-sky-300 flex-1">
                    This client will not appear on the Client List page but
                    they will receive your message.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowSelectModal(false);
                    setPendingSelectClient(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmSelect}
                  className="flex-1 px-4 py-3 rounded-xl bg-sky-300/20 border border-sky-300/30 active:bg-sky-300/30"
                >
                  <Text className="text-base font-bold text-sky-300 text-center">
                    Select Client
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Unselect Modal */}
      {showUnselectModal && pendingUnselectClient && (
        <Modal visible={showUnselectModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-amber-300/20 items-center justify-center">
                  <AlertCircle size={24} color="#fcd34d" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Remove Selection?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    <Text className="text-white font-semibold">
                      {pendingUnselectClient.first_name}{" "}
                      {pendingUnselectClient.last_name}
                    </Text>{" "}
                    will return to being selected by the algorithm only.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#fcd34d" className="mt-0.5" />
                  <Text className="text-sm text-amber-300 flex-1">
                    This client may or may not receive future messages
                    depending on the algorithm.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowUnselectModal(false);
                    setPendingUnselectClient(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmUnselect}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-300/20 border border-amber-300/30 active:bg-amber-300/30"
                >
                  <Text className="text-base font-bold text-amber-300 text-center">
                    Remove Selection
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Batch Confirm Modal */}
      {showBatchConfirmModal && (
        <Modal visible={showBatchConfirmModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center ${
                    batchActionType === "select"
                      ? "bg-sky-300/20"
                      : "bg-amber-300/20"
                  }`}
                >
                  <AlertCircle
                    size={24}
                    color={batchActionType === "select" ? "#7dd3fc" : "#fcd34d"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    {batchActionType === "select" ? "Select" : "Deselect"}{" "}
                    {batchSelectedForAction.size} Client
                    {batchSelectedForAction.size > 1 ? "s" : ""}?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    {batchActionType === "select"
                      ? `${batchSelectedForAction.size} client${batchSelectedForAction.size > 1 ? "s" : ""} will always receive this message regardless of the algorithm.`
                      : `${batchSelectedForAction.size} client${batchSelectedForAction.size > 1 ? "s" : ""} will not receive this message.`}
                  </Text>
                </View>
              </View>

              <View
                className={`p-3 rounded-lg mb-4 ${
                  batchActionType === "select"
                    ? "bg-sky-500/10 border border-sky-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <View className="flex-row items-start gap-2">
                  <AlertCircle
                    size={16}
                    color={batchActionType === "select" ? "#7dd3fc" : "#fcd34d"}
                    className="mt-0.5"
                  />
                  <Text
                    className={`text-sm flex-1 ${
                      batchActionType === "select"
                        ? "text-sky-300"
                        : "text-amber-300"
                    }`}
                  >
                    {batchActionType === "select"
                      ? "Your selected clients will replace the lowest-scored clients on the algorithm, keeping your max the same."
                      : "These clients will be excluded from all future sends of this campaign."}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowBatchConfirmModal(false);
                    setBatchActionType(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmBatchAction}
                  className={`flex-1 px-4 py-3 rounded-xl ${
                    batchActionType === "select"
                      ? "bg-sky-300/20 border border-sky-300/30 active:bg-sky-300/30"
                      : "bg-amber-300/20 border border-amber-300/30 active:bg-amber-300/30"
                  }`}
                >
                  <Text
                    className={`text-base font-bold text-center ${
                      batchActionType === "select"
                        ? "text-sky-300"
                        : "text-amber-300"
                    }`}
                  >
                    {batchActionType === "select"
                      ? "Select Clients"
                      : "Deselect Clients"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <Modal visible={showResetModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-red-500/20 items-center justify-center">
                  <AlertCircle size={24} color="#f87171" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Reset All Selections?
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    This will reset all your deselected and manually selected
                    clients. The algorithm will return to its default selection.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#f87171" className="mt-0.5" />
                  <Text className="text-sm text-red-400 flex-1">
                    This action cannot be undone. All custom selections will be
                    cleared.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmReset}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 active:bg-red-500/30"
                >
                  <Text className="text-base font-bold text-red-400 text-center">
                    Reset All
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Add Custom Client Modal */}
      {showAddCustomModal && (
        <Modal visible={showAddCustomModal} animationType="fade" transparent>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Add One-time Recipient
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    This client will receive this message once, regardless of
                    the algorithm.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAddCustomModal(false)}
                  className="p-1 rounded-full active:bg-white/10"
                >
                  <X size={20} color="#bdbdbd" />
                </TouchableOpacity>
              </View>

              <View className="gap-4 mb-6">
                <View>
                  <Text className="text-sm font-medium text-[#bdbdbd] mb-1.5">
                    First Name
                  </Text>
                  <TextInput
                    value={customFirstName}
                    onChangeText={setCustomFirstName}
                    placeholder="John"
                    placeholderTextColor="#bdbdbd80"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-base text-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-[#bdbdbd] mb-1.5">
                    Last Name
                  </Text>
                  <TextInput
                    value={customLastName}
                    onChangeText={setCustomLastName}
                    placeholder="Doe"
                    placeholderTextColor="#bdbdbd80"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-base text-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-[#bdbdbd] mb-1.5">
                    Phone Number
                  </Text>
                  <View className="relative">
                    <Text className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-white font-medium z-10">
                      +1
                    </Text>
                    <TextInput
                      value={customPhone}
                      onChangeText={(text) => {
                        const value = text.replace(/\D/g, "");
                        if (value.length <= 10) {
                          let formatted = value;
                          if (value.length > 6) {
                            formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                          } else if (value.length > 3) {
                            formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                          } else if (value.length > 0) {
                            formatted = `(${value}`;
                          }
                          setCustomPhone(formatted);
                        }
                      }}
                      placeholder="(123) 456-7890"
                      placeholderTextColor="#bdbdbd80"
                      keyboardType="phone-pad"
                      maxLength={14}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-2.5 text-base text-white"
                    />
                  </View>
                  <Text className="text-xs text-[#bdbdbd] mt-1">
                    Enter 10-digit phone number
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#bef264" className="mt-0.5" />
                  <Text className="text-sm text-lime-300 flex-1">
                    This recipient will not appear in your regular client list
                    and will only receive this specific message.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowAddCustomModal(false);
                    setCustomFirstName("");
                    setCustomLastName("");
                    setCustomPhone("");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
                >
                  <Text className="text-base font-bold text-[#bdbdbd] text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddCustomClient}
                  className="flex-1 px-4 py-3 rounded-xl bg-lime-300/20 border border-lime-300/30 active:bg-lime-300/30"
                >
                  <Text className="text-base font-bold text-lime-300 text-center">
                    Add Recipient
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}

      {/* Increase Limit Modal */}
      {showIncreaseLimitModal && (
        <Modal
          visible={showIncreaseLimitModal}
          animationType="fade"
          transparent
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <Pressable
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-12 h-12 rounded-full bg-amber-300/20 items-center justify-center">
                  <AlertCircle size={24} color="#fcd34d" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-2">
                    Increase Max Clients
                  </Text>
                  <Text className="text-sm text-[#bdbdbd]">
                    You currently have {selectedClients.length} one-time
                    recipient{selectedClients.length !== 1 ? "s" : ""} selected,
                    but your max clients is set to 0.
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <View className="flex-row items-start gap-2">
                  <AlertCircle size={16} color="#fcd34d" className="mt-0.5" />
                  <Text className="text-sm text-amber-300 flex-1">
                    To see your selected one-time recipients in the client list
                    and add more, please increase your max clients to at least{" "}
                    {selectedClients.length + 1}.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowIncreaseLimitModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-300/20 border border-amber-300/30 active:bg-amber-300/30"
                >
                  <Text className="text-base font-bold text-amber-300 text-center">
                    Got it
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </Modal>
      )}
    </Modal>
  );
}