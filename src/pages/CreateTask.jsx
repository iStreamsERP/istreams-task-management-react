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
import { Calendar } from "@/components/ui/calendar";
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
 
              <div>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="task-title">Task Title*</Label>
                  <Input
                    id="task-title"
                    placeholder="Enter task title"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    required
                    className="focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
 
                <div className="space-y-2 mt-2">
                  <Label htmlFor="task-description">Task Description*</Label>
                  <Textarea
                    id="task-description"
                    placeholder="Describe the task in detail"
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="min-h-[20px] focus-visible:ring-2 focus-visible:ring-primary"
                    required
                  />
                </div>
 
                <div className="grid grid-cols-1 mt-5  md:grid-cols-2 gap-4">
                  {/* Assigned To field */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="assigned-to"
                    >
                      <User className="w-4 h-4" />
                      Assigned To*
                    </Label>
                    <Select
                      id="assigned-to"
                      value={assignedTo}
                      onValueChange={setAssignedTo}
                      required
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900">
                        {users.map((user) => (
                          <SelectItem
                            key={user.user_name}
                            value={user.user_name}
                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {user.user_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
 
                  {/* Related To field */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="related-to"
                    >
                      <Link2 className="w-4 h-4" />
                      Related To
                    </Label>
                    <Select
                      id="related-to"
                      value={relatedTo}
                      onValueChange={setRelatedTo}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-primary">
                        <SelectValue placeholder="Select related option" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900">
                        {relatedOptions.map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
 
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="start-date"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Start Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="start-date"
                          variant={"outline"}
                          className="w-full justify-start text-left bg-white dark:bg-gray-900 font-normal focus:ring-2 focus:ring-primary"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 " />
                          {startDate ? (
                            format(startDate, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={handleStartDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
 
                  {/* Completed Date */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="end-date"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Due Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="end-date"
                          variant={"outline"}
                          className="w-full justify-start text-left bg-white dark:bg-gray-900 font-normal focus:ring-2 focus:ring-primary"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? (
                            format(endDate, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto bg-white dark:bg-gray-900 p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={handleEndDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
 
                  {/* Remind User On */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="remind-user"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Remind {assignedUserName} On
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="remind-user"
                          variant={"outline"}
                          className="w-full justify-start bg-white dark:bg-gray-900 text-left font-normal focus:ring-2 focus:ring-primary"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {remindOnDate ? (
                            format(remindOnDate, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto bg-white dark:bg-gray-900 p-0">
                        <Calendar
                          mode="single"
                          selected={remindOnDate}
                          onSelect={setRemindOnDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
 
                  {/* Remind Me On */}
                  <div className="space-y-2">
                    <Label
                      className="flex items-center gap-2"
                      htmlFor="remind-me"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Remind Me On
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="remind-me"
                          variant={"outline"}
                          className="w-full justify-start bg-white dark:bg-gray-900 text-left font-normal focus:ring-2 focus:ring-primary"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {creatorReminderOn ? (
                            format(creatorReminderOn, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto bg-white dark:bg-gray-900 p-0">
                        <Calendar
                          mode="single"
                          selected={creatorReminderOn}
                          onSelect={setCreatorReminderOn}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                  <div className="flex justify-end pt-2 mt-2">
                  <Button
                    type="submit"
                    className="w-full md:w-auto px-6"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Task"}
                  </Button>
                </div>        
               
              </div>
             
            </div>
 
            {/* Right Panel - Task Preview */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-r-xl lg:col-span-4 p-6 border-l  border-gray-200 dark:border-gray-800">
              <CardHeader className="px-0 pt-0 p-0 mb-2">
                <CardTitle className="text-xl font-semibold">
                  {getDateRangeDescription()}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                  {assignedTo
                    ? `Tasks assigned to ${assignedUserName}`
                    : "Select an assignee to view tasks"}
                </CardDescription>
              </CardHeader>
 
              {assignedTo && (
                <div className="flex items-center gap-3 mb-2 p-2  bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={assignedUserImage} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {assignedUserName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{assignedUserName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {filteredTasks.length}{" "}
                      {filteredTasks.length === 1 ? "task" : "tasks"} assigned
                    </p>
                  </div>
                </div>
              )}
 
              <Separator className="my-2" />
 
              <ScrollArea className="h-full w-full h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden">
                <div className="relative">
                  {/* Vertical timeline with gradient */}
                  <div
                    className={`absolute left-[72px] top-0 h-full w-0.5 bg-gradient-to-b from-blue-400/30 via-purple-400/30 to-pink-400/30 dark:from-blue-600/30 dark:via-purple-600/30 dark:to-pink-600/30 ${
                      assignedTo ? "" : "hidden"
                    }`}
                  />
 
                  {isLoading ? (
                    <div className="space-y-4 p-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="h-24 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                        />
                      ))}
                    </div>
                  ) : filteredTasks.length > 0 ? (
                    <div className="space-y-6 p-4">
                      {filteredTasks.map((task) => (
                        <div className="relative group" key={task.TASK_ID}>
                          {/* Date badge with subtle shadow */}
                          <div className="absolute left-0 ms-[30px] w-12 py-1  -translate-x-8 top-3 hover:shadow-md bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-300 font-medium shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 text-center">
                            {formatDotNetDate(task.ASSIGNED_START_DATE)}
                          </div>
 
                          {/* Animated timeline dot with glow effect */}
                          <div className="absolute left-[53.5px] -translate-x-1 top-6 w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md shadow-blue-400/30 animate-pulse" />
 
                          {/* Task card with hover effects */}
                          <Card className="flex items-start ms-[68px]  bg-white dark:bg-gray-900 gap-4 p-2 transition-all hover:shadow-md group-hover:bg-gradient-to-r group-hover:from-white/50 group-hover:to-white dark:group-hover:from-gray-800/50 dark:group-hover:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-gray-800 mt-1 shadow-sm">
                              <AvatarImage
                                src={
                                  creatorUserImages[task.CREATOR_EMP_NO] ||
                                  DEFAULT_IMAGE
                                }
                                alt={task.CREATED_USER || "User"}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-300 font-medium">
                                {task.CREATED_USER?.charAt(0).toUpperCase() ||
                                  "U"}
                              </AvatarFallback>
                            </Avatar>
 
                            <div className="flex-1 space-y-1 overflow-hidden mt-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className=" overflow-hidden">
                                  <h3 className="font-semibold text-base leading-tight text-sm  truncate text-gray-800 dark:text-gray-100">
                                    {task.CREATED_USER || "Unknown User"}
                                  </h3>
                                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 font-medium">
                                    {task.TASK_NAME || "No title"}
                                  </p>
                                </div>
 
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-xs font-medium bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shrink-0 border-blue-200 dark:border-blue-400/50 text-blue-600 dark:text-blue-300 shadow-sm"
                                >
                                  {formatDotNetDate(task.COMPLETION_DATE)}
                                </Badge>
                              </div>
                            </div>
                            
                          </Card>
                          
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4 shadow-inner">
                        <CalendarDays className="w-8 h-8 text-blue-400 dark:text-blue-300" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">
                        {(startDate || endDate) 
                          ? "No tasks in selected date range"
                          : assignedTo
                          ? "No tasks assigned"
                          : "Select an assignee"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        {assignedTo
                          ? "This user has no tasks for the selected period."
                          : "Choose a team member to view their tasks."}
                      </p>
                      {!assignedTo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 border-blue-300 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          Select Team Member
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                

              </ScrollArea>
                  <div className="text-sm mt-2 text-red-600 flex justify-end">Overdue Task : {overdueTasks}</div>
            </div>
          </div>
        </form>
        
      </Card>
 
  );
};
 
export default CreateTask;