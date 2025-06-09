import {
  ClipboardListIcon,
  FileSearch,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import LogoDark from "../../assets/logo-dark.png";
import LogoLight from "../../assets/logo-light.png";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen }) => {
  const { theme } = useAuth();
  return (
    <aside
      className={`bg-white shadow-md transition-colors dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 ${isOpen ? "w-full max-w-48" : "w-0 overflow-hidden"
        } min-h-screen`}
    >

      {/* Logo Container */}
      <div className="flex items-center justify-center h-16 shadow">
        <img
          src={theme === "dark" ? LogoDark : LogoLight}
          alt="iStreams ERP Solutions"
          className="object-cover"
        />
      </div>

      <div className="px-2">
        {/* Navigation Menu */}

        <ul className="menu menu-md w-full p-0">
          <li className="menu-title text-xs">MENU</li>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm rounded-full py-2 px-4 mb-2 ${isActive ? "active " : ""
                }`
              }
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/my-team"
              className={({ isActive }) =>
                `text-sm rounded-full py-2 px-4 mb-2 ${isActive ? "active" : ""
                }`
              }
            >
              <Users className="h-5 w-5" />
              My Team
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/category-view"
              className={({ isActive }) =>
                `text-sm rounded-full py-2 px-4 mb-2 ${isActive ? "active" : ""
                }`
              }
            >
              <LayoutGrid className="h-5 w-5" />
              Category View
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/document-list"
              className={({ isActive }) =>
                `text-sm  rounded-full py-2 px-4 mb-2 ${isActive ? "active" : ""
                }`
              }
            >
              <FileText className="h-5 w-5" />
              Document List
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/document-view"
              className={({ isActive }) =>
                `text-sm rounded-full py-2 px-4 mb-2 ${isActive ? "active" : ""
                }`
              }
            >
              <FileSearch className="h-5 w-5" />
              Document View
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/task-view"
              className={({ isActive }) =>
                `text-sm rounded-full py-2 px-4 mb-2 ${isActive ? "active" : ""
                }`
              }
            >
              <ClipboardListIcon className="h-5 w-5" />
              Task View
            </NavLink>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
