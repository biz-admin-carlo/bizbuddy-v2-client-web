// utils/exportUtils.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useAuthStore from "@/store/useAuthStore";
import { jwtDecode } from "jwt-decode";  

const BRANDING = {
  companyName: "BizBuddy",
  tagline: "Time Keeping Application",
  logoUrl: "https://mybizbuddy.co/logo.png",
  colors: {
    primary: [249, 115, 22], // Orange #f97316
    primaryLight: [255, 237, 213], // Light Orange #ffedd5
    accent: [220, 38, 38], // Red accent from logo
    dark: [55, 65, 81], // Dark gray #374151
    light: [156, 163, 175], // Light gray #9ca3af
    white: [255, 255, 255],
  },
};

let cachedUserData = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; 

/**
 * Fetches current user data using userId and companyId from JWT
 * @returns {Promise<Object>} Complete user data object
 */
const fetchCurrentUser = async () => {
  // Check if cache is still valid
  const now = Date.now();
  try {
    // Get token from Zustand store
    const authState = useAuthStore.getState();
    const token = authState.token;
      
    let decoded;
    try {
      decoded = jwtDecode(token);
      // console.log("✅ JWT decoded:", decoded);
    } catch (decodeError) {
      // console.error("❌ JWT decode error:", decodeError);
      return getFallbackUserData();
    }

    if (!decoded.userId || !decoded.companyId) {
      // console.warn("⚠️ No userId or companyId in JWT");
      return getFallbackUserData();
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    // Simple API call with userId and companyId
    const response = await fetch(
      `${API_URL}/api/account/user-export-data?userId=${decoded.userId}&companyId=${decoded.companyId}`
    );

    if (!response.ok) {
      console.warn(`⚠️ API call failed with status ${response.status}`);
      return getFallbackUserData();
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      console.warn("⚠️ Invalid API response");
      return getFallbackUserData();
    }

    // Cache the user data
    cachedUserData = result.data;
    lastFetchTime = now;

    return cachedUserData;
  } catch (error) {
    console.error("❌ Error fetching user data:", error.message);
    return getFallbackUserData();
  }
};

/**
 * Returns fallback user data when API call fails
 * Tries to extract from Zustand auth store first
 * @returns {Object} Minimal user data structure
 */
const getFallbackUserData = () => {
    const { user } = useAuthStore.getState();
    
  if (user) {
    const fullName = 
      user.fullName || 
      (user.profile?.firstName && user.profile?.lastName 
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
        : null) ||
      (user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`.trim()
        : null) ||
      user.username ||
      user.email?.split("@")[0] ||
      "Employee";
    
    return {
      id: user.id || "",
      username: user.username || user.email?.split("@")[0] || "employee",
      email: user.email || "",
      fullName: fullName,
      profile: {
        firstName: user.profile?.firstName || user.firstName || "",
        lastName: user.profile?.lastName || user.lastName || "",
      },
      company: {
        name: user.company?.name || "Company",
      },
    };
  }
  
  console.warn("⚠️ No user data in auth store - using minimal fallback");
  return {
    id: "",
    username: "employee",
    email: "",
    fullName: "Employee",
    profile: {
      firstName: "",
      lastName: "",
    },
    company: {
      name: "Company",
    },
  };
};

/**
 * Clears the cached user data (useful after profile updates)
 */
export const clearUserCache = () => {
  cachedUserData = null;
  lastFetchTime = null;
};

// ==========================================
// USER IDENTIFICATION UTILITIES
// ==========================================

/**
 * Extracts user information from various possible object structures
 * @param {Object} user - User object (can be from /me endpoint or fallback)
 * @returns {Object} Normalized user info
 */
const extractUserInfo = (user) => {
  if (!user) {
    console.warn("extractUserInfo: No user object provided");
    return {
      firstName: "",
      lastName: "",
      fullName: "Unknown User",
      username: "",
      email: "",
      userId: "",
      companyName: "Company",
    };
  }

  const firstName =
    user.profile?.firstName ||
    user.firstName ||
    user.Profile?.firstName ||
    user.first_name ||
    "";

  const lastName =
    user.profile?.lastName ||
    user.lastName ||
    user.Profile?.lastName ||
    user.last_name ||
    "";

  const fullName = user.fullName || `${firstName} ${lastName}`.trim();

  const username =
    user.username ||
    user.userName ||
    user.Username ||
    user.profile?.username ||
    user.Profile?.username ||
    user.user_name ||
    "";

  const email =
    user.email ||
    user.Email ||
    user.profile?.email ||
    user.Profile?.email ||
    user.emailAddress ||
    "";

  const userId =
    user.id ||
    user.userId ||
    user.ID ||
    user.user_id ||
    user.profile?.id ||
    "";

  const companyName =
    user.company?.name ||
    user.Company?.name ||
    user.companyName ||
    user.company_name ||
    "Company";

  let displayName = "Unknown User";
  if (fullName && fullName !== "") {
    displayName = fullName;
  } else if (username && username !== "") {
    displayName = username;
  } else if (email && email !== "") {
    displayName = email.split("@")[0];
  }

  const userInfo = {
    firstName,
    lastName,
    fullName: displayName,
    username: username || email.split("@")[0] || "user",
    email: email || "N/A",
    userId: userId || "N/A",
    companyName,
  };

  return userInfo;
};

/**
 * Formats a user's name for file naming (removes spaces, special chars)
 */
export const formatUserForFilename = (user) => {
  const userInfo = extractUserInfo(user);

  let identifier = userInfo.fullName;
  if (!identifier || identifier === "Unknown User") {
    identifier = userInfo.username || "User";
  }

  const cleaned = identifier
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return cleaned || "User";
};

/**
 * Generates a timestamp string for filenames
 */
export const getTimestampForFilename = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}`;
};

/**
 * Formats timestamp for display in reports
 */
export const getFormattedTimestamp = () => {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
};

/**
 * Calculate summary statistics from punch logs data
 */
const calculateSummaryStats = (data) => {
  const totalHours = data
    .reduce((sum, log) => sum + (parseFloat(log.duration) || 0), 0)
    .toFixed(2);

  const totalOT = data
    .reduce((sum, log) => sum + (parseFloat(log.otHours) || 0), 0)
    .toFixed(2);

  const totalCoffeeBreak = data
    .reduce((sum, log) => sum + (parseFloat(log.coffeeMins) || 0), 0)
    .toFixed(2);

  const totalLunchBreak = data
    .reduce((sum, log) => sum + (parseFloat(log.lunchMins) || 0), 0)
    .toFixed(2);

  const totalLateHours = data
    .reduce((sum, log) => sum + (parseFloat(log.lateHours) || 0), 0)
    .toFixed(2);

  const activeCount = data.filter((log) => log.status).length;
  const completedCount = data.filter((log) => !log.status).length;

  return {
    totalRecords: data.length,
    totalHours,
    totalOT,
    totalCoffeeBreak,
    totalLunchBreak,
    totalLateHours,
    activeCount,
    completedCount,
  };
};

/**
 * Helper to wrap CSV values with quotes and escape internal quotes
 */
const wrapCSV = (value) => {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
};

// ==========================================
// PUNCH LOGS EXPORT FUNCTIONS
// ==========================================

/**
 * Exports punch logs data as CSV with professional header and branding
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of punch log records to export
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from /get-user-details
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportPunchLogsCSV = async ({ data, user = null, filename = null }) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const stats = calculateSummaryStats(data);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== BUILD CLEAN HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - PUNCH LOGS REPORT`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== METADATA SECTION (Two-column layout) =====
    const metadataRows = [
      ["REPORT INFORMATION", "", "", "", "SUMMARY STATISTICS"],
      [""],
      ["Company:", userInfo.companyName, "", "", "Total Records:", stats.totalRecords],
      ["Employee Name:", userInfo.fullName, "", "", "Active Punches:", stats.activeCount],
      ["Username:", userInfo.username, "", "", "Completed Punches:", stats.completedCount],
      ["Email:", userInfo.email, "", "", ""],
      ["User ID:", userInfo.userId, "", "", "Total Work Hours:", `${stats.totalHours} hrs`],
      ["", "", "", "", "Total Overtime:", `${stats.totalOT} hrs`],
      ["Report Generated:", generatedAt, "", "", "Total Coffee Breaks:", `${stats.totalCoffeeBreak} hrs`],
      ["Generated By:", userInfo.fullName, "", "", "Total Lunch Breaks:", `${stats.totalLunchBreak} hrs`],
      ["", "", "", "", "Total Late Hours:", `${stats.totalLateHours} hrs`],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["PUNCH LOGS DETAIL"],
      [""],
    ];

    const tableHeader = [
      "ID",
      "Date",
      "Time In",
      "Time Out",
      "Duration (hrs)",
      "Coffee Break (hrs)",
      "Lunch Break (hrs)",
      "Overtime (hrs)",
      "OT Status",
      "Late Hours (hrs)",
      "Period Hours (hrs)",
      "Status",
    ];

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((log) => [
      log.id || "—",
      log.timeIn?.slice(0, 10) || "—",
      log.timeIn
        ? new Date(log.timeIn).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.timeOut
        ? new Date(log.timeOut).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.duration || "0.00",
      log.coffeeMins || "0.00",
      log.lunchMins || "0.00",
      log.otHours || "0.00",
      log.otStatus || "—",
      log.lateHours || "0.00",
      log.periodHours || "0.00",
      log.status ? "Active" : "Completed",
    ]);

    // ===== FOOTER =====
    const footerRows = [
      [""],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...metadataRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const finalFilename = filename || `BizBuddy_PunchLogs_${userForFile}_${timestamp}.csv`;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);


    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ CSV export failed:", error);
    throw error;
  }
};

// ==========================================
// PDF EXPORT FUNCTIONS
// ==========================================

/**
 * Loads the BizBuddy logo image and converts it to base64
 */
const loadLogoImage = async () => {
  try {
    const response = await fetch(BRANDING.logoUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('⚠️ Failed to load BizBuddy logo:', error.message);
    return null;
  }
};

/**
 * Draws the BizBuddy logo on the PDF
 */
const drawBizBuddyLogo = async (doc, x, y, width = 35, height = 14) => {
  try {
    const logoBase64 = await loadLogoImage();
    if (logoBase64) {
      // Add the actual logo image
      doc.addImage(logoBase64, 'PNG', x, y, width, height);
    } else {
      // Fallback to manual drawing if image fails to load
      doc.setFillColor(...BRANDING.colors.primary);
      doc.roundedRect(x, y, width, height, 2, 2, "F");
      
      doc.setTextColor(...BRANDING.colors.white);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BIZ", x + 5, y + 5.5);
      doc.text("BUDDY", x + 2, y + 9.5);
      
      doc.setDrawColor(...BRANDING.colors.accent);
      doc.setLineWidth(0.8);
      doc.line(x + 13, y + 3, x + 13, y + 9);
      doc.line(x + 18, y + 3, x + 18, y + 9);
    }
  } catch (error) {
    console.error('❌ Error drawing logo:', error);
  }
};

/**
 * Exports punch logs data as professional PDF with branding
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of punch log records to export
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from /get-user-details
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportPunchLogsPDF = async ({ data, user = null, filename = null }) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const stats = calculateSummaryStats(data);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the actual BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PUNCH LOGS REPORT", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Time Management System", pageWidth / 2, yPos + 11, { align: "center" });

    doc.setTextColor(...BRANDING.colors.light);
    doc.setFontSize(8);
    doc.text(`Generated: ${generatedAt}`, pageWidth - 15, yPos + 3, {
      align: "right",
    });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== EMPLOYEE INFO SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 50, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Employee:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} | ${userInfo.username}`, 50, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 50, yPos);

    // ===== TABLE SECTION =====
    yPos += 12;

    const tableHeaders = [
      "ID",
      "Date",
      "Time In",
      "Time Out",
      "Duration",
      "Coffee",
      "Lunch",
      "OT",
      "OT Status",
      "Late",
      "Status",
    ];

    const tableData = data.map((log) => [
      log.id || "—",
      log.timeIn?.slice(0, 10) || "—",
      log.timeIn
        ? new Date(log.timeIn).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.timeOut
        ? new Date(log.timeOut).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      `${log.duration || "0.00"}h`,
      `${log.coffeeMins || "0.00"}h`,
      `${log.lunchMins || "0.00"}h`,
      `${log.otHours || "0.00"}h`,
      log.otStatus || "—",
      `${log.lateHours || "0.00"}h`,
      log.status ? "Active" : "Done",
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30, halign: "left" },
        1: { cellWidth: 23, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 16, halign: "right" },
        7: { cellWidth: 16, halign: "right" },
        8: { cellWidth: 25, halign: "center" },
        9: { cellWidth: 16, halign: "right" },
        10: { cellWidth: 20, halign: "center" },
      },
      didDrawCell: (data) => {
        if (data.column.index === 7 && data.row.index >= 0) {
          const otValue = parseFloat(data.cell.text[0]);
          if (otValue > 0) {
            doc.setTextColor(...BRANDING.colors.primary);
            doc.setFont("helvetica", "bold");
          }
        }
        if (data.column.index === 10 && data.cell.text[0] === "Active") {
          doc.setTextColor(...BRANDING.colors.primary);
          doc.setFont("helvetica", "bold");
        }
      },
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 11);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 7);

      // Center: Requestor info
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(7);
      doc.text(
        `Requestor: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 9, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    const finalFilename = filename || `BizBuddy_PunchLogs_${userForFile}_${timestamp}.pdf`;
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ PDF export failed:", error);
    throw error;
  }
};

// ==========================================
// COMBINED EXPORT UTILITY
// ==========================================

/**
 * Quick utility to export both CSV and PDF simultaneously
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of punch log records to export
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from /get-user-details
 * @returns {Object} Result object with both export results
 */
export const exportBoth = async ({ data, user = null }) => {
  try {
    // Fetch user data once if not provided
    const userData = user || await fetchCurrentUser();
    
    const csvResult = await exportPunchLogsCSV({ data, user: userData });
    const pdfResult = await exportPunchLogsPDF({ data, user: userData });

    return {
      success: true,
      csv: csvResult,
      pdf: pdfResult,
    };
  } catch (error) {
    console.error("Export error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ==========================================
// DELETION REQUESTS EXPORT FUNCTIONS
// ==========================================

/**
 * Exports deletion requests data as CSV with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of deletion request records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportDeletionRequestsCSV = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== BUILD HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - EMPLOYEE ACCOUNT DELETION REQUESTS`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== REQUESTER INFORMATION SECTION =====
    const requesterRows = [
      ["REPORT REQUESTER INFORMATION"],
      [""],
      ["Company:", userInfo.companyName],
      ["Requester Name:", userInfo.fullName],
      ["Username:", userInfo.username],
      ["Email:", userInfo.email],
      ["User ID:", userInfo.userId],
      ["Report Generated:", generatedAt],
      [""],
      [""],
    ];

    // ===== ACCOUNTABILITY NOTICE =====
    const accountabilityRows = [
      ["ACCOUNTABILITY NOTICE"],
      ["This report contains sensitive employee data and should be handled with care."],
      ["The requester information above is recorded for audit and compliance purposes."],
      ["Unauthorized use or distribution of this report may violate company policies."],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["DELETION REQUESTS DETAIL"],
      [""],
    ];

    // Filter columns to only visible ones (excluding 'actions')
    const exportColumns = visibleColumns.filter(col => col !== "actions");
    const tableHeader = exportColumns.map(col => columnMap[col] || col);

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((record) => {
      return exportColumns.map((col) => {
        const value = record[col];
        
        // Format dates
        if (col.includes("At") || col.includes("Date")) {
          return value 
            ? new Date(value).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
        }
        
        // Return value or placeholder
        return value ?? "—";
      });
    });

    // ===== FOOTER =====
    const footerRows = [
      [""],
      [""],
      ["REQUESTER ACCOUNTABILITY"],
      [`Requested by: ${userInfo.fullName} (${userInfo.email})`],
      [`Generated: ${generatedAt}`],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
      [""],
      ["This report is confidential and intended for authorized personnel only."],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...requesterRows.map((row) => row.map(wrapCSV)),
      ...accountabilityRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const finalFilename = filename || `BizBuddy_DeletionRequests_${userForFile}_${timestamp}.csv`;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Deletion requests CSV export failed:", error);
    throw error;
  }
};

/**
 * Exports deletion requests data as professional PDF with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of deletion request records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportDeletionRequestsPDF = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    // Title
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE ACCOUNT DELETION REQUESTS", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Human Resources Management System", pageWidth / 2, yPos + 11, { align: "center" });

    // Requester info in top-right
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("REQUESTER:", pageWidth - 15, yPos + 2, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.fullName, pageWidth - 15, yPos + 5, { align: "right" });
    doc.text(userInfo.email, pageWidth - 15, yPos + 8, { align: "right" });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== REQUESTER INFO SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT REQUESTER INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Requester:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} (${userInfo.username})`, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("User ID:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.userId, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Generated:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(generatedAt, 50, yPos);

    // ===== ACCOUNTABILITY NOTICE =====
    yPos += 8;
    doc.setFillColor(255, 243, 224); // Light orange background
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.accent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ ACCOUNTABILITY NOTICE", 20, yPos + 4);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This report contains sensitive employee data. The requester information is recorded for audit and compliance purposes.",
      20,
      yPos + 8
    );
    doc.text(
      "Unauthorized use or distribution may violate company policies. Handle with appropriate confidentiality.",
      20,
      yPos + 11.5
    );

    // ===== TABLE SECTION =====
    yPos += 20;

    // Filter columns to only visible ones (excluding 'actions')
    const exportColumns = visibleColumns.filter(col => col !== "actions");
    const tableHeaders = exportColumns.map(col => columnMap[col] || col);

    const tableData = data.map((record) => {
      return exportColumns.map((col) => {
        const value = record[col];
        
        // Format dates
        if (col.includes("At") || col.includes("Date")) {
          return value 
            ? new Date(value).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
        }
        
        // Return value or placeholder
        return value ?? "—";
      });
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        // Auto-width for all columns
      },
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 16);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 12);

      // Center: Requester accountability
      doc.setTextColor(...BRANDING.colors.accent);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `REQUESTED BY: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${generatedAt}`,
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 14, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    const finalFilename = filename || `BizBuddy_DeletionRequests_${userForFile}_${timestamp}.pdf`;
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Deletion requests PDF export failed:", error);
    throw error;
  }
};

// ==========================================
// CONTEST TIME LOGS EXPORT FUNCTIONS
// ==========================================

/**
 * Exports contest time logs data as CSV with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of contest log records to export
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportContestLogsCSV = async ({ 
  data, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== BUILD HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - CONTEST TIME LOGS REPORT`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== REQUESTER INFORMATION SECTION =====
    const requesterRows = [
      ["REPORT REQUESTER INFORMATION"],
      [""],
      ["Company:", userInfo.companyName],
      ["Requester Name:", userInfo.fullName],
      ["Username:", userInfo.username],
      ["Email:", userInfo.email],
      ["User ID:", userInfo.userId],
      ["Report Generated:", generatedAt],
      [""],
      [""],
    ];

    // ===== ACCOUNTABILITY NOTICE =====
    const accountabilityRows = [
      ["ACCOUNTABILITY NOTICE"],
      ["This report contains time correction requests and should be handled with care."],
      ["The requester information above is recorded for audit and compliance purposes."],
      ["Unauthorized use or distribution of this report may violate company policies."],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["CONTEST TIME LOGS DETAIL"],
      [""],
    ];

    const tableHeader = [
      "Contest ID",
      "Time Log ID",
      "Contest Date",
      "Original Clock In",
      "Original Clock Out",
      "Requested Clock In",
      "Requested Clock Out",
      "Status",
      "Reason",
      "Description",
      "Approver",
      "Submitted At",
      "Reviewed At",
    ];

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((log) => [
      log.id || "—",
      log.timeLogId || "—",
      log.requestedClockIn
        ? new Date(log.requestedClockIn).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
      log.currentClockIn
        ? new Date(log.currentClockIn).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.currentClockOut
        ? new Date(log.currentClockOut).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.requestedClockIn
        ? new Date(log.requestedClockIn).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.requestedClockOut
        ? new Date(log.requestedClockOut).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.status || "—",
      log.reason || "—",
      log.description || "—",
      log.approverName || "—",
      log.createdAt
        ? new Date(log.createdAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.reviewedAt
        ? new Date(log.reviewedAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
    ]);

    // ===== FOOTER =====
    const footerRows = [
      [""],
      [""],
      ["REQUESTER ACCOUNTABILITY"],
      [`Requested by: ${userInfo.fullName} (${userInfo.email})`],
      [`Generated: ${generatedAt}`],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
      [""],
      ["This report is confidential and intended for authorized personnel only."],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...requesterRows.map((row) => row.map(wrapCSV)),
      ...accountabilityRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const finalFilename = filename || `BizBuddy_ContestLogs_${userForFile}_${timestamp}.csv`;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Contest logs CSV export failed:", error);
    throw error;
  }
};

/**
 * Exports contest time logs data as professional PDF with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of contest log records to export
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportContestLogsPDF = async ({ 
  data, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    // Title
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONTEST TIME LOGS REPORT", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Time Correction Requests Management", pageWidth / 2, yPos + 11, { align: "center" });

    // Requester info in top-right
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("REQUESTER:", pageWidth - 15, yPos + 2, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.fullName, pageWidth - 15, yPos + 5, { align: "right" });
    doc.text(userInfo.email, pageWidth - 15, yPos + 8, { align: "right" });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== REQUESTER INFO SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT REQUESTER INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Requester:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} (${userInfo.username})`, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("User ID:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.userId, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Generated:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(generatedAt, 50, yPos);

    // ===== ACCOUNTABILITY NOTICE =====
    yPos += 8;
    doc.setFillColor(255, 243, 224); // Light orange background
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.accent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ ACCOUNTABILITY NOTICE", 20, yPos + 4);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This report contains time correction requests. The requester information is recorded for audit and compliance purposes.",
      20,
      yPos + 8
    );
    doc.text(
      "Unauthorized use or distribution may violate company policies. Handle with appropriate confidentiality.",
      20,
      yPos + 11.5
    );

    // ===== TABLE SECTION =====
    yPos += 20;

    const tableHeaders = [
      "Contest ID",
      "Log ID",
      "Date",
      "Original In",
      "Original Out",
      "Requested In",
      "Requested Out",
      "Status",
      "Reason",
    ];

    const tableData = data.map((log) => [
      log.id || "—",
      log.timeLogId || "—",
      log.requestedClockIn
        ? new Date(log.requestedClockIn).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      log.currentClockIn
        ? new Date(log.currentClockIn).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.currentClockOut
        ? new Date(log.currentClockOut).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.requestedClockIn
        ? new Date(log.requestedClockIn).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.requestedClockOut
        ? new Date(log.requestedClockOut).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      log.status || "—",
      (log.reason || "—").substring(0, 20) + (log.reason?.length > 20 ? "..." : ""),
    ]);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" }, // Contest ID
        1: { cellWidth: 20, halign: "center" }, // Log ID
        2: { cellWidth: 22, halign: "center" }, // Date
        3: { cellWidth: 25, halign: "center" }, // Original In
        4: { cellWidth: 25, halign: "center" }, // Original Out
        5: { cellWidth: 25, halign: "center" }, // Requested In
        6: { cellWidth: 25, halign: "center" }, // Requested Out
        7: { cellWidth: 22, halign: "center" }, // Status
        8: { cellWidth: 35, halign: "left" },   // Reason
      },
      didDrawCell: (data) => {
        // Highlight status column based on value
        if (data.column.index === 7 && data.row.index >= 0) {
          const status = data.cell.text[0]?.toLowerCase();
          if (status === "approved") {
            doc.setTextColor(22, 163, 74); // Green
            doc.setFont("helvetica", "bold");
          } else if (status === "rejected") {
            doc.setTextColor(220, 38, 38); // Red
            doc.setFont("helvetica", "bold");
          } else if (status === "pending") {
            doc.setTextColor(234, 179, 8); // Yellow
            doc.setFont("helvetica", "bold");
          }
        }
      },
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 16);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 12);

      // Center: Requester accountability
      doc.setTextColor(...BRANDING.colors.accent);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `REQUESTED BY: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${generatedAt}`,
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 14, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    const finalFilename = filename || `BizBuddy_ContestLogs_${userForFile}_${timestamp}.pdf`;
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Contest logs PDF export failed:", error);
    throw error;
  }
};

// ==========================================
// DEPARTMENTS EXPORT FUNCTIONS
// ==========================================

/**
 * Exports departments data as CSV with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of department records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportDepartmentsCSV = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== BUILD HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - COMPANY DEPARTMENTS REPORT`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== REQUESTER INFORMATION SECTION =====
    const requesterRows = [
      ["REPORT REQUESTER INFORMATION"],
      [""],
      ["Company:", userInfo.companyName],
      ["Requester Name:", userInfo.fullName],
      ["Username:", userInfo.username],
      ["Email:", userInfo.email],
      ["User ID:", userInfo.userId],
      ["Report Generated:", generatedAt],
      [""],
      [""],
    ];

    // ===== ACCOUNTABILITY NOTICE =====
    const accountabilityRows = [
      ["ACCOUNTABILITY NOTICE"],
      ["This report contains organizational structure data and should be handled with care."],
      ["The requester information above is recorded for audit and compliance purposes."],
      ["Unauthorized use or distribution of this report may violate company policies."],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["DEPARTMENTS DETAIL"],
      [""],
    ];

    // Filter columns to only visible ones
    const exportColumns = visibleColumns.filter(col => col !== "actions");
    const tableHeader = exportColumns.map(col => columnMap[col] || col);

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((record) => {
      return exportColumns.map((col) => {
        const value = record[col];
        
        // Handle specific columns
        switch (col) {
          case "id":
            return record.id || "—";
          case "name":
            return record.name || "—";
          case "supervisor":
            return record.supervisorName || "No Supervisor";
          case "userCount":
            return record.totalUsers ?? 0;
          case "createdAt":
          case "updatedAt":
            return value 
              ? new Date(value).toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
          default:
            return value ?? "—";
        }
      });
    });

    // ===== STATISTICS SUMMARY =====
    const totalDepts = data.length;
    const withSupervisor = data.filter(d => d.supervisor).length;
    const withoutSupervisor = totalDepts - withSupervisor;
    const totalMembers = data.reduce((sum, d) => sum + (d.totalUsers || 0), 0);

    const summaryRows = [
      [""],
      [""],
      ["SUMMARY STATISTICS"],
      ["Total Departments:", totalDepts],
      ["With Supervisor:", withSupervisor],
      ["Without Supervisor:", withoutSupervisor],
      ["Total Members Across All Departments:", totalMembers],
      [""],
    ];

    // ===== FOOTER =====
    const footerRows = [
      [""],
      ["REQUESTER ACCOUNTABILITY"],
      [`Requested by: ${userInfo.fullName} (${userInfo.email})`],
      [`Generated: ${generatedAt}`],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
      [""],
      ["This report is confidential and intended for authorized personnel only."],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...requesterRows.map((row) => row.map(wrapCSV)),
      ...accountabilityRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...summaryRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const finalFilename = filename || `BizBuddy_Departments_${userForFile}_${timestamp}.csv`;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Departments CSV export failed:", error);
    throw error;
  }
};

/**
 * Exports departments data as professional PDF with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of department records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportDepartmentsPDF = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    // Title
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COMPANY DEPARTMENTS REPORT", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Organizational Structure Overview", pageWidth / 2, yPos + 11, { align: "center" });

    // Requester info in top-right
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("REQUESTER:", pageWidth - 15, yPos + 2, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.fullName, pageWidth - 15, yPos + 5, { align: "right" });
    doc.text(userInfo.email, pageWidth - 15, yPos + 8, { align: "right" });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== REQUESTER INFO SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT REQUESTER INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Requester:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} (${userInfo.username})`, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("User ID:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.userId, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Generated:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(generatedAt, 50, yPos);

    // ===== ACCOUNTABILITY NOTICE =====
    yPos += 8;
    doc.setFillColor(255, 243, 224); // Light orange background
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.accent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ ACCOUNTABILITY NOTICE", 20, yPos + 4);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This report contains organizational structure data. The requester information is recorded for audit and compliance purposes.",
      20,
      yPos + 8
    );
    doc.text(
      "Unauthorized use or distribution may violate company policies. Handle with appropriate confidentiality.",
      20,
      yPos + 11.5
    );

    // ===== SUMMARY STATISTICS BOX =====
    yPos += 20;
    
    const totalDepts = data.length;
    const withSupervisor = data.filter(d => d.supervisor).length;
    const withoutSupervisor = totalDepts - withSupervisor;
    const totalMembers = data.reduce((sum, d) => sum + (d.totalUsers || 0), 0);

    doc.setFillColor(240, 249, 255); // Light blue background
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY STATISTICS", 20, yPos + 5);
    
    yPos += 10;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    const col1X = 20;
    const col2X = pageWidth / 2 + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Departments:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(totalDepts.toString(), col1X + 35, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Members:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(totalMembers.toString(), col2X + 30, yPos);
    
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("With Supervisor:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 163, 74); // Green
    doc.text(withSupervisor.toString(), col1X + 35, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text("Without Supervisor:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(245, 158, 11); // Amber
    doc.text(withoutSupervisor.toString(), col2X + 35, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);

    // ===== TABLE SECTION =====
    yPos += 10;

    // Filter columns to only visible ones
    const exportColumns = visibleColumns.filter(col => col !== "actions");
    const tableHeaders = exportColumns.map(col => columnMap[col] || col);

    const tableData = data.map((record) => {
      return exportColumns.map((col) => {
        switch (col) {
          case "id":
            return record.id || "—";
          case "name":
            return record.name || "—";
          case "supervisor":
            return record.supervisorName || "No Supervisor";
          case "userCount":
            return (record.totalUsers ?? 0).toString();
          case "createdAt":
          case "updatedAt":
            return record[col]
              ? new Date(record[col]).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—";
          default:
            return record[col] ?? "—";
        }
      });
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        // Auto-width based on content
      },
      didDrawCell: (data) => {
        // Highlight "No Supervisor" in amber
        const supervisorColIndex = exportColumns.indexOf("supervisor");
        if (supervisorColIndex !== -1 && data.column.index === supervisorColIndex && data.row.index >= 0) {
          if (data.cell.text[0] === "No Supervisor") {
            doc.setTextColor(245, 158, 11); // Amber
            doc.setFont("helvetica", "bold");
          }
        }
        
        // Highlight user count in blue
        const userCountColIndex = exportColumns.indexOf("userCount");
        if (userCountColIndex !== -1 && data.column.index === userCountColIndex && data.row.index >= 0) {
          const count = parseInt(data.cell.text[0]);
          if (count > 0) {
            doc.setTextColor(37, 99, 235); // Blue
            doc.setFont("helvetica", "bold");
          }
        }
      },
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 16);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 12);

      // Center: Requester accountability
      doc.setTextColor(...BRANDING.colors.accent);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `REQUESTED BY: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${generatedAt}`,
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 14, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    const finalFilename = filename || `BizBuddy_Departments_${userForFile}_${timestamp}.pdf`;
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Departments PDF export failed:", error);
    throw error;
  }
};

// ==========================================
// EMPLOYEES EXPORT FUNCTIONS
// ==========================================

/**
 * Exports employees data as CSV with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of employee records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportEmployeesCSV = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // Calculate summary statistics
    const totalEmployees = data.length;
    const activeEmployees = data.filter(e => 
      e.employmentStatus === "full_time" || e.employmentStatus === "part_time"
    ).length;
    const roleBreakdown = data.reduce((acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    }, {});

    // ===== BUILD HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - COMPANY EMPLOYEES REPORT`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== REQUESTER INFORMATION SECTION =====
    const requesterRows = [
      ["REPORT REQUESTER INFORMATION"],
      [""],
      ["Company:", userInfo.companyName],
      ["Requester Name:", userInfo.fullName],
      ["Username:", userInfo.username],
      ["Email:", userInfo.email],
      ["User ID:", userInfo.userId],
      ["Report Generated:", generatedAt],
      [""],
      [""],
    ];

    // ===== SUMMARY STATISTICS =====
    const summaryRows = [
      ["SUMMARY STATISTICS"],
      [""],
      ["Total Employees:", totalEmployees],
      ["Active Employees:", activeEmployees],
      [""],
      ["BY ROLE"],
      ...Object.entries(roleBreakdown).map(([role, count]) => [
        `${role.charAt(0).toUpperCase() + role.slice(1)}:`, 
        count
      ]),
      [""],
      [""],
    ];

    // ===== ACCOUNTABILITY NOTICE =====
    const accountabilityRows = [
      ["ACCOUNTABILITY NOTICE"],
      ["This report contains employee data and should be handled with care."],
      ["The requester information above is recorded for audit and compliance purposes."],
      ["Unauthorized use or distribution of this report may violate company policies."],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["EMPLOYEES DETAIL"],
      [""],
    ];

    // Filter columns to only visible ones
    const tableHeader = visibleColumns.map(col => columnMap[col] || col);

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((record) => {
      return visibleColumns.map((col) => {
        const value = record[col];
        
        // Format dates
        if (col === "hireDate" || col === "probationEndDate") {
          return value 
            ? new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—";
        }
        
        if (col === "createdAt" || col === "updatedAt") {
          return value 
            ? new Date(value).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—";
        }
        
        // Handle special columns
        if (col === "name") {
          return record.fullName || "—";
        }
        
        if (col === "department") {
          return record.departmentName || "—";
        }
        
        if (col === "supervisor") {
          return record.supervisorEmail || "—";
        }
        
        if (col === "employeeId") {
          return record.employmentDetail?.employeeId || "—";
        }
        
        // Return value or placeholder
        return value ?? "—";
      });
    });

    // ===== FOOTER =====
    const footerRows = [
      [""],
      [""],
      ["REQUESTER ACCOUNTABILITY"],
      [`Requested by: ${userInfo.fullName} (${userInfo.email})`],
      [`Generated: ${generatedAt}`],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
      [""],
      ["This report is confidential and intended for authorized personnel only."],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...requesterRows.map((row) => row.map(wrapCSV)),
      ...summaryRows.map((row) => row.map(wrapCSV)),
      ...accountabilityRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const finalFilename = filename || `BizBuddy_Employees_${userForFile}_${timestamp}.csv`;
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Employees CSV export failed:", error);
    throw error;
  }
};

/**
 * Exports employees data as professional PDF with requester accountability
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of employee records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportEmployeesPDF = async ({ 
  data, 
  visibleColumns, 
  columnMap, 
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // Calculate summary statistics
    const totalEmployees = data.length;
    const activeEmployees = data.filter(e => 
      e.employmentStatus === "full_time" || e.employmentStatus === "part_time"
    ).length;
    const roleBreakdown = data.reduce((acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    }, {});

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    // Title
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COMPANY EMPLOYEES REPORT", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Human Resources Management System", pageWidth / 2, yPos + 11, { align: "center" });

    // Requester info in top-right
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("REQUESTER:", pageWidth - 15, yPos + 2, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.fullName, pageWidth - 15, yPos + 5, { align: "right" });
    doc.text(userInfo.email, pageWidth - 15, yPos + 8, { align: "right" });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== REQUESTER INFO SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT REQUESTER INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Requester:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} (${userInfo.username})`, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 50, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("User ID:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.userId, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Generated:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(generatedAt, 50, yPos);

    // ===== SUMMARY STATISTICS BOX =====
    yPos += 8;
    
    doc.setFillColor(240, 249, 255); // Light blue background
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY STATISTICS", 20, yPos + 5);
    
    yPos += 10;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(8);
    
    const col1X = 20;
    const col2X = pageWidth / 3;
    const col3X = (pageWidth / 3) * 2;
    
    // Total & Active
    doc.setFont("helvetica", "bold");
    doc.text("Total Employees:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(totalEmployees.toString(), col1X + 35, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.text("Active Employees:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(activeEmployees.toString(), col2X + 35, yPos);
    
    // Role breakdown
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("By Role:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    const roleText = Object.entries(roleBreakdown)
      .map(([role, count]) => `${role.charAt(0).toUpperCase() + role.slice(1)} (${count})`)
      .join(", ");
    doc.text(roleText, col1X + 20, yPos);

    // ===== ACCOUNTABILITY NOTICE =====
    yPos += 10;
    doc.setFillColor(255, 243, 224); // Light orange background
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.accent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNTABILITY NOTICE", 20, yPos + 4);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      "This report contains employee data. The requester information is recorded for audit and compliance purposes.",
      20,
      yPos + 8
    );
    doc.text(
      "Unauthorized use or distribution may violate company policies. Handle with appropriate confidentiality.",
      20,
      yPos + 11.5
    );

    // ===== TABLE SECTION =====
    yPos += 20;

    // Filter columns to only visible ones
    const tableHeaders = visibleColumns.map(col => columnMap[col] || col);

    const tableData = data.map((record) => {
      return visibleColumns.map((col) => {
        // Format dates
        if (col === "hireDate" || col === "probationEndDate") {
          return record[col]
            ? new Date(record[col]).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "—";
        }
        
        if (col === "createdAt" || col === "updatedAt") {
          return record[col]
            ? new Date(record[col]).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "—";
        }
        
        // Handle special columns
        if (col === "name") {
          return record.fullName || "—";
        }
        
        if (col === "department") {
          return record.departmentName || "—";
        }
        
        if (col === "supervisor") {
          return record.supervisorEmail || "—";
        }
        
        if (col === "employeeId") {
          return record.employmentDetail?.employeeId || "—";
        }
        
        // Return value or placeholder
        return record[col] ?? "—";
      });
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15, bottom: 25 },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
        minCellHeight: 7, // Minimum cell height
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        // Auto-width based on content
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
      // Adjust page break threshold to prevent orphan rows
      pageBreak: 'auto',
      // Ensure at least 3 rows per page (except last page)
      didDrawPage: function(data) {
        // This just ensures proper spacing, no complex logic needed
      },
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 16);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 12);

      // Center: Requester accountability
      doc.setTextColor(...BRANDING.colors.accent);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `REQUESTED BY: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${generatedAt}`,
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 14, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    const finalFilename = filename || `BizBuddy_Employees_${userForFile}_${timestamp}.pdf`;
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Employees PDF export failed:", error);
    throw error;
  }
};

// ==========================================
// PUNCH LOGS EXPORT FUNCTIONS
// ==========================================

/**
 * Exports punch logs data as CSV with requester accountability and timezone support
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of punch log records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.filters - Active filters object
 * @param {string} params.userTimezone - User's timezone
 * @param {string} params.companyTimezone - Company HQ timezone
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportEmployeePunchLogsCSV = async ({ 
  data, 
  visibleColumns, 
  columnMap,
  filters = {},
  userTimezone = "UTC",
  companyTimezone = "UTC",
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // Calculate summary statistics
    const totalRecords = data.length;
    const activeRecords = data.filter(d => d.status === 'active').length;
    const completedRecords = data.filter(d => d.status === 'completed').length;
    const scheduledRecords = data.filter(d => d.isScheduled).length;
    const totalPeriodHours = data.reduce((sum, d) => sum + (parseFloat(d.periodHours) || 0), 0).toFixed(2);
    const totalOvertimeHours = data.reduce((sum, d) => sum + (parseFloat(d.otHours) || 0), 0).toFixed(2);

    // Employee-level aggregations
    const employeeStats = {};
    data.forEach(log => {
      if (!employeeStats[log.userId]) {
        employeeStats[log.userId] = {
          name: log.employeeName,
          totalHours: 0,
          totalOT: 0,
          daysWorked: new Set(),
        };
      }
      employeeStats[log.userId].totalHours += parseFloat(log.periodHours) || 0;
      employeeStats[log.userId].totalOT += parseFloat(log.otHours) || 0;
      if (log.timeIn) {
        employeeStats[log.userId].daysWorked.add(log.timeIn.slice(0, 10));
      }
    });

    const getTimezoneName = (tz) => {
      const parts = tz.split('/');
      return parts[parts.length - 1].replace(/_/g, ' ');
    };

    const showDualTimezone = userTimezone !== companyTimezone;

    // ===== BUILD HEADER =====
    const headerRows = [
      [`${BRANDING.companyName.toUpperCase()} - EMPLOYEE PUNCH LOGS REPORT`],
      [BRANDING.tagline],
      [""],
    ];

    // ===== REQUESTER INFORMATION SECTION =====
    const requesterRows = [
      ["REPORT REQUESTER INFORMATION"],
      [""],
      ["Company:", userInfo.companyName],
      ["Requester Name:", userInfo.fullName],
      ["Username:", userInfo.username],
      ["Email:", userInfo.email],
      ["User ID:", userInfo.userId],
      ["Report Generated:", generatedAt],
      [""],
      [""],
    ];

    // ===== ACTIVE FILTERS SECTION =====
    const filterRows = [
      ["ACTIVE FILTERS"],
      [""],
    ];

    let hasActiveFilters = false;
    if (filters.departmentId && filters.departmentId !== 'all') {
      filterRows.push(["Department Filter:", filters.departmentId]);
      hasActiveFilters = true;
    }
    if (filters.from) {
      filterRows.push(["Date From:", new Date(filters.from).toLocaleDateString()]);
      hasActiveFilters = true;
    }
    if (filters.to) {
      filterRows.push(["Date To:", new Date(filters.to).toLocaleDateString()]);
      hasActiveFilters = true;
    }
    if (filters.status && filters.status !== 'all') {
      filterRows.push(["Status Filter:", filters.status]);
      hasActiveFilters = true;
    }
    if (filters.employeeIds && filters.employeeIds.length > 0 && !filters.employeeIds.includes('all')) {
      filterRows.push(["Employee Filter:", `${filters.employeeIds.length} selected`]);
      hasActiveFilters = true;
    }
    
    if (!hasActiveFilters) {
      filterRows.push(["No active filters - showing all records"]);
    }
    
    filterRows.push([""], [""]);

    // ===== TIMEZONE INFORMATION =====
    const timezoneRows = [
      ["TIMEZONE INFORMATION"],
      [""],
      ["Your Timezone:", `${userTimezone} (${getTimezoneName(userTimezone)})`],
      ["Company HQ Timezone:", `${companyTimezone} (${getTimezoneName(companyTimezone)})`],
    ];
    
    if (showDualTimezone) {
      timezoneRows.push(["Note:", "Times shown in both your timezone and company HQ timezone"]);
    } else {
      timezoneRows.push(["Note:", "Your timezone matches company HQ timezone"]);
    }
    
    timezoneRows.push([""], [""]);

    // ===== SUMMARY STATISTICS =====
    const summaryRows = [
      ["SUMMARY STATISTICS"],
      [""],
      ["Total Records:", totalRecords],
      ["Active Sessions:", activeRecords],
      ["Completed Sessions:", completedRecords],
      ["Scheduled Sessions:", scheduledRecords],
      ["Total Period Hours:", `${totalPeriodHours} hrs`],
      ["Total Overtime Hours:", `${totalOvertimeHours} hrs`],
      [""],
      [""],
    ];

    // ===== EMPLOYEE SUMMARY =====
    const employeeSummaryRows = [
      ["EMPLOYEE SUMMARY"],
      [""],
      ["Employee Name", "Total Hours", "Overtime Hours", "Days Worked", "Avg Hours/Day"],
    ];

    Object.values(employeeStats).forEach(emp => {
      const avgHours = emp.daysWorked.size > 0 
        ? (emp.totalHours / emp.daysWorked.size).toFixed(2) 
        : "0.00";
      employeeSummaryRows.push([
        emp.name,
        emp.totalHours.toFixed(2),
        emp.totalOT.toFixed(2),
        emp.daysWorked.size.toString(),
        avgHours
      ]);
    });

    employeeSummaryRows.push([""], [""]);

    // ===== ACCOUNTABILITY NOTICE =====
    const accountabilityRows = [
      ["ACCOUNTABILITY NOTICE"],
      ["This report contains time tracking data and should be handled with care."],
      ["The requester information above is recorded for audit and compliance purposes."],
      ["Unauthorized use or distribution of this report may violate company policies."],
      [""],
      [""],
    ];

    // ===== TABLE HEADER =====
    const tableHeaderRows = [
      ["PUNCH LOGS DETAIL"],
      [""],
    ];

    // Filter columns to only visible ones (excluding 'actions')
    const exportColumns = visibleColumns.filter(col => col !== "actions");
    
    // Build table headers - add timezone suffix if dual timezone
    const tableHeader = exportColumns.map(col => {
      const label = columnMap[col] || col;
      if (showDualTimezone && (col === "dateTimeIn" || col === "dateTimeOut")) {
        return `${label} (Your TZ / HQ TZ)`;
      }
      return label;
    });

    // Helper function to format time with timezone
    const formatTimeWithTZ = (datetime, tz) => {
      if (!datetime) return "—";
      return new Date(datetime).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: tz
      });
    };

    // ===== TABLE DATA ROWS =====
    const tableRows = data.map((record) => {
      return exportColumns.map((col) => {
        switch (col) {
          case "id":
            return record.id || "—";
          case "schedule":
            return record.isScheduled ? "Scheduled" : "Unscheduled";
          case "locationRestricted":
            return record.isLocRestricted ? "Required" : "None";
          case "employee":
            return record.employeeName || "—";
          case "dateTimeIn":
            if (showDualTimezone) {
              const userTime = formatTimeWithTZ(record.timeIn, userTimezone);
              const hqTime = formatTimeWithTZ(record.timeIn, companyTimezone);
              return `${userTime} / ${hqTime}`;
            }
            return formatTimeWithTZ(record.timeIn, userTimezone);
          case "dateTimeOut":
            if (showDualTimezone) {
              const userTime = formatTimeWithTZ(record.timeOut, userTimezone);
              const hqTime = formatTimeWithTZ(record.timeOut, companyTimezone);
              return `${userTime} / ${hqTime}`;
            }
            return formatTimeWithTZ(record.timeOut, userTimezone);
          case "duration":
            return `${record.duration || "0.00"} hrs`;
          case "coffee":
            return `${record.coffeeMins || "0.00"} hrs`;
          case "lunch":
            return `${record.lunchMins || "0.00"} hrs`;
          case "ot":
            return `${record.otHours || "0.00"} hrs`;
          case "otStatus":
            return record.otStatus || "—";
          case "late":
            return `${record.lateHours || "0.00"} hrs`;
          case "period":
            return `${record.periodHours || "0.00"} hrs`;
          case "status":
            return record.status === "active" ? "Active" : "Completed";
          case "deviceIn":
            return record.fullDevIn || "—";
          case "deviceOut":
            return record.fullDevOut || "—";
          case "locationIn":
            return record.locIn?.txt || "—";
          case "locationOut":
            return record.locOut?.txt || "—";
          default:
            return record[col] ?? "—";
        }
      });
    });

    // ===== FOOTER =====
    const footerRows = [
      [""],
      [""],
      ["REQUESTER ACCOUNTABILITY"],
      [`Requested by: ${userInfo.fullName} (${userInfo.email})`],
      [`Generated: ${generatedAt}`],
      [`Timezone: ${userTimezone}`],
      [""],
      [`${BRANDING.companyName} | ${BRANDING.tagline}`],
      [`© ${new Date().getFullYear()} | All Rights Reserved`],
      [""],
      ["This report is confidential and intended for authorized personnel only."],
    ];

    // ===== COMBINE ALL ROWS =====
    const allRows = [
      ...headerRows.map((row) => row.map(wrapCSV)),
      ...requesterRows.map((row) => row.map(wrapCSV)),
      ...filterRows.map((row) => row.map(wrapCSV)),
      ...timezoneRows.map((row) => row.map(wrapCSV)),
      ...summaryRows.map((row) => row.map(wrapCSV)),
      ...employeeSummaryRows.map((row) => row.map(wrapCSV)),
      ...accountabilityRows.map((row) => row.map(wrapCSV)),
      ...tableHeaderRows.map((row) => row.map(wrapCSV)),
      tableHeader.map(wrapCSV),
      ...tableRows.map((row) => row.map(wrapCSV)),
      ...footerRows.map((row) => row.map(wrapCSV)),
    ];

    const csvContent = allRows.map((row) => row.join(",")).join("\r\n");

    // ===== CREATE AND DOWNLOAD =====
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Enhanced filename with filter context
    let finalFilename = filename;
    if (!finalFilename) {
      finalFilename = `BizBuddy_PunchLogs_${userForFile}_${timestamp}`;
      if (filters.from && filters.to) {
        finalFilename += `_${filters.from.replace(/-/g, '')}-${filters.to.replace(/-/g, '')}`;
      }
      finalFilename += `_${totalRecords}records.csv`;
    }
    
    link.download = finalFilename;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Punch logs CSV export failed:", error);
    throw error;
  }
};

/**
 * Exports punch logs data as professional PDF with requester accountability and timezone support
 * @param {Object} params - Export parameters
 * @param {Array} params.data - Array of punch log records to export
 * @param {Array} params.visibleColumns - Array of column keys to include in export
 * @param {Object} params.columnMap - Map of column keys to display labels
 * @param {Object} params.filters - Active filters object
 * @param {string} params.userTimezone - User's timezone
 * @param {string} params.companyTimezone - Company HQ timezone
 * @param {Object} params.user - (Optional) User object, if not provided, will fetch from API
 * @param {string} params.filename - (Optional) Custom filename
 * @returns {Object} Result object with success flag and filename
 */
export const exportEmployeePunchLogsPDF = async ({ 
  data, 
  visibleColumns, 
  columnMap,
  filters = {},
  userTimezone = "UTC",
  companyTimezone = "UTC",
  user = null, 
  filename = null 
}) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  if (!visibleColumns || visibleColumns.length === 0) {
    throw new Error("No columns selected for export");
  }

  if (!columnMap) {
    throw new Error("Column map is required for export");
  }

  try {
    // Fetch user data if not provided
    const userData = user || await fetchCurrentUser();
    
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const userInfo = extractUserInfo(userData);
    const generatedAt = getFormattedTimestamp();
    const userForFile = formatUserForFilename(userData);
    const timestamp = getTimestampForFilename();

    // Calculate summary statistics
    const totalRecords = data.length;
    const activeRecords = data.filter(d => d.status === 'active').length;
    const completedRecords = data.filter(d => d.status === 'completed').length;
    const scheduledRecords = data.filter(d => d.isScheduled).length;
    const totalPeriodHours = data.reduce((sum, d) => sum + (parseFloat(d.periodHours) || 0), 0).toFixed(2);
    const totalOvertimeHours = data.reduce((sum, d) => sum + (parseFloat(d.otHours) || 0), 0).toFixed(2);

    // Employee-level aggregations
    const employeeStats = {};
    data.forEach(log => {
      if (!employeeStats[log.userId]) {
        employeeStats[log.userId] = {
          name: log.employeeName,
          totalHours: 0,
          totalOT: 0,
          daysWorked: new Set(),
        };
      }
      employeeStats[log.userId].totalHours += parseFloat(log.periodHours) || 0;
      employeeStats[log.userId].totalOT += parseFloat(log.otHours) || 0;
      if (log.timeIn) {
        employeeStats[log.userId].daysWorked.add(log.timeIn.slice(0, 10));
      }
    });

    const getTimezoneName = (tz) => {
      const parts = tz.split('/');
      return parts[parts.length - 1].replace(/_/g, ' ');
    };

    const showDualTimezone = userTimezone !== companyTimezone;

    // ===== HEADER SECTION =====
    let yPos = 15;

    // Draw the BizBuddy logo
    await drawBizBuddyLogo(doc, 15, yPos);

    // Title
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE PUNCH LOGS REPORT", pageWidth / 2, yPos + 6, { align: "center" });

    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Time Tracking & Attendance Management", pageWidth / 2, yPos + 11, { align: "center" });

    // Requester info in top-right
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("REQUESTER:", pageWidth - 15, yPos + 2, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.fullName, pageWidth - 15, yPos + 5, { align: "right" });
    doc.text(userInfo.email, pageWidth - 15, yPos + 8, { align: "right" });

    yPos += 18;
    doc.setDrawColor(...BRANDING.colors.primary);
    doc.setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ===== REQUESTER INFO & FILTERS SECTION =====
    yPos += 6;
    doc.setFillColor(...BRANDING.colors.primaryLight);
    doc.roundedRect(15, yPos, pageWidth - 30, 32, 2, 2, "F");

    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("REPORT INFORMATION", 20, yPos + 5);

    yPos += 9;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(8);
    
    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Company:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.companyName, 45, yPos);

    // Right column - Active Filters
    doc.setFont("helvetica", "bold");
    doc.text("Active Filters:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    
    let filterText = "";
    if (filters.from && filters.to) {
      filterText = `${new Date(filters.from).toLocaleDateString()} - ${new Date(filters.to).toLocaleDateString()}`;
    } else if (filters.from) {
      filterText = `From ${new Date(filters.from).toLocaleDateString()}`;
    } else if (filters.to) {
      filterText = `Until ${new Date(filters.to).toLocaleDateString()}`;
    } else {
      filterText = "All dates";
    }
    doc.text(filterText, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Requester:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo.fullName} (${userInfo.username})`, 45, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Status:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(filters.status === 'all' ? 'All statuses' : filters.status || 'All', pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(userInfo.email, 45, yPos);

    doc.setFont("helvetica", "bold");
    doc.text("Records:", pageWidth / 2 + 10, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${totalRecords} total`, pageWidth / 2 + 35, yPos);

    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Generated:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(generatedAt, 45, yPos);

    // Timezone info
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Timezone:", 20, yPos);
    doc.setFont("helvetica", "normal");
    if (showDualTimezone) {
      doc.text(`${getTimezoneName(userTimezone)} / ${getTimezoneName(companyTimezone)} (HQ)`, 45, yPos);
    } else {
      doc.text(getTimezoneName(userTimezone), 45, yPos);
    }

    // ===== SUMMARY STATISTICS BOX =====
    yPos += 10;
    
    doc.setFillColor(240, 249, 255); // Light blue background
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, "F");
    
    doc.setTextColor(...BRANDING.colors.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY STATISTICS", 20, yPos + 5);
    
    yPos += 10;
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFontSize(8);
    
    const col1X = 20;
    const col2X = pageWidth / 4;
    const col3X = pageWidth / 2;
    const col4X = (pageWidth / 4) * 3;
    
    // Row 1
    doc.setFont("helvetica", "bold");
    doc.text("Total Records:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(totalRecords.toString(), col1X + 30, yPos);
    
    doc.setFont("helvetica", "bold");
    doc.text("Active:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(activeRecords.toString(), col2X + 20, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text("Completed:", col3X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 163, 74); // Green
    doc.text(completedRecords.toString(), col3X + 25, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text("Scheduled:", col4X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(scheduledRecords.toString(), col4X + 25, yPos);
    
    // Row 2
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Period Hours:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRANDING.colors.primary);
    doc.text(`${totalPeriodHours}h`, col1X + 30, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text("Overtime:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(245, 158, 11); // Amber
    doc.text(`${totalOvertimeHours}h`, col2X + 20, yPos);
    
    doc.setTextColor(...BRANDING.colors.dark);

    // ===== EMPLOYEE SUMMARY TABLE =====
    yPos += 10;
    
    const employeeSummaryHeader = ["Employee", "Total Hours", "Overtime", "Days", "Avg/Day"];
    const employeeSummaryBody = Object.values(employeeStats).map(emp => {
      const avgHours = emp.daysWorked.size > 0 
        ? (emp.totalHours / emp.daysWorked.size).toFixed(1) 
        : "0.0";
      return [
        emp.name,
        emp.totalHours.toFixed(2),
        emp.totalOT.toFixed(2),
        emp.daysWorked.size.toString(),
        avgHours
      ];
    });

    autoTable(doc, {
      head: [employeeSummaryHeader],
      body: employeeSummaryBody,
      startY: yPos,
      margin: { left: 15, right: 15, bottom: 30 }, // Added bottom margin to prevent footer collision
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
      },
      showHead: 'everyPage',        // Show header on every page if it spans multiple pages
      rowPageBreak: 'avoid',      
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
    });

    const afterSummaryY = doc.lastAutoTable?.finalY || yPos;
    yPos = afterSummaryY + 10;
    
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    // Add spacing before main table
    yPos += 5;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Select appropriate columns for PDF (limit for space)
    const pdfColumns = visibleColumns
      .filter(col => col !== "actions" && col !== "id")
      .slice(0, 10); // Limit columns for PDF width

    const tableHeaders = pdfColumns.map(col => {
      const label = columnMap[col] || col;
      // Shorten labels for PDF
      if (col === "dateTimeIn") return showDualTimezone ? "Time In (Your/HQ)" : "Time In";
      if (col === "dateTimeOut") return showDualTimezone ? "Time Out (Your/HQ)" : "Time Out";
      if (col === "employee") return "Employee";
      if (col === "duration") return "Dur.";
      if (col === "period") return "Period";
      if (col === "coffee") return "Coffee";
      if (col === "lunch") return "Lunch";
      if (col === "ot") return "OT";
      if (col === "otStatus") return "OT Status";
      if (col === "late") return "Late";
      if (col === "status") return "Status";
      return label;
    });

    const formatTimeShort = (datetime, tz) => {
      if (!datetime) return "—";
      return new Date(datetime).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz
      });
    };

    const tableData = data.map((record) => {
      return pdfColumns.map((col) => {
        switch (col) {
          case "employee":
            return record.employeeName?.split('@')[0] || "—";
          case "dateTimeIn":
            if (showDualTimezone) {
              const userTime = formatTimeShort(record.timeIn, userTimezone);
              const hqTime = formatTimeShort(record.timeIn, companyTimezone);
              return `${userTime}\n${hqTime}`;
            }
            return formatTimeShort(record.timeIn, userTimezone);
          case "dateTimeOut":
            if (showDualTimezone) {
              const userTime = formatTimeShort(record.timeOut, userTimezone);
              const hqTime = formatTimeShort(record.timeOut, companyTimezone);
              return `${userTime}\n${hqTime}`;
            }
            return formatTimeShort(record.timeOut, userTimezone);
          case "duration":
          case "coffee":
          case "lunch":
          case "ot":
          case "late":
          case "period":
            const value = record[col === "duration" ? "duration" : 
                                 col === "coffee" ? "coffeeMins" :
                                 col === "lunch" ? "lunchMins" :
                                 col === "ot" ? "otHours" :
                                 col === "late" ? "lateHours" :
                                 "periodHours"] || "0.00";
            return `${value}h`;
          case "status":
            return record.status === "active" ? "Active" : "Done";
          case "schedule":
            return record.isScheduled ? "Yes" : "No";
          case "otStatus":
            return record.otStatus || "—";
          default:
            return record[col] ?? "—";
        }
      });
    });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      margin: { left: 15, right: 15, bottom: 25 },
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: BRANDING.colors.dark,
        minCellHeight: showDualTimezone ? 8 : 5,
      },
      headStyles: {
        fillColor: BRANDING.colors.primary,
        textColor: BRANDING.colors.white,
        fontStyle: "bold",
        halign: "center",
        fontSize: 6,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
    });

    // ===== FOOTER ON ALL PAGES =====
    const pageCount = doc.internal.getNumberOfPages();
    const currentYear = new Date().getFullYear();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(...BRANDING.colors.light);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      // Left: BizBuddy branding
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${BRANDING.companyName} | ${BRANDING.tagline}`, 15, pageHeight - 16);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRANDING.colors.light);
      doc.text(`© ${currentYear}`, 15, pageHeight - 12);

      // Center: Requester accountability
      doc.setTextColor(...BRANDING.colors.accent);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(
        `REQUESTED BY: ${userInfo.fullName} | ${userInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
      
      doc.setTextColor(...BRANDING.colors.dark);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated: ${generatedAt} | TZ: ${getTimezoneName(userTimezone)}`,
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      // Right: Page number
      doc.setTextColor(...BRANDING.colors.light);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 14, {
        align: "right",
      });
    }

    // ===== SAVE THE PDF =====
    let finalFilename = filename;
    if (!finalFilename) {
      finalFilename = `BizBuddy_PunchLogs_${userForFile}_${timestamp}`;
      if (filters.from && filters.to) {
        finalFilename += `_${filters.from.replace(/-/g, '')}-${filters.to.replace(/-/g, '')}`;
      }
      finalFilename += `_${totalRecords}records.pdf`;
    }
    
    doc.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error("❌ Punch logs PDF export failed:", error);
    throw error;
  }
};

export default {
  exportPunchLogsCSV,
  exportPunchLogsPDF,
  exportBoth,
  exportDeletionRequestsCSV,
  exportDeletionRequestsPDF,
  exportContestLogsCSV,
  exportContestLogsPDF,
  exportDepartmentsCSV,
  exportDepartmentsPDF,
  exportEmployeesCSV,     
  exportEmployeesPDF,
  exportEmployeePunchLogsCSV,
  exportEmployeePunchLogsPDF,
  formatUserForFilename,
  getTimestampForFilename,
  getFormattedTimestamp,
  clearUserCache,
};