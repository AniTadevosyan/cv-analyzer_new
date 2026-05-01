import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, FileSearch, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { authStore } from "@/lib/api";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/analyze", label: "Analyze" },
  { to: "/parameters", label: "Parameters" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/results", label: "Results" },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(authStore.user);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    authStore.clear();
    setUser(null);
    navigate("/auth");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <FileSearch className="h-4 w-4 text-primary-foreground" />
          </div>
          CVAnalyzer
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{link.label}</Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (<><span className="max-w-[130px] truncate text-sm text-muted-foreground">{user.full_name}</span><Button variant="outline" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</Button></>) : (<Link to="/auth"><Button variant="outline">Login / Sign up</Button></Link>)}
          <Link to="/analyze"><Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">Start Analyzing</Button></Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      <AnimatePresence>
        {open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border bg-card md:hidden"><div className="container flex flex-col gap-1 py-4">{navLinks.map((link) => (<Link key={link.to} to={link.to} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"}`}>{link.label}</Link>))}{user ? <Button variant="outline" onClick={logout} className="mt-2 w-full">Logout</Button> : <Link to="/auth" onClick={() => setOpen(false)}><Button variant="outline" className="mt-2 w-full">Login / Sign up</Button></Link>}<Link to="/analyze" onClick={() => setOpen(false)} className="mt-2"><Button className="w-full gradient-primary text-primary-foreground">Start Analyzing</Button></Link></div></motion.div>)}
      </AnimatePresence>
    </nav>
  );
};
export default Navbar;
