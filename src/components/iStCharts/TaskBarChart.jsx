import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTasks } from "@/services/taskService";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
 
// Month labels in order
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
 
const parseDotNetDate = (dotNetDateStr) => {
  if (!dotNetDateStr) return null;
  try {
    const timestamp = parseInt(dotNetDateStr.replace("/Date(", "").replace(")/", ""), 10);
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
 
    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth(), // 0-11
      label: MONTH_LABELS[date.getMonth()],
    };
  } catch {
    return null;
  }
};

// Utility function to validate if response is an array
const validateArrayResponse = (response) => {
  if (typeof response === 'string') {
    // If response is a string, it's likely an error message
    throw new Error(response);
  }
  
  if (!Array.isArray(response)) {
    // Convert single object to array if necessary
    if (response && typeof response === 'object') {
      return [response];
    }
    throw new Error('Invalid response format: Expected array or object');
  }
  
  return response;
};
 
export function TaskBarChart() {
  const { userData } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [chartData, setChartData] = useState([]);
  const [relatedKeys, setRelatedKeys] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  useEffect(() => {
    fetchUserTasks();
  }, [userData]);
 
  useEffect(() => {
    if (selectedYear && allTasks.length > 0) {
      prepareChartDataForYear(selectedYear);
    }
  }, [selectedYear, allTasks]);
 
  const fetchUserTasks = async () => {
    try {
      setLoading(true);
      setError(null);
 
      if (!userData?.currentUserName) {
        throw new Error("User data is not available");
      }

      console.log("Fetching tasks for user:", userData.currentUserName);
 
      const loginUsername = userData.currentUserName;
      const selectUser = { 
        UserName: loginUsername,
        // Add a unique identifier to avoid DataSet conflicts
        RequestId: Date.now().toString()
      };
      
      const res = await getUserTasks(
        selectUser,
        userData.currentUserLogin,
        userData.clientURL
      );

      console.log("Raw API response:", res);

      // Validate the response format
      const validatedResponse = validateArrayResponse(res);
      console.log("Validated response:", validatedResponse);
 
      const updatedTasks = validatedResponse.map((tdata) => {
        // Ensure tdata is an object
        if (!tdata || typeof tdata !== 'object') {
          console.warn("Invalid task data:", tdata);
          return null;
        }

        let newStatus = tdata.STATUS;
        if (tdata.STATUS === "NEW") {
          newStatus = tdata.CREATED_USER === tdata.ASSIGNED_USER ? "Pending" : "Awaiting for Acceptance";
        } else if (tdata.STATUS === "ACCEPTED") {
          newStatus = "Pending";
        }
 
        return {
          ...tdata,
          NEW_STATUS: newStatus,
        };
      }).filter(Boolean); // Remove null entries

      console.log("Processed tasks:", updatedTasks);
 
      setAllTasks(updatedTasks);
 
      // Extract available years
      const years = new Set();
      updatedTasks.forEach(task => {
        const parsed = parseDotNetDate(task.ASSIGNED_START_DATE);
        if (parsed) years.add(parsed.year);
      });
 
      const sortedYears = Array.from(years).sort((a, b) => b - a); // Sort descending
      setAvailableYears(sortedYears);
      setSelectedYear(sortedYears[0]?.toString() || new Date().getFullYear().toString());
      
      console.log("Available years:", sortedYears);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      
      // Handle different types of errors
      let errorMessage = "Failed to load task data. Please try again later.";
      
      if (error.message) {
        // Check for specific error messages
        if (error.message.includes("DataTable named 'task_list' already belongs")) {
          errorMessage = "Database conflict detected. Please refresh the page and try again.";
        } else if (error.message.includes("Object reference not set")) {
          errorMessage = "Server configuration issue. Please contact support if this persists.";
        } else if (error.message.includes("Expected array response")) {
          errorMessage = "Data format error. The server returned an unexpected response format.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
 
  const prepareChartDataForYear = (year) => {
    const filteredTasks = allTasks.filter(task => {
      const parsed = parseDotNetDate(task.ASSIGNED_START_DATE);
      return parsed?.year === parseInt(year);
    });
 
    const monthMap = {};
    const uniqueRelatedOn = new Set();
 
    // Initialize all 12 months with zeroed values
    for (let i = 0; i < 12; i++) {
      monthMap[i] = { month: MONTH_LABELS[i] };
    }
 
    filteredTasks.forEach((task) => {
      const parsed = parseDotNetDate(task.ASSIGNED_START_DATE);
      if (!parsed) return;
 
      const monthIndex = parsed.monthIndex;
      const relatedKey = task.RELATED_ON || "Uncategorized";
 
      if (!monthMap[monthIndex][relatedKey]) {
        monthMap[monthIndex][relatedKey] = 0;
      }
 
      monthMap[monthIndex][relatedKey] += 1;
      uniqueRelatedOn.add(relatedKey);
    });
 
    const finalChartData = Object.values(monthMap);
    setChartData(finalChartData);
    setRelatedKeys(Array.from(uniqueRelatedOn).sort());
  };

  // Enhanced retry function that clears potential conflicts
  const handleRetry = async () => {
    // Clear all state first
    setAllTasks([]);
    setChartData([]);
    setRelatedKeys([]);
    setAvailableYears([]);
    setError(null);
    
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retry the fetch
    await fetchUserTasks();
  };
 
  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#64748b", "#a855f7",
    "#06b6d4", "#d946ef"
  ];
 
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Task Distribution Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleRetry} disabled={loading}>
                {loading ? "Retrying..." : "Retry"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }
 
  return (
    <Card className="w-full h-full bg-white shadow-md dark:bg-slate-950 flex-col">
      <CardHeader className="border-b">
        <div className="flex flex-col space-y-1.5 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Task Distribution</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Monthly breakdown of tasks by category
            </CardDescription>
          </div>
          {!loading && availableYears.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Year</span>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                disabled={loading}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ) : (
          <div className="h-[300px]">
            {relatedKeys.length > 0 ? (
              <ResponsiveContainer width="100%" className={"text-sm"} height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    contentStyle={{
                      fontSize: '12px',
                    }}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    contentStyle={{
                      fontSize: '12px'
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'calc(var(--radius) - 2px)',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                    itemStyle={{
                      color: 'hsl(var(--foreground))',
                      width: '50%'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: 500,
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '10px',
                      textAlign: 'center',
                      fontSize: '12px'
                    }}
                  />
                  {relatedKeys.map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={colors[index % colors.length]}
                      name={key}
                      style={{
                        fontSize: '12px'
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <div className="text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto h-12 w-12 opacity-50"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">No data available</h3>
                <p className="text-sm text-muted-foreground">
                  {availableYears.length > 0
                    ? `No tasks found for ${selectedYear}. Try selecting a different year.`
                    : "No task data available yet."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleRetry}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh data"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}