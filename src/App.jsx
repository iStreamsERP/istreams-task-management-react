import { ThemeProvider } from "@/components/theme-provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ForgetPasswordPage from "./pages/ForgetPasswordPage";
import LoginFormPage from "./pages/LoginFormPage";
import NotFoundPage from "./pages/NotFoundPage";
import SignUpPage from "./pages/SignUpPage";
import Layout from "./routes/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";
import HomePage from "./pages/HomePage";

import TaskView from "./pages/TaskView";
import CreateTask from "./pages/CreateTask";
import Chat from "./pages/Chat";
import CalendarView from "./pages/CalenderView";
const App = () => {
  const router = createBrowserRouter([
    {
      path: "/login",
      element: <LoginFormPage />,
    },
    {
      path: "/signup",
      element: <SignUpPage />,
    },
    {
      path: "/forgot-password",
      element: <ForgetPasswordPage />,
    },
    {
      path: "/",
      element: <ProtectedRoute />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <HomePage /> },

        
            { path: "/taskview" , element:<TaskView /> },
            { path: "/createTask" , element:<CreateTask /> },
            { path: "/chat" , element:<Chat /> },
            { path: "/calenderView" , element:<CalendarView /> },
          ]
        }
      ],
    },
    {
      path: "*",
      element: <NotFoundPage />,
    },
  ]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
