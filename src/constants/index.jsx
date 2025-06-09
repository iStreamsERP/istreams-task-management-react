import { BaggageClaim, ChartColumn, Grid2x2Plus, Headset, Home, MessageCircleQuestion, MonitorCog, NotepadText, Package, PackagePlus, Settings, ShoppingBag, Tags, UserCheck, UserPlus, Users } from "lucide-react";

export const navbarLinks = [
  {
    title: "Task Management",
    links: [
      {
        label: "Dashboard",
        icon: Home,
        path: "/" ,
      },
      {
        label: "Task View ",
        icon: Users,
        path: "/taskview",
      },
      {
        label: "Create Task",
        icon: UserPlus,
        path: "/createTask",
      },
        {
        label: "Calender View",
        icon: PackagePlus,
        path: "/calenderView",
      },
      {
        label: "Chat",
        icon: NotepadText,
        path: "/chat" ,
      },
    ],
    
  },
 
];
