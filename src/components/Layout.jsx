import Navbar from "./Navbar";
import "./Layout.css";

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="layout-main">{children}</div>
      <footer className="layout-footer">
        <p>Bhaichara | Student support platform</p>
      </footer>
    </div>
  );
};

export default Layout;
