import { TaskBarChart } from "@/components/iStCharts/TaskBarChart";
import { TaskStatusChart } from "@/components/iStCharts/TaskStatusDonutChart";
import RecentMessage from "@/components/iStTables/RecentMessage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { getEmployeeImage } from "@/services/employeeService";
import { getUserTasks } from "@/services/taskService";
import { toTitleCase } from "@/utils/stringUtils";
import { TrendingUp } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewAllTable, SetViewAllTable] = useState(false);
  
  const navigate = useNavigate();
  const DEFAULT_IMAGE = "/default-user.png";

  // Improved fetchUser function with better error handling and retry logic
  const fetchUser = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    // Validate required user data
    if (!userData?.currentUserName || !userData?.currentUserLogin || !userData?.clientURL) {
      console.error("Missing required user data:", userData);
      setError("Missing user authentication data. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const SelectUser = { 
        UserName: userData.currentUserName?.trim(),
        // Add additional parameters if needed by your API
        // ClientURL: userData.clientURL,
        // UserLogin: userData.currentUserLogin
      };

      // Race between actual request and timeout
      const taskPromise = getUserTasks(
        SelectUser,
        userData.currentUserLogin,
        userData.clientURL
      );
      
      const res = await Promise.race([taskPromise, timeoutPromise]);
      
      // Validate response
      if (!res) {
        throw new Error('No data received from server');
      }
      
      if (!Array.isArray(res)) {
        console.warn('Unexpected response format:', res);
        throw new Error('Invalid response format from server');
      }

      console.log(`Fetched ${res.length} tasks successfully`);
      
      const loginUsername = userData.currentUserLogin;

      // Process tasks with improved status logic
      const updatedTasks = res.map((tdata) => {
        if (!tdata) return null; // Skip null/undefined tasks
        
        let newStatus = tdata.STATUS;

        if (tdata.STATUS === "NEW") {
          if (tdata.CREATED_USER === tdata.ASSIGNED_USER) {
            newStatus = "Pending";
          } else if (
            loginUsername === tdata.CREATED_USER ||
            loginUsername === tdata.ASSIGNED_USER
          ) {
            newStatus = "Awaiting for Acceptance";
          } else {
            newStatus = "Awaiting for Acceptance";
          }
        } else if (tdata.STATUS === "ACCEPTED") {
          newStatus = "Pending";
        }

        return {
          ...tdata,
          NEW_STATUS: newStatus,
        };
      }).filter(Boolean); // Remove null tasks

      // Fetch employee images with improved error handling
      const tasksWithImages = await Promise.allSettled(
        updatedTasks.map(async (task) => {
          if (!task.ASSIGNED_EMP_NO) {
            return {
              ...task,
              assignedEmpImage: DEFAULT_IMAGE,
            };
          }

          try {
            const imageData = await getEmployeeImage(
              task.ASSIGNED_EMP_NO,
              userData.currentUserLogin,
              userData.clientURL
            );

            return {
              ...task,
              assignedEmpImage: imageData
                ? `data:image/jpeg;base64,${imageData}`
                : DEFAULT_IMAGE,
            };
          } catch (error) {
            console.warn(
              `Failed to fetch image for employee ${task.ASSIGNED_EMP_NO}:`,
              error.message
            );
            return {
              ...task,
              assignedEmpImage: DEFAULT_IMAGE,
            };
          }
        })
      );

      // Extract successful results and handle failures
      const finalTasks = tasksWithImages
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean);

      console.log(`Successfully processed ${finalTasks.length} tasks with images`);
      
      setTasks(finalTasks);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      
      // Implement retry logic for network errors
      if (retryCount < MAX_RETRIES && (
        error.message === 'Request timeout' || 
        error.message.includes('network') ||
        error.message.includes('fetch')
      )) {
        console.log(`Retrying... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
        setTimeout(() => {
          fetchUser(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      const errorMessage = error.message === 'Request timeout' 
        ? "Request timed out. Please check your connection and try again."
        : error.message || "Failed to load tasks. Please try again later.";
        
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [userData?.currentUserName, userData?.currentUserLogin, userData?.clientURL]);

  // Add effect cleanup and better dependency handling
  useEffect(() => {
    let isMounted = true;
    
    if (userData?.currentUserName && userData?.currentUserLogin && userData?.clientURL) {
      if (isMounted) {
        fetchUser();
      }
    } else {
      console.warn('User data not ready yet:', userData);
      setIsLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchUser]);

  // Enhanced date parsing with better error handling
  function parseMicrosoftDate(msDate) {
    if (!msDate) return null;

    try {
      const match = /\/Date\((\d+)\)\//.exec(msDate);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        if (isNaN(timestamp)) return null;
        return new Date(timestamp);
      }
      
      // Try parsing as regular date string as fallback
      const date = new Date(msDate);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn('Failed to parse date:', msDate, error);
      return null;
    }
  }

  // Calculate stats with improved error handling
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const totalTasks = tasks.length;
  const newTasks = tasks.filter((task) => task?.STATUS === "NEW").length;
  const overdueTasks = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE || task?.STATUS === "NEW") return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate < today;
  }).length;
  const currentTask = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= today;
  }).length;

  const tasksLast7Days = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= sevenDaysAgo && completionDate <= today;
  });

  const totalTasks7Days = tasksLast7Days.length;
  const newTasks7Days = tasksLast7Days.filter((task) => task?.STATUS === "NEW").length;
  const overdueTasks7Days = tasksLast7Days.filter((task) => {
    if (!task?.COMPLETION_DATE || task?.STATUS === "NEW") return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate < today;
  }).length;
  const currentTasks7Days = tasksLast7Days.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= today;
  }).length;

  function getStatusBadgeClass(NEW_STATUS) {
    switch (NEW_STATUS) {
      case "Pending":
        return "bg-blue-100 text-blue-600";
      case "Awaiting for Acceptance":
        return "bg-orange-100 text-orange-600";
      case "REJECTED":
        return "bg-red-100 text-red-600";
      case "COMPLETED":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  // Enhanced loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard data...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-red-50 rounded-lg max-w-md">
          <div className="text-red-500 text-xl mb-2">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="space-x-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                setError(null);
                fetchUser();
              }}
            >
              Retry
            </button>
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no user data
  if (!userData?.currentUserName) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-yellow-50 rounded-lg">
          <div className="text-yellow-600 text-xl mb-2">Authentication Required</div>
          <p className="text-gray-700">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex-1 w-full">
        <Card className="p-6 mb-4 hover:shadow-xl bg-white border dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
          <div className="flex items-center gap-x-4">
            <div className="relative w-20 h-20 group">
              <img
                src={userData.currentUserImageData || DEFAULT_IMAGE}
                alt="User Avatar"
                className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl transform group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.src = DEFAULT_IMAGE;
                }}
              />
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            </div>

            <div>
              <h1 className="md:text-2xl text-lg font-bold">
                Welcome back, {toTitleCase(userData.currentUserName)} 👋
              </h1>
              <p className="text-gray-400 md:text-sm text-xs">
                Here's what's happening with your account today
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {/* Total Tasks Card */}
        <Card className="hover:shadow-lg transition-all duration-300 border bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <h3 className="text-2xl font-bold mt-1">{totalTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{totalTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>

        {/* New Tasks Card */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:shadow-xl bg-white border dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">New Tasks</p>
                <h3 className="text-2xl font-bold mt-1">{newTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Awaiting for Acceptance</span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks Card */}
        <Card className="hover:shadow-lg transition-all bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 duration-300 border border-red-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Overdue Tasks
                </p>
                <h3 className="text-2xl font-bold mt-1">{overdueTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{overdueTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Tasks Card */}
        <Card className="hover:shadow-lg transition-all bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 duration-300 border border-yellow-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current Tasks
                </p>
                <h3 className="text-2xl font-bold mt-1">{currentTask}</h3>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-yellow-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{currentTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 grid-cols-1 lg:grid-cols-2 mt-3 w-full ">
        <div>
          <TaskStatusChart />
        </div>
        <div>
          <div className="w-full bg-white rounded-lg border shadow-lg hover:shadow-xl dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
            <RecentMessage />
          </div>
        </div>
      </div>
      
      <TaskBarChart />
      
      <div className="overflow-y-auto w-full h-[420px] shadow-lg hover:shadow-xl rounded-lg whitespace-nowrap border p-3 pb-2 border-blue-100/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300">
        <Table className="w-full">
          <TableHeader className="w-full sticky top-0">
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Assigned by</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="w-full">
            {tasks.length > 0 ? (
              (viewAllTable ? tasks : tasks.slice(0, 5)).map((task, index) => (
                <TableRow key={task.TASK_ID || index}>
                  <TableCell className="flex-col">
                    <div>{task.TASK_NAME || 'Unnamed Task'}</div>
                    <Badge className="mt-1 text-xs text-purple-600 bg-purple-200">
                      {task.TASK_ID || 'No ID'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img
                        src={task.assignedEmpImage || DEFAULT_IMAGE}
                        alt="User"
                        className="rounded-lg w-6 h-6"
                        onError={(e) => {
                          e.target.src = DEFAULT_IMAGE;
                        }}
                      />
                      <span className="truncate">
                        {task.ASSIGNED_USER ? task.ASSIGNED_USER.toUpperCase() : 'Unassigned'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.CREATED_USER === "***00***"
                      ? "SYSTEM"
                      : task.CREATED_USER ? task.CREATED_USER.toUpperCase() : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(task.NEW_STATUS)}>
                      {task.NEW_STATUS || 'Unknown'}
                    </Badge>
                    <div className="mt-1">
                      <span className="text-xs font-medium text-gray-500">
                        {task.date || "25-10-2025"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button 
                      onClick={() => navigate(`/taskview?taskId=${task.TASK_ID}`)}
                      disabled={!task.TASK_ID}
                    >
                      <Badge
                        variant="outline"
                        className="text-xs scale-100 shadow-sm hover:shadow-lg transition-all hover:scale-105 duration-300"
                      >
                        View
                      </Badge>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No tasks available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-end justify-end mt-2 relative">
          <div className="text-xs absolute text-gray-500 font-medium top-1 left-1 z-10">
            Total No Of Tasks: <span className="font-bold">{tasks.length}</span>
          </div>
          <button
            onClick={() => SetViewAllTable(!viewAllTable)}
            className="px-3 py-1 text-xs btn btn-xs font-medium rounded border bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50"
          >
            {viewAllTable ? "Hide" : `View ${tasks.length}+ More`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;