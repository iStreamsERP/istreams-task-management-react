import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, getEmployeeImage } from "@/services/employeeService";
import { createNewTask, getUserTasks } from "@/services/taskService";
import { format } from "date-fns";
import { CalendarDays, Link2, User } from "lucide-react";
import { useEffect, useState } from "react";
import Profile from "../assets/default.jpeg";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
 
const DEFAULT_IMAGE = Profile;
 
const CreateTask = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
 
  const [taskName, setTaskName] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [relatedTo, setRelatedTo] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [remindOnDate, setRemindOnDate] = useState(null);
  const [creatorReminderOn, setCreatorReminderOn] = useState(null);
 
  const [assignedUserImage, setAssignedUserImage] = useState(DEFAULT_IMAGE);
  const [assignedUserName, setAssignedUserName] = useState("");
  const [creatorUserImages, setCreatorUserImages] = useState({});
  const relatedOptions = ["Invoice", "Contract", "Report", "Memo", "Projects"];
 
  // Convert date to string format for API
  const formatDateForAPI = (date) => {
    return date ? format(date, "yyyy-MM-dd") : "";
  };
 
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await getAllUsers(
          userData.currentUserLogin,
          userData.clientURL
        );
        setUsers(res);
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);
 
  useEffect(() => {
    if (assignedTo) {
      fetchUserTasks(assignedTo);
      fetchAssignedUserImage(assignedTo);
    } else {
      setUserTasks([]);
      setFilteredTasks([]);
      setAssignedUserImage(DEFAULT_IMAGE);
      setAssignedUserName("");
    }
  }, [assignedTo]);
 
  // Updated filtering logic that filters tasks based on both start date and end date
  useEffect(() => {
    if (userTasks.length > 0) {
      const filtered = userTasks.filter((task) => {
        // Get the task date from the .NET date format
        const taskStartDate = task.ASSIGNED_START_DATE ? convertDotNetDateToJSDate(task.ASSIGNED_START_DATE) : null;
        const taskEndDate = task.COMPLETION_DATE ? convertDotNetDateToJSDate(task.COMPLETION_DATE) : null;
        
        // If no dates are selected, show all tasks
        if (!startDate && !endDate) return true;
        
        // If only startDate is selected
        if (startDate && !endDate) {
          return taskStartDate && isSameOrAfter(taskStartDate, startDate);
        }
        
        // If only endDate is selected
        if (!startDate && endDate) {
          return taskEndDate && isSameOrBefore(taskEndDate, endDate);
        }
        
        // If both dates are selected, filter tasks that fall within the range
        if (startDate && endDate) {
          // For tasks with only start date (no end date)
          if (taskStartDate && !taskEndDate) {
            return isSameOrAfter(taskStartDate, startDate);
          }
          
          // For tasks with only end date (no start date)
          if (!taskStartDate && taskEndDate) {
            return isSameOrBefore(taskEndDate, endDate);
          }
          
          // For tasks with both dates
          if (taskStartDate && taskEndDate) {
            return (
              (isSameOrAfter(taskStartDate, startDate) && isSameOrBefore(taskStartDate, endDate)) || 
              (isSameOrAfter(taskEndDate, startDate) && isSameOrBefore(taskEndDate, endDate)) ||
              (isBefore(taskStartDate, startDate) && isAfter(taskEndDate, endDate))
            );
          }
        }
        
        return false;
      });
      
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks([]);
    }
  }, [startDate, endDate, userTasks]);
  
  // Helper function to compare dates (same day or after)
  const isSameOrAfter = (date1, date2) => {
    return date1 >= new Date(date2.setHours(0, 0, 0, 0));
  };
  
  // Helper function to compare dates (same day or before)
  const isSameOrBefore = (date1, date2) => {
    return date1 <= new Date(date2.setHours(23, 59, 59, 999));
  };
  
  // Helper function to check if date1 is before date2
  const isBefore = (date1, date2) => {
    return date1 < new Date(date2.setHours(0, 0, 0, 0));
  };
  
  // Helper function to check if date1 is after date2
  const isAfter = (date1, date2) => {
    return date1 > new Date(date2.setHours(23, 59, 59, 999));
  };
 
  const convertDotNetDateToJSDate = (dotNetDateString) => {
    if (!dotNetDateString) return null;
    const timestampMatch = dotNetDateString.match(/\/Date\((\d+)\)\//);
    if (!timestampMatch) return null;
 
    const timestamp = parseInt(timestampMatch[1], 10);
    return new Date(timestamp);
  };
 
  const fetchUserTasks = async (userName) => {
    setIsLoading(true);
    const Selectuser = { UserName: userName };
    try {
      const response = await getUserTasks(
        Selectuser,
        userData.currentUserLogin,
        userData.clientURL
      );
      setUserTasks(response);
      setFilteredTasks(response);
     

      const newCreatorImages = {};
      for (const task of response) {
        if (task.CREATOR_EMP_NO) {
          newCreatorImages[task.CREATOR_EMP_NO] = await fetchCreatorImage(
            task.CREATOR_EMP_NO
          );
        }
      }
      setCreatorUserImages(newCreatorImages);
    } catch (error) {
      console.error("Failed to fetch user tasks", error);
    } finally {
      setIsLoading(false);
    }
  };
 function parseMicrosoftDate(msDate) {
    if (!msDate) return null;
    
    const match = /\/Date\((\d+)\)\//.exec(msDate);
    if (match) {
      const timestamp = parseInt(match[1], 10);
      return new Date(timestamp);
    }
    return null;
  }

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
const overdueTasks = filteredTasks.filter((task) => {
  const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
  return (
    completionDate && 
    completionDate < today && 
    task.STATUS !== "COMPLETED"
  );
}).length;

  const fetchAssignedUserImage = async (userName) => {
    const selectedUser = users.find((u) => u.user_name === userName);
    if (!selectedUser) {
      setAssignedUserImage(DEFAULT_IMAGE);
      setAssignedUserName("Unknown");
      return;
    }
 
    const empNo = selectedUser.emp_no;
 
    try {
      const imageData = await getEmployeeImage(
        empNo,
        userData.currentUserLogin,
        userData.clientURL
      );
      setAssignedUserImage(
        imageData ? `data:image/jpeg;base64,${imageData}` : DEFAULT_IMAGE
      );
      setAssignedUserName(selectedUser.user_name);
    } catch (error) {
      console.error("Error fetching assigned user image", error);
      setAssignedUserImage(DEFAULT_IMAGE);
      setAssignedUserName(userName);
    }
  };
 
  const fetchCreatorImage = async (empNo) => {
    try {
      const imageData = await getEmployeeImage(
        empNo,
        userData.currentUserLogin,
        userData.clientURL
      );
      return imageData ? `data:image/jpeg;base64,${imageData}` : DEFAULT_IMAGE;
    } catch (error) {
      console.error("Error fetching creator user image", error);
      return DEFAULT_IMAGE;
    }
  };
 
  const handleCreateTask = async (e) => {
    e.preventDefault();
 
    if (!taskName || !taskSubject || !assignedTo) {
      alert("Please fill in all required fields");
      return;
    }
 
    setIsLoading(true);
    const TaskData = {
      UserName: userData.currentUserName,
      Subject: taskSubject,
      Details: taskName,
      RelatedTo: relatedTo,
      AssignedUser: assignedTo,
      CreatorReminderOn: formatDateForAPI(creatorReminderOn),
      StartDate: formatDateForAPI(startDate),
      CompDate: formatDateForAPI(endDate),
      RemindTheUserOn: formatDateForAPI(remindOnDate),
    };
 
    try {
      await createNewTask(
        TaskData,
        userData.currentUserLogin,
        userData.clientURL
      );
      alert("Task created successfully!");
      // Reset form
      setTaskName("");
      setTaskSubject("");
      setAssignedTo("");
      setRelatedTo("");
      setStartDate(null);
      setEndDate(null);
      setRemindOnDate(null);
      setCreatorReminderOn(null);
 
      if (assignedTo) {
        await fetchUserTasks(assignedTo);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDotNetDate = (dotNetDateString) => {
    if (!dotNetDateString) return "Not set";
    const date = convertDotNetDateToJSDate(dotNetDateString);
    return date ? format(date, "dd MMM yyyy") : "Invalid date";
  };
 
  const handleStartDateChange = (date) => {
    setStartDate(date);
  };
  
  const handleEndDateChange = (date) => {
    setEndDate(date);
  };
  
  // Get date range description
  const getDateRangeDescription = () => {
    if (startDate && endDate) {
      return `Tasks from ${format(startDate, "MMM dd, yyyy")} to ${format(endDate, "MMM dd, yyyy")}`;
    } else if (startDate) {
      return `Tasks from ${format(startDate, "MMM dd, yyyy")} onwards`;
    } else if (endDate) {
      return `Tasks due by ${format(endDate, "MMM dd, yyyy")}`;
    } else {
      return "All assigned tasks";
    }
  };
 
  return (
   
      <Card className="bg-white dark:bg-gray-900 border p-0 dark:border-gray-800 shadow-sm">
        <form onSubmit={handleCreateTask}>
          <div className="grid grid-cols-1  lg:grid-cols-8  gap-0">
            {/* Left Form */}
            <div className="lg:col-span-4 rounded-xl p-6 bg-white dark:bg-gray-900  ">
              <CardHeader className="px-0 pt-0 p-0 ">
                <CardTitle className="text-xl font-semibold">
                  Create New Task
                </CardTitle>
               
              </CardHeader>
 
            </div>
 
            {/* Right Panel - Task Preview */}
        
          </div>
        </form>
        
      </Card>
 
  );
};
 
export default CreateTask;