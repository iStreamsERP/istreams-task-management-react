import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashBoardProgressTableDetails } from "@/services/iStDashBoardServices";

const ProgressTable = ({ DashBoardID, ProgressTableNo }) => {
  const { userData } = useAuth();
  const [dbData, setDbData] = useState([]);

  useEffect(() => {
    if (DashBoardID && ProgressTableNo) {
      fetchTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DashBoardID, ProgressTableNo]);

  const fetchTableData = async () => {
    try {
      const tableParams = { DashBoardID, ProgressTableNo };
      const master = await getDashBoardProgressTableDetails(
        tableParams,
        userData.currentUserLogin,
        userData.clientURL
      );

      console.log("Fetched table data:", master);
      if (Array.isArray(master)) {
        setDbData(master);
      } else {
        console.warn("Expected array, got:", master);
        setDbData([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      setDbData([]);
    }
  };

  const hasNoData = Array.isArray(dbData) && dbData.length === 0;

  const formatHeader = (header) => {
    const cleaned = header.replace(/[_\-.]/g, " ").toLowerCase();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const totals = {};
  if (dbData.length > 0) {
    Object.keys(dbData[0]).forEach((key) => {
      const total = dbData.reduce((sum, item) => {
        const value = parseFloat(item[key]);
        return !isNaN(value) ? sum + value : sum;
      }, 0);
      totals[key] = total > 0 ? total : "-";
    });
  }

  return (
    <div className="p-4">
      {hasNoData ? (
        <div className="text-center text-red-500 font-bold text-lg p-4">
          No data available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(dbData[0]).map((key) => (
                  <th
                    key={key}
                    className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b"
                  >
                    {formatHeader(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dbData.map((item, index) => (
                <tr key={index}>
                  {Object.keys(item).map((key) => (
                    <td
                      key={key}
                      className="px-4 py-2 text-sm text-gray-800 border-b"
                    >
                      {item[key]}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Total row */}
              <tr className="font-semibold bg-gray-200">
                {Object.keys(dbData[0]).map((key, i) => (
                  <td key={key} className="px-4 py-2 border-t text-sm">
                    {i === 0 ? "Total" : totals[key]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProgressTable;
