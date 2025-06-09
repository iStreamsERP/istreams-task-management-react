import React, { useCallback, useState, useEffect, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { Label, Pie, PieChart, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTasks } from "@/services/taskService";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const colorPool = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Utility function to validate if response is an array
const validateArrayResponse = (response) => {
  if (typeof response === 'string') {
    throw new Error(response);
  }
  
  if (!Array.isArray(response)) {
    if (response && typeof response === 'object') {
      return [response];
    }
    throw new Error('Invalid response format: Expected array or object');
  }
  
  return response;
};

export function TaskStatusChart() {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smallScreen, setSmallScreen] = useState(window.innerWidth < 768);
  
  // Use refs to track request state and prevent race conditions
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Memoize user data to prevent unnecessary re-renders
  const userDataMemo = React.useMemo(() => {
    if (!userData?.currentUserName || !userData?.currentUserLogin || !userData?.clientURL) {
      return null;
    }
    return {
      userName: userData.currentUserName,
      userLogin: userData.currentUserLogin,
      clientURL: userData.clientURL
    };
  }, [userData?.currentUserName, userData?.currentUserLogin, userData?.clientURL]);

  const fetchTasks = useCallback(async (forceRefresh = false) => {
    // Don't fetch if user data is not available
    if (!userDataMemo) {
      if (isInitialLoadRef.current) {
        setLoading(false);
        setError("User authentication data is missing");
      }
      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    // Only show loading on initial load or forced refresh
    if (isInitialLoadRef.current || forceRefresh) {
      setLoading(true);
    }
    
    setError(null);

    try {
      console.log("Fetching tasks for user:", userDataMemo.userName);

      const selectUser = { 
        UserName: userDataMemo.userName,
        RequestId: currentRequestId.toString() // Use incremental ID instead of timestamp
      };
      
      const res = await getUserTasks(
        selectUser,
        userDataMemo.userLogin,
        userDataMemo.clientURL,
        { signal: abortControllerRef.current.signal } // Pass abort signal if supported
      );

      // Check if this response is still current
      if (currentRequestId !== requestIdRef.current) {
        console.log("Discarding stale response");
        return;
      }

      console.log("Raw API response:", res);

      const validatedResponse = validateArrayResponse(res);
      console.log("Validated response:", validatedResponse);

      const updatedTasks = validatedResponse
        .map((task) => {
          if (!task || typeof task !== 'object') {
            console.warn("Invalid task data:", task);
            return null;
          }

          let newStatus = task.STATUS;

          if (task.STATUS === "NEW") {
            newStatus = task.CREATED_USER === task.ASSIGNED_USER 
              ? "Pending" 
              : "Awaiting Acceptance";
          } else if (task.STATUS === "ACCEPTED") {
            newStatus = "Pending";
          }
          
          return {
            ...task,
            NEW_STATUS: newStatus,
          };
        })
        .filter(Boolean);

      console.log("Processed tasks:", updatedTasks);
      setTasks(updatedTasks);
      
    } catch (error) {
      // Ignore aborted requests
      if (error.name === 'AbortError') {
        console.log("Request was aborted");
        return;
      }

      // Check if this error is still current
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to fetch tasks:", error);
      
      let errorMessage = "Failed to load task data. Please try again later.";
      
      if (error.message) {
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
      setTasks([]);
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, [userDataMemo]);

  // Enhanced retry function
  const handleRetry = useCallback(async () => {
    setError(null);
    await fetchTasks(true);
  }, [fetchTasks]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch tasks when user data changes
  useEffect(() => {
    fetchTasks();
    
    // Cleanup function to cancel ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  // Memoized chart data calculation
  const chartData = React.useMemo(() => {
    if (!tasks.length) return [];

    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.NEW_STATUS] = (acc[task.NEW_STATUS] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count], index) => ({
      status,
      count,
      fill: colorPool[index % colorPool.length],
    }));
  }, [tasks]);

  const totalTasks = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const chartConfig = React.useMemo(() => {
    const config = {
      count: { label: "Tasks" },
    };
    chartData.forEach((item) => {
      config[item.status] = {
        label: item.status,
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);

  // Show loading state only on initial load
  if (loading && isInitialLoadRef.current) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Task Status</CardTitle>
          <CardDescription>Loading task distribution...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-xl">
        <CardHeader className="items-center pb-0">
          <CardTitle>Task Status</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[250px] gap-2">
          <Alert variant="destructive" className="max-w-sm">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error loading data</AlertTitle>
            <AlertDescription className="text-xs">
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleRetry}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs disabled:opacity-50"
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="flex flex-col bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-xl">
        <CardHeader className="items-center pb-0">
          <CardTitle>Task Status</CardTitle>
          <CardDescription>No tasks available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center min-h-[250px]">
          <div className="text-center text-muted-foreground text-sm">
            <div className="mb-4">
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
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <p className="mb-2">No task data to display</p>
            <button
              onClick={handleRetry}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col bg-white dark:bg-slate-950 border dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 shadow-sm hover:shadow-xl">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl font-bold">Task Status Distribution</CardTitle>
        <CardDescription>
          {totalTasks} tasks across {chartData.length} statuses
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={smallScreen ? 50 : 50}
              outerRadius={smallScreen ? 70 : 90}
              strokeWidth={5}
              paddingAngle={smallScreen ? 1 : 2}
              labelLine={true}
              edgeMode={"inside"}
              cornerRadius={5}
            >
              <Label
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox;
                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={cx}
                        y={cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totalTasks.toLocaleString()}
                      </tspan>
                      <tspan
                        x={cx}
                        y={cy + 24}
                        className="fill-muted-foreground"
                      >
                        Total Tasks
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <Legend
              layout="horizontal"
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              verticalAlign="bottom"
              align="center"
              fontSize={"12px"}
              fontWeight={900}
              iconType="circle"
              iconSize={10}
              iconPosition="start"
              wrapperClassName="gap-2"
              contentClassName="gap-2"
              wrapperStyle={{
                paddingTop: "10px",
              }}
              formatter={(value) => {
                const dataItem = chartData.find((d) => d.status === value);
                if (!dataItem) return value;
                const percentage = ((dataItem.count / totalTasks) * 100).toFixed(1);
                return `${value}: ${dataItem.count} (${percentage}%)`;
              }}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 mt-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Updated:{" "}
          {new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </CardFooter>
    </Card>
  );
}