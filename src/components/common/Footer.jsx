import React from "react";

const Footer = () => {
  return (
    <footer className="bg-white shadow-md transition-colors dark:bg-slate-900 text-sm text-center p-4">
      <aside>
        <p>
          Copyright © {new Date().getFullYear()}{" "}
          <span className="font-semibold">iStreams Cloud</span>. Designed with
          by ❤️ All rights reserved
        </p>
      </aside>
    </footer>
  );
};

export default Footer;
