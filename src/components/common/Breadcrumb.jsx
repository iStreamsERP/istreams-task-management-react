import React from "react";
import { Link, useLocation } from "react-router-dom";

const Breadcrumb = () => {
  const location = useLocation();

  // Define custom names for specific routes
  const breadcrumbNames = {
    "my-team": "My Team",
    "category-view": "Category View",
    "document-list": "Document List",
    "document-view": "Document View",
    "task-view": "Task View",
    // Add more as needed
  };

  // Function to generate breadcrumb items from the current path
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter((path) => path);
    let pathUrl = "";

    return paths.map((path, index) => {
      pathUrl += `/${path}`;
      const isLast = index === paths.length - 1;

      // Check if a custom name exists, otherwise use the original path
      const breadcrumbName = breadcrumbNames[path] || path.replace("-", " ");

      return (
        <li key={path}>
          {!isLast ? (
            <Link to={pathUrl}>{breadcrumbName}</Link>
          ) : (
            <span>{breadcrumbName}</span>
          )}
        </li>
      );
    });
  };

  return (
    <div className="flex items-end justify-between flex-wrap gap-3 mb-5 ">
      <h1 className="text-3xl font-medium">
        {breadcrumbNames[location.pathname.split("/").pop()] ||
          location.pathname.split("/").pop()?.replace("-", " ") ||
          "Dashboard"}
      </h1>
      <div className="breadcrumbs text-sm">
        <ul className="flex gap-2">
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          {generateBreadcrumbs()}
        </ul>
      </div>
    </div>
  );
};

export default Breadcrumb;
