import { useState, useEffect } from "react";
import { format, eachDayOfInterval, isEqual, parseISO } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const TaskCalendarView = ({ 
  startDate, 
  endDate, 
  userTasks, 
  assignedUserName, 
  assignedUserImage 
}) => {
  const [calendarView, setCalendarView] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [tasksByDate, setTasksByDate] = useState({});
  const DEFAULT_IMAGE = "/api/placeholder/40/40";

  // Convert .NET date format to JavaScript Date
  const convertDotNetDateToJSDate = (dotNetDateString) => {
    if (!dotNetDateString) return null;
    const timestampMatch = dotNetDateString.match(/\/Date\((\d+)\)\//);
    if (!timestampMatch) return null;
    
    const timestamp = parseInt(timestampMatch[1], 10);
    return new Date(timestamp);
  };

  // Format date for display
  const formatDate = (date) => {
    return format(date, "dd MMM yyyy");
  };

  // Generate date range when start and end dates change
  useEffect(() => {
    if (startDate && endDate) {
      const dates = eachDayOfInterval({
        start: startDate,
        end: endDate
      });
      setDateRange(dates);
    } else {
      setDateRange([]);
    }
  }, [startDate, endDate]);

  // Group tasks by date
  useEffect(() => {
    if (dateRange.length > 0 && userTasks && userTasks.length > 0) {
      const taskMap = {};
      
      // Initialize each date with empty array
      dateRange.forEach(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        taskMap[dateStr] = [];
      });
      
      // Group tasks by their start date
      userTasks.forEach(task => {
        const taskDate = convertDotNetDateToJSDate(task.ASSIGNED_START_DATE);
        if (taskDate) {
          const dateStr = format(taskDate, "yyyy-MM-dd");
          if (taskMap[dateStr]) {
            taskMap[dateStr].push(task);
          }
        }
      });
      
      setTasksByDate(taskMap);
    } else {
      setTasksByDate({});
    }
  }, [dateRange, userTasks]);

  // Toggle between list and calendar views
  const toggleView = () => {
    setCalendarView(!calendarView);
  };

  if (!startDate || !endDate) {
    return (
      <Card className="w-full bg-white dark:bg-gray-900 border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <CardTitle className="text-lg mb-2">Select Date Range</CardTitle>
          <CardDescription>Please select both start and end dates to view tasks</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white dark:bg-gray-900 border shadow-sm">
      <CardHeader className="px-6 pt-6 pb-2">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-xl font-semibold">
            Task Calendar
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleView}
          >
            {calendarView ? "List View" : "Calendar View"}
          </Button>
        </div>
        <CardDescription>
          {assignedUserName ? `Tasks for ${assignedUserName} from ${formatDate(startDate)} to ${formatDate(endDate)}` : "Please select a user"}
        </CardDescription>
      </CardHeader>

      {calendarView ? (
        <CardContent className="px-6 py-4">
          <Calendar
            mode="range"
            selected={{
              from: startDate,
              to: endDate
            }}
            className="border rounded-md p-3"
            fixedWeeks
          />
          <div className="mt-4 border rounded-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b">
              <h3 className="font-medium">Task Summary</h3>
            </div>
            <div className="p-3">
              <ul className="space-y-2">
                {Object.entries(tasksByDate).map(([dateStr, tasks]) => (
                  <li key={dateStr} className="flex justify-between">
                    <span>{format(parseISO(dateStr), "dd MMM")}</span>
                    <Badge variant={tasks.length ? "default" : "outline"}>
                      {tasks.length || "No"} task{tasks.length !== 1 ? "s" : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="px-3 py-3">
          <div className="space-y-6">
            {dateRange.map((date, index) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const tasks = tasksByDate[dateStr] || [];
              
              return (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b flex justify-between items-center">
                    <h3 className="font-medium">{format(date, "EEEE, dd MMMM yyyy")}</h3>
                    <Badge variant={tasks.length ? "default" : "outline"}>
                      {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <div key={task.TASK_ID} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={assignedUserImage} alt={assignedUserName} />
                              <AvatarFallback>
                                {assignedUserName?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h4 className="font-medium text-sm">{task.TASK_NAME || "Untitled Task"}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {task.COMPLETION_DATE ? format(convertDotNetDateToJSDate(task.COMPLETION_DATE), "dd MMM") : "No due date"}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                Created by: {task.CREATED_USER || "Unknown"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                          <CalendarDays className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No tasks available</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          There are no tasks scheduled for this date
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default TaskCalendarView;