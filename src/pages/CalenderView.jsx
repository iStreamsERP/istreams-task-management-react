import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, addDays, isSameDay, isWithinInterval, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, isSameMonth, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { getUserTasks } from "@/services/taskService";
import { getEmployeeImage } from "@/services/employeeService";
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Default image for user avatars
const DEFAULT_IMAGE = "/assets/default-avatar.png";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({
    currentUserName: "",
    currentUserLogin: "",
    clientURL: ""
  });
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  
  // Fetch user data on component mount
  useEffect(() => {
    // Get user data from localStorage or context
    const storedUserData = JSON.parse(localStorage.getItem('userData')) || {
      currentUserName: sessionStorage.getItem('currentUserName') || "",
      currentUserLogin: sessionStorage.getItem('currentUserLogin') || "",
      clientURL: sessionStorage.getItem('clientURL') || ""
    };
    
    setUserData(storedUserData);
  }, []);

  // Fetch tasks when userData is available
  useEffect(() => {
    if (userData.currentUserLogin && userData.clientURL) {
      fetchTasks();
    }
  }, [userData]);

  // Convert fetched tasks to events when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const loadTasksWithImages = async () => {
        setIsLoading(true);
        try {
          const taskEvents = await Promise.all(tasks.map(async task => {
            // Parse date from "/Date(timestamp)/" format
            const parseJsonDate = (jsonDate) => {
              if (!jsonDate) return new Date();
              
              // Handle the "/Date(1737811560000)/" format
              if (typeof jsonDate === 'string' && jsonDate.includes('/Date(')) {
                const timestamp = parseInt(jsonDate.replace(/\/Date\((\d+)\)\//g, '$1'), 10);
                return new Date(timestamp);
              }
              
              return new Date(jsonDate);
            };

            const startDate = parseJsonDate(task.ASSIGNED_START_DATE);
            const endDate = parseJsonDate(task.ASSIGNED_COMPLETION_DATE) || addDays(startDate, 1);
            
            // Calculate duration in days
            const duration = differenceInDays(endDate, startDate) + 1;
            
            // Fetch employee image
            const imageData = await getEmployeeImage(
              task.CREATOR_EMP_NO,
              userData.currentUserLogin,
              userData.clientURL
            );

            return {
              ...task,
              START_DATE: startDate,
              END_DATE: endDate,
              DURATION: duration,
              id: `${task.TASK_ID}`,
              assignedEmpImage: imageData
                ? `data:image/jpeg;base64,${imageData}`
                : DEFAULT_IMAGE,
            };
          }));
          
          setEvents(taskEvents);
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to load task images", error);
          setIsLoading(false);
        }
      };
      
      loadTasksWithImages();
    }
  }, [tasks, userData]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const SelectUser = { UserName: userData.currentUserName };
      const res = await getUserTasks(
        SelectUser,
        userData.currentUserLogin,
        userData.clientURL
      );

      const loginUsername = userData.currentUserLogin;

      const updatedTasks = res.map((tdata) => {
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
          PROJECT: tdata.PROJECT || "General", // Ensure PROJECT field exists
        };
      });

      setTasks(updatedTasks);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setError("Failed to load tasks. Please try again later.");
      setIsLoading(false);
    }
  };

  // Navigation functions
  const navigateCalendar = (direction) => {
    if (view === 'week') {
      setCurrentDate(addDays(currentDate, direction * 7));
    } else if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() + direction, currentDate.getMonth(), 1));
    }
  };
 
  // Helper function for colors based on task duration
  const getTaskColor = (event) => {
    const duration = event.DURATION || 1;
    
    // Define 6 different color schemes based on task duration
    const durationColors = {
      // 1-2 days
      short1: { bg: 'rgba(191, 219, 254, 0.8)'},  // Light blue
      // 3-5 days
      medium2: { bg: 'rgba(167, 243, 208, 0.8)'},  // Light green
      // 6-10 days
      long1: { bg: 'rgba(253, 224, 71, 0.8)' },  // Light yellow
      // 11-15 days
      long2: { bg: 'rgba(252, 165, 165, 0.8)'},  // Light red
      // 16-30 days
      medium1: { bg: 'rgba(216, 180, 254, 0.8)' },  // Light purple
      // 30+ days
      short2: { bg: 'rgba(253, 186, 116, 0.8)' }   // Light orange
    };
    
    // Select color based on duration range
    let colorKey;
    if (duration <= 2) {
      colorKey = 'short1';
    } else if (duration <= 5) {
      colorKey = 'medium1';
    } else if (duration <= 10) {
      colorKey = 'long1';
    } else if (duration <= 15) {
      colorKey = 'short2';
    } else if (duration <= 30) {
      colorKey = 'medium2';
    } else {
      colorKey = 'long2';
    }
    
    // Get color based on duration
    return durationColors[colorKey];
  };

  // Navigate to task view handler
  const handleTaskClick = (taskId) => {
    navigate(`/taskview?taskId=${taskId}`);
  };

  // User avatar component for task
  const TaskAvatar = ({ username, userImage }) => {
    return (
      <Avatar className="h-4 w-4 mr-1">
        <AvatarImage
          src={userImage || DEFAULT_IMAGE}
          alt={username || "User"}
        />
        <AvatarFallback className="text-[8px]">
          {username ? username.charAt(0).toUpperCase() : "U"}
        </AvatarFallback>
      </Avatar>
    );
  };
 
  // Render functions for different views
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysFromPrevMonth = firstDay === 0 ? 6 : firstDay - 1;
    const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
    const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);
    const days = [];
 
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth; i > 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i + 1));
    }
 
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
 
    // Next month days
    for (let i = 1; i <= daysFromNextMonth; i++) {
      days.push(new Date(year, month + 1, i));
    }
 
    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border">
        {days.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, new Date());
          const dayEvents = events.filter(event => {
            try {
              return isWithinInterval(date, {
                start: event.START_DATE,
                end: event.END_DATE
              });
            } catch (error) {
              console.error("Date interval error:", error, event);
              return false;
            }
          });
 
          return (
            <div
              key={index}
              className={cn(
                "bg-background p-2 h-32 flex flex-col",
                !isCurrentMonth && "text-muted-foreground/50",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <div className={cn(
                "self-end flex items-center justify-center w-6 h-6 rounded-full text-sm",
                isToday && "bg-primary text-primary-foreground font-medium"
              )}>
                {date.getDate()}
              </div>
             
              <div className="flex-1 mt-1 overflow-y-auto space-y-1">
                {dayEvents.map((event, i) => {
                  const taskColor = getTaskColor(event);
                  return (
                    <div
                      key={i}
                      className="text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: taskColor.bg,
                      }}
                      onClick={() => handleTaskClick(event.TASK_ID)}
                    >
                      <TaskAvatar 
                        username={event.ASSIGNED_USER} 
                        userImage={event.assignedEmpImage}
                      />
                      <span className="truncate">{event.TASK_INFO || event.TASK_NAME}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
 
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate)
    });
 
    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border">
        {weekDays.map((date, index) => {
          const isToday = isSameDay(date, new Date());
          const dayEvents = events.filter(event => {
            try {
              return (
                isSameDay(date, event.START_DATE) ||
                isSameDay(date, event.END_DATE) ||
                isWithinInterval(date, {
                  start: event.START_DATE,
                  end: event.END_DATE
                })
              );
            } catch (error) {
              console.error("Date interval error:", error, event);
              return false;
            }
          });
 
          return (
            <div
              key={index}
              className={cn(
                "bg-background p-2 h-48 flex flex-col",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-sm font-medium",
                  isToday && "text-primary"
                )}>
                  {format(date, 'EEE')}
                </span>
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-sm",
                  isToday && "bg-primary text-primary-foreground"
                )}>
                  {date.getDate()}
                </span>
              </div>
             
              <div className="flex-1 mt-2 overflow-y-auto space-y-1">
                {dayEvents.map((event, i) => {
                  const taskColor = getTaskColor(event);
                  return (
                    <div
                      key={i}
                      className="text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: taskColor.bg,
                      }}
                      onClick={() => handleTaskClick(event.TASK_ID)}
                    >
                      <TaskAvatar 
                        username={event.ASSIGNED_USER} 
                        userImage={event.assignedEmpImage}
                      />
                      <span className="truncate">{event.TASK_INFO || event.TASK_NAME}</span>
                      {event.NEW_STATUS && (
                        <span className="ml-auto text-xs opacity-80">{event.NEW_STATUS}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
 
  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
 
    return (
      <div className="grid grid-cols-3 gap-4">
        {months.map((monthDate, index) => {
          const monthEvents = events.filter(event => {
            try {
              return (
                isSameMonth(event.START_DATE, monthDate) ||
                isSameMonth(event.END_DATE, monthDate)
              );
            } catch (error) {
              console.error("Date interval error:", error, event);
              return false;
            }
          });
 
          return (
            <div key={index} className="border rounded-lg p-3">
              <h3 className="font-medium text-center mb-2">
                {format(monthDate, 'MMMM')}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-xs text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="font-medium">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {eachDayOfInterval({
                  start: startOfWeek(monthDate),
                  end: endOfWeek(new Date(year, index, new Date(year, index + 1, 0).getDate()))
                }).map((date, i) => {
                  const isCurrentMonth = isSameMonth(date, monthDate);
                  const isToday = isSameDay(date, new Date());
                  const hasEvent = events.some(event => {
                    try {
                      return (
                        isSameDay(date, event.START_DATE) ||
                        isSameDay(date, event.END_DATE)
                      );
                    } catch (error) {
                      return false;
                    }
                  });
 
                  return (
                    <div
                      key={i}
                      className={cn(
                        "h-5 flex items-center justify-center rounded",
                        !isCurrentMonth && "text-muted-foreground/30",
                        isToday && "bg-primary text-primary-foreground rounded-full",
                        hasEvent && "bg-green-100 dark:bg-green-900/50 rounded-full"
                      )}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
              {monthEvents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {monthEvents.slice(0, 3).map((event, i) => {
                    const taskColor = getTaskColor(event);
                    return (
                      <div
                        key={i}
                        className="text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: taskColor.bg,
                        }}
                        onClick={() => handleTaskClick(event.TASK_ID)}
                      >
                        <TaskAvatar 
                          username={event.ASSIGNED_USER} 
                          userImage={event.assignedEmpImage}
                        />
                        <span className="truncate">{event.TASK_INFO || event.TASK_NAME}</span>
                      </div>
                    );
                  })}
                  {monthEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{monthEvents.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
 
  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="flex flex-col space-y-4 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight">
             <div className="flex items-center space-x-3">
                       <Avatar className="h-10 w-10">
                         <AvatarImage
                           src={userData.currentUserImageData}
                           alt={userData.currentUserName}
                         />
                         <AvatarFallback className="bg-blue-500 text-white font-medium">
                           {userData.currentUserName.charAt(0).toUpperCase()}
                         </AvatarFallback>
                       </Avatar>
                       <span className="font-medium text-gray-800 dark:text-gray-100">
                         {userData.currentUserName}
                       </span>
                     </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoading && <span className="text-sm text-muted-foreground">Loading tasks...</span>}
            {error && <span className="text-sm text-red-500">{error}</span>}
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} disabled={isLoading}>
              Today
            </Button>
          </div>
        </div>
       
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateCalendar(-1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
              <div className="ml-2 text-lg font-medium">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
              {view === 'year' && format(currentDate, 'yyyy')}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateCalendar(1)}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          
          </div>
         
          <Tabs value={view} onValueChange={(value) => setView(value)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
     
      <CardContent className="p-6" ref={calendarRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <Tabs value={view} className="w-full">
            <TabsContent value="week">{renderWeekView()}</TabsContent>
            <TabsContent value="month">{renderMonthView()}</TabsContent>
            <TabsContent value="year">{renderYearView()}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}