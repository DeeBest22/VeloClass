import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Pencil,
  FileText,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Calendar,
  Zap,
  MessageSquare,
  PhoneCall,
  Database,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import pfpImage from "@/assets/pfp.png";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createFileRoute } from "@tanstack/react-router";
import BottomNav from '@/components/bottom-nav'


/* ─── Types ─── */
type View = "main" | "editProfile" | "legal" | "faq";

/* ─── Assumed user (no auth system wired up yet) ─── */
const ASSUMED_USER = {
  id: "u1",
  name: "Jordan Okafor",
  firstName: "Jordan",
  username: "jordan.okafor",
  email: "jordan.okafor@example.com",
  profilePicture: pfpImage,
  authProvider: "local",
};

/* ─── FAQ Data ─── */
const faqItems = [
  {
    question: "How do I start a video call?",
    answer: "Tap the 'Call' button on your contact's profile or select them from your contacts list and tap the video camera icon.",
  },
  {
    question: "How do I change my profile picture?",
    answer: "Go to Profile Settings > Edit Profile, then tap on your profile picture to choose a new photo.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, all calls and messages are end-to-end encrypted. Only you and the recipient can see or hear what's sent.",
  },
  {
    question: "How do I reset my password?",
    answer: "Go to Profile Settings > Change Password. Enter your current password, then create a new one.",
  },
  {
    question: "Can I use the app on multiple devices?",
    answer: "Yes, your account syncs across all devices automatically. Simply log in with your credentials.",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from Profile Settings > Manage Subscription. Premium features remain active until the billing period ends.",
  },
];

const termsContent = [
  { heading: "1. Acceptance of Terms", body: "By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement." },
  { heading: "2. Use License", body: "Permission is granted to temporarily download one copy of the materials for personal, non-commercial transitory viewing only." },
  { heading: "3. User Responsibilities", body: "You are responsible for maintaining the confidentiality of your account and password and for restricting access to your device." },
  { heading: "4. Privacy & Data Protection", body: "We are committed to protecting your privacy and handling your data in an open and transparent manner." },
];

const privacyContent = [
  { heading: "Information We Collect", body: "We collect information you provide directly to us, such as when you create an account, make a call, or contact us for support." },
  { heading: "How We Use Your Information", body: "We use the information we collect to provide, maintain, and improve our services, and to protect our users." },
  { heading: "Data Security", body: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access." },
  { heading: "Your Rights", body: "You have the right to access, update, or delete your personal information at any time through your account settings." },
];

/* ─── Animated background orbs ─── */
const BackgroundOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.2, 0.9, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-600/10 blur-[120px]"
    />
    <motion.div
      animate={{ x: [0, -30, 20, 0], y: [0, 30, -20, 0], scale: [1, 0.8, 1.1, 1] }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-40 -left-32 w-64 h-64 rounded-full bg-blue-500/10 blur-[120px]"
    />
    <motion.div
      animate={{ x: [0, 20, -10, 0], y: [0, -20, 30, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-blue-500/8 blur-[100px]"
    />
  </div>
);

/* ─── Avatar (shows profile image, falls back to icon if missing/broken) ─── */
const Avatar = ({
  src,
  name,
  sizeClass,
  iconClass,
}: {
  src?: string | null;
  name?: string;
  sizeClass: string;
  iconClass: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || "Profile"}
        className={`${sizeClass} rounded-full object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center bg-blue-500/[0.08] border border-blue-500/[0.15]`}>
      <User className={`${iconClass} text-blue-600`} strokeWidth={1.5} />
    </div>
  );
};

/* ─── Shared sub-view shell ─── */
const SubViewShell = ({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 60 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -60 }}
    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="min-h-screen bg-[#F5F5F3]"
  >
    <BackgroundOrbs />
    <div className="sticky top-0 z-10 bg-[#F5F5F3]/80 backdrop-blur-2xl px-5 py-4 flex items-center gap-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onBack}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "1px solid rgba(59,130,246,0.22)",
          background: "rgba(59,130,246,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(37,99,235,0.85)",
          WebkitTapHighlightColor: "transparent",
          flexShrink: 0,
        }}
      >
        <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={2.2} />
      </motion.button>
      <h1 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h1>
    </div>
    <div className="relative px-4 py-6 md:px-8 md:py-10 max-w-3xl mx-auto w-full">{children}</div>
  </motion.div>
);

/* ─── Glass Card ─── */
const GlassCard = ({ children, delay: _delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <div className={`bg-white border border-black/[0.06] shadow-sm shadow-black/[0.03] rounded-3xl overflow-hidden ${className}`}>
    {children}
  </div>
);

/* ─── Action row ─── */
interface ActionRowProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  index: number;
  onClick?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
  iconGradient?: string;
}
const ActionRow = ({ icon: Icon, label, sublabel, index: _index, onClick, danger, right, iconGradient }: ActionRowProps) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-4 px-5 py-4 group hover:bg-black/[0.025] transition-all duration-200"
  >
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
      danger
        ? "bg-red-500/10 border border-red-500/20"
        : iconGradient || "bg-gradient-to-br from-blue-500/15 to-blue-500/10 border border-blue-500/10"
    }`}>
      <Icon className={`w-[18px] h-[18px] ${danger ? "text-red-500" : "text-blue-600"}`} strokeWidth={1.8} />
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className={`text-[14px] font-medium leading-none ${danger ? "text-red-500" : "text-slate-800"}`}>{label}</p>
      {sublabel && <p className="text-[12px] text-slate-400 mt-1.5 truncate">{sublabel}</p>}
    </div>
    {right ?? (
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors duration-200" />
    )}
  </motion.button>
);

/* ─── Edit Profile ─── */
const EditProfile = ({ onBack, user }: { onBack: () => void; user: any }) => {
  const [formData, setFormData] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName:  user?.name?.split(" ").slice(1).join(" ") || "",
    username:  user?.username || "",
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
  const [saving, setSaving] = useState(false);

  // No backend yet — simulate an availability check against the assumed local user
  const checkUsername = (raw: string) => {
    const val = raw.replace(/^@/, "").toLowerCase().trim();
    if (!val || val === (user?.username || "")) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_.]{3,30}$/.test(val)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    setTimeout(() => setUsernameStatus("available"), 300);
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) { toast.error("First and last name are required"); return; }
    if (usernameStatus === "taken")    { toast.error("Username already taken"); return; }
    if (usernameStatus === "invalid")  { toast.error("Invalid username format"); return; }
    if (usernameStatus === "checking") { toast.error("Still checking username…"); return; }

    setSaving(true);
    // No backend yet — simulate saving against the assumed local user
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success("Profile updated!");
    onBack();
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(37,99,235,0.22)",
    borderRadius: 0,
    padding: "11px 0",
    fontFamily: "inherit",
    fontSize: 17,
    fontWeight: 500,
    color: "rgba(15,23,42,0.92)",
    outline: "none",
    transition: "border-color 0.22s",
    caretColor: "rgba(37,99,235,0.8)",
    boxSizing: "border-box" as const,
  };
  const fieldDisabledStyle: React.CSSProperties = {
    ...fieldStyle,
    color: "rgba(100,116,139,0.45)",
    cursor: "not-allowed",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(37,99,235,0.55)",
    marginBottom: 6,
  };

  return (
    <>
      <style>{`
        .ep-input::placeholder { color: rgba(100,116,139,0.35); }
        .ep-input:focus { border-bottom-color: rgba(37,99,235,0.65) !important; }
        .ep-input:disabled { opacity: 1; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ minHeight: "100svh", background: "#F5F5F3", fontFamily: "inherit" }}
      >
        <BackgroundOrbs />

        <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", position: "relative", zIndex: 10, paddingTop: "calc(env(safe-area-inset-top, 0px) + 36px)" }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "1px solid rgba(59,130,246,0.22)",
              background: "rgba(59,130,246,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(37,99,235,0.85)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ArrowLeft className="w-[15px] h-[15px]" strokeWidth={2.2} />
          </motion.button>
        </div>

        <div style={{ position: "relative", zIndex: 10, padding: "0 28px", paddingTop: "6vh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)", maxWidth: 560, marginLeft: "auto", marginRight: "auto", width: "100%" }}>

          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}
            style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(37,99,235,0.6)", marginBottom: 10 }}
          >
            Your account
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
            style={{ fontSize: 28, fontWeight: 700, color: "rgba(15,23,42,0.94)", lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 36 }}
          >
            Edit your profile
          </motion.h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.2 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={user?.email || ""} disabled className="ep-input" style={fieldDisabledStyle} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.26 }}>
              <label style={labelStyle}>First Name</label>
              <input
                type="text" value={formData.firstName} placeholder="Your first name"
                onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                className="ep-input" style={fieldStyle} autoComplete="off"
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.32 }}>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text" value={formData.lastName} placeholder="Your last name"
                onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                className="ep-input" style={fieldStyle} autoComplete="off"
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.38 }}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "rgba(100,116,139,0.45)", fontSize: 17, fontWeight: 500, userSelect: "none", pointerEvents: "none" }}>@</span>
                <input
                  type="text" value={formData.username.replace(/^@/, "")} placeholder="username"
                  onChange={(e) => {
                    const val = e.target.value.replace(/^@/, "");
                    setFormData((p) => ({ ...p, username: val }));
                    checkUsername(val);
                  }}
                  className="ep-input"
                  style={{ ...fieldStyle, paddingLeft: 18, paddingRight: 90 }}
                  autoComplete="off" spellCheck={false}
                />
                {formData.username.length > 0 && (
                  <span style={{
                    position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, fontWeight: 600,
                    color: usernameStatus === "available" ? "rgba(5,150,105,0.9)"
                         : usernameStatus === "taken" || usernameStatus === "invalid" ? "rgba(220,38,38,0.9)"
                         : "rgba(37,99,235,0.5)",
                  }}>
                    {usernameStatus === "checking"  ? "checking…"   :
                     usernameStatus === "available" ? "✓ available" :
                     usernameStatus === "taken"     ? "✗ taken"     :
                     usernameStatus === "invalid"   ? "✗ invalid"   : ""}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "rgba(100,116,139,0.55)", marginTop: 8 }}>3–30 chars: letters, numbers, _ or .</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.44 }}
            style={{ marginTop: 44 }}
          >
            <motion.button
              whileTap={{ scale: 0.984 }}
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", height: 54,
                border: "none", borderRadius: 53,
                background: saving ? "rgba(59,130,246,0.12)" : "#3B82F6",
                color: saving ? "rgba(37,99,235,0.4)" : "#EFF6FF",
                fontSize: 15, fontWeight: 600, letterSpacing: "0.01em",
                cursor: saving ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "background 0.2s, color 0.2s",
                WebkitTapHighlightColor: "transparent",
                fontFamily: "inherit",
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(37,99,235,0.5)" }} />
              ) : (
                "Save Changes"
              )}
            </motion.button>
          </motion.div>

        </div>
      </motion.div>
    </>
  );
};

/* ─── Legal View ─── */
const LegalView = ({ onBack }: { onBack: () => void }) => {
  const [tab, setTab] = useState<"terms" | "privacy">("terms");
  const tabs = [
    { key: "terms" as const,   label: "Terms of Use",   icon: Shield   },
    { key: "privacy" as const, label: "Privacy Policy", icon: FileText },
  ];
  const content = { terms: termsContent, privacy: privacyContent };

  return (
    <SubViewShell title="Legal" onBack={onBack}>
      <div className="flex gap-1.5 mb-6 p-1.5 bg-black/[0.03] border border-black/[0.05] rounded-2xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
              tab === key
                ? "bg-white text-blue-600 border border-blue-500/20 shadow-sm shadow-black/[0.04]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={tab === key ? 2 : 1.75} />
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <GlassCard>
            {content[tab].map((s, i) => (
              <div key={i} className={`p-5 ${i < content[tab].length - 1 ? "border-b border-black/[0.05]" : ""}`}>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-800">{s.heading}</h2>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pl-5">{s.body}</p>
              </div>
            ))}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
      <p className="text-[11px] text-slate-400 text-center mt-6">Last updated January 2025</p>
    </SubViewShell>
  );
};

/* ─── FAQ ─── */
const FAQView = ({ onBack }: { onBack: () => void }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <SubViewShell title="Help & FAQ" onBack={onBack}>
      <div className="space-y-3">
        {faqItems.map((item, i) => (
          <GlassCard key={i} delay={0.04 * i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-start justify-between gap-4 p-5 text-left">
              <span className="text-sm font-medium text-slate-800 leading-snug">{item.question}</span>
              <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.3 }}
                className="shrink-0 w-7 h-7 rounded-xl bg-black/[0.03] border border-black/[0.06] flex items-center justify-center mt-0.5">
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div key="answer" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed border-t border-black/[0.05] pt-4">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        ))}
      </div>
      <GlassCard delay={0.3} className="mt-8 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/10 border border-blue-500/10 flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-5 h-5 text-blue-600" />
        </div>
        <p className="text-sm text-slate-500 mb-3">Didn't find what you're looking for?</p>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Contact Support →</button>
      </GlassCard>
    </SubViewShell>
  );
};

/* ─── Helper: open a URL in the native browser or web tab ─── */
const openExternalUrl = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, "_blank");
  }
};

/* ─── MAIN ProfileDesign ─── */
const ProfileDesign = () => {
  const user = ASSUMED_USER;
  const logout = async () => {
    // No auth system yet — this is where a real sign-out call would go
  };
  const [currentView, setCurrentView] = useState<View>("main");
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const canDelete = deleteConfirmText.trim().toUpperCase() === "DELETE";

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out successfully");
    setShowLogout(false);
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) return;
    // No backend yet — simulate deleting the assumed local user
    await logout();
    toast.success("Your account has been permanently deleted");
    setShowDelete(false);
  };

  // ─── Opens this app's notification settings via the native plugin in MainActivity.java ───
  const handleNotifPress = async () => {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === "android") {
        try {
          // Calls NotificationSettingsPlugin.open() registered in MainActivity.java
          await (Capacitor as any).Plugins.NotificationSettings.open();
        } catch {
          toast.info("Go to Settings → Apps → ConvoSpace → Notifications");
        }
      } else if (platform === "ios") {
        try {
          await CapApp.openUrl({ url: "app-settings:" });
        } catch {
          toast.info("Go to Settings → Notifications → ConvoSpace");
        }
      }
    } else {
      toast.info("Open your device Settings → Notifications to manage alerts.");
    }
  };

  if (currentView === "editProfile")
    return <EditProfile onBack={() => setCurrentView("main")} user={user} />;
  if (currentView === "legal")
    return <LegalView onBack={() => setCurrentView("main")} />;
  if (currentView === "faq")
    return <FAQView onBack={() => setCurrentView("main")} />;

  return (
    <>
      <style>{`html, body { background-color: #F5F5F3; }`}</style>
      <div className="min-h-screen bg-[#F5F5F3] text-slate-900">
        <BackgroundOrbs />
        <div className="relative max-w-md md:max-w-2xl lg:max-w-4xl mx-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}>

          {/* ── HERO SECTION ── */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/[0.08] via-transparent to-transparent pointer-events-none" />

            <div className="relative px-6 md:px-10 lg:px-12 pb-8 md:pb-12" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)" }}>

              {/* ── Settings menu — top right ── */}
              <div className="absolute right-4 z-20" style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account settings"
                  className="relative flex items-center gap-2 pl-3 pr-3.5 h-9 rounded-full transition-all duration-300"
                  style={{
                    background: menuOpen ? "rgba(59,130,246,0.14)" : "rgba(0,0,0,0.045)",
                    border: menuOpen ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: menuOpen ? "0 0 0 3px rgba(59,130,246,0.08)" : "0 2px 10px rgba(0,0,0,0.06)",
                  }}
                >
                  <span className="flex flex-col gap-[3.5px] items-end">
                    <span className="block h-[1.75px] w-[14px] rounded-full bg-slate-700" />
                    <span className="block h-[1.75px] w-[10px] rounded-full bg-slate-500" />
                    <span className="block h-[1.75px] w-[12px] rounded-full bg-slate-600" />
                  </span>
                  <motion.span
                    animate={{ rotate: menuOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex items-center"
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke={menuOpen ? "#2563eb" : "#64748b"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.34, 1.1, 0.64, 1] }}
                        className="absolute right-0 top-11 z-20 w-64"
                        style={{
                          background: "linear-gradient(160deg, rgba(255,255,255,0.99) 0%, rgba(250,250,249,0.99) 100%)",
                          backdropFilter: "blur(32px)",
                          WebkitBackdropFilter: "blur(32px)",
                          borderRadius: "22px",
                          border: "1px solid rgba(0,0,0,0.06)",
                          boxShadow: "0 24px 64px -8px rgba(0,0,0,0.14), 0 4px 20px -4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
                          overflow: "hidden",
                        }}
                      >
                        {/* User identity header */}
                        <div className="px-4 pt-4 pb-3.5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.055)" }}>
                          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-black/10 shrink-0">
                            <Avatar src={user?.profilePicture} name={user?.name} sizeClass="w-9 h-9" iconClass="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 leading-none truncate">{user?.name || ""}</p>
                            <p className="text-[11px] text-slate-400 mt-1 leading-none truncate">{user?.email || ""}</p>
                          </div>
                        </div>

                        {/* Sign Out */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setMenuOpen(false); setShowLogout(true); }}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 group hover:bg-black/[0.03]"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.08))", border: "1px solid rgba(249,115,22,0.18)" }}>
                            <LogOut className="w-[15px] h-[15px] text-orange-500" strokeWidth={1.9} />
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-[13.5px] font-semibold text-slate-800 leading-none">Sign Out</p>
                            <p className="text-[11px] text-slate-400 mt-1 leading-none">Log out of your account</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </motion.button>

                        <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />

                        {/* Delete Account */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setMenuOpen(false); setShowDelete(true); }}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 mb-1.5 transition-colors duration-150 group hover:bg-red-500/[0.04]"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.13), rgba(220,38,38,0.07))", border: "1px solid rgba(239,68,68,0.16)" }}>
                            <Trash2 className="w-[15px] h-[15px] text-red-500" strokeWidth={1.9} />
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-[13.5px] font-semibold text-red-500 leading-none">Delete Account</p>
                            <p className="text-[11px] text-slate-400 mt-1 leading-none">Permanently remove all data</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500/50 transition-colors" />
                        </motion.button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Avatar */}
              <div className="mb-5 w-fit">
                <div className="relative">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden ring-2 ring-white shadow-md shadow-black/[0.06]">
                    <Avatar
                      src={user?.profilePicture}
                      name={user?.name}
                      sizeClass="w-24 h-24 md:w-32 md:h-32"
                      iconClass="w-10 h-10 md:w-14 md:h-14"
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
              </div>

              {/* Identity */}
              <div className="mb-4">
                <h1 className="text-[26px] md:text-[34px] font-bold text-slate-900 tracking-tight leading-none mb-2">
                  {user?.name || ""}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-medium">
                    {user?.username ? `@${user.username}` : `@${(user?.name || "user").replace(/\s+/g, "").toLowerCase()}`}
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-7">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/[0.06] rounded-2xl">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-slate-500 font-medium">
                    Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded-2xl">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-semibold">Active</span>
                </div>
              </div>

              {/* Edit Profile button */}
              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCurrentView("editProfile")}
                  className="w-full md:w-auto md:px-8 h-12 md:h-13 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                >
                  <Pencil className="w-4 h-4" strokeWidth={2} />
                  Edit Profile
                </motion.button>
              </div>
            </div>
          </div>

          {/* ── CONTENT SECTIONS ── */}
          <div className="px-5 md:px-10 lg:px-12 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 mt-2">

            {/* Preferences */}
            <GlassCard delay={0.55}>
              <div className="px-5 pt-4 pb-1">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Preferences</p>
              </div>
              <ActionRow
                icon={Bell}
                label="Notifications"
                sublabel="Push, email and in-app alerts"
                index={0}
                onClick={handleNotifPress}
                iconGradient="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/10"
              />
            </GlassCard>

            {/* Legal & Support */}
            <GlassCard delay={0.65}>
              <div className="px-5 pt-4 pb-1">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Legal & Support</p>
              </div>
              <ActionRow
                icon={FileText}
                label="Terms & Privacy"
                sublabel="Terms of use and privacy policy"
                index={1}
                onClick={() => openExternalUrl("https://convospace.net/terms")}
                iconGradient="bg-gradient-to-br from-sky-500/15 to-cyan-500/10 border border-sky-500/10"
              />
              <ActionRow
                icon={HelpCircle}
                label="Help & FAQ"
                sublabel="Answers and support"
                index={2}
                onClick={() => openExternalUrl("https://convospace.net/help")}
                iconGradient="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/10"
              />
            </GlassCard>

          </div>
        </div>

        {/* ── Sign out dialog ── */}
        <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
          <AlertDialogContent
            onPointerDownOutside={() => setShowLogout(false)}
            onEscapeKeyDown={() => setShowLogout(false)}
            className="max-w-[320px] rounded-[28px] bg-white border-black/[0.08] shadow-2xl shadow-black/10 p-0 gap-0 overflow-hidden"
          >
            <div className="px-6 pt-8 pb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-14 h-14 mx-auto mb-5"
              >
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-md" />
                <div className="relative w-14 h-14 rounded-full bg-blue-500/[0.08] border border-blue-500/20 flex items-center justify-center">
                  <LogOut className="w-[22px] h-[22px] text-blue-600" strokeWidth={1.8} />
                </div>
              </motion.div>
              <AlertDialogHeader className="gap-2">
                <AlertDialogTitle className="text-center text-slate-900 text-[17px] font-semibold">
                  Sign out{user?.username ? ` of @${user.username}` : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-slate-500 text-[13px] leading-relaxed px-1">
                  Everything stays right where you left it — just log back in to pick up your messages and calls.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <AlertDialogFooter className="flex-col sm:flex-col gap-0 border-t border-black/[0.06]">
              <AlertDialogCancel className="w-full h-[50px] m-0 rounded-none bg-transparent border-0 text-slate-900 font-semibold text-[15px] shadow-none hover:bg-black/[0.03] hover:text-slate-900">
                Stay signed in
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="w-full h-[50px] rounded-none bg-transparent border-0 border-t border-black/[0.06] text-orange-600/90 font-medium text-[15px] shadow-none hover:bg-orange-500/[0.06] hover:text-orange-600"
              >
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Delete account dialog ── */}
        <AlertDialog
          open={showDelete}
          onOpenChange={(open) => {
            setShowDelete(open);
            if (!open) setDeleteConfirmText("");
          }}
        >
          <AlertDialogContent
            onPointerDownOutside={() => { setShowDelete(false); setDeleteConfirmText(""); }}
            onEscapeKeyDown={() => { setShowDelete(false); setDeleteConfirmText(""); }}
            className="max-w-[360px] rounded-[28px] bg-white border-black/[0.08] shadow-2xl shadow-black/10 p-0 gap-0 overflow-hidden"
          >
            <div className="px-6 pt-8 pb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative w-14 h-14 mx-auto mb-5"
              >
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-red-500/25"
                />
                <div className="relative w-14 h-14 rounded-full bg-red-500/[0.08] border border-red-500/25 flex items-center justify-center">
                  <Trash2 className="w-[22px] h-[22px] text-red-500" strokeWidth={1.8} />
                </div>
              </motion.div>

              <AlertDialogHeader className="gap-2">
                <AlertDialogTitle className="text-center text-slate-900 text-[17px] font-semibold">
                  Delete your account
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-slate-500 text-[13px] leading-relaxed px-1">
                  This can't be undone. You'll permanently lose:
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Consequence list */}
              <div className="mt-4 space-y-1.5">
                {[
                  { icon: MessageSquare, label: "Every message and conversation" },
                  { icon: PhoneCall, label: "Your call history" },
                  { icon: Database, label: "Profile, contacts and saved data" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.08]">
                    <Icon className="w-[15px] h-[15px] text-red-500/80 shrink-0" strokeWidth={1.8} />
                    <span className="text-[12.5px] text-slate-600">{label}</span>
                  </div>
                ))}
              </div>

              {/* Type-to-confirm */}
              <div className="mt-5">
                <label className="block text-center text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-black/[0.02] border border-black/[0.08] focus:border-red-500/40 rounded-2xl px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none text-center font-semibold tracking-[0.15em] transition-colors"
                />
              </div>
            </div>

            <AlertDialogFooter className="flex-col sm:flex-col gap-0 border-t border-black/[0.06]">
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={!canDelete}
                className={`w-full h-[50px] m-0 rounded-none border-0 shadow-none font-semibold text-[15px] transition-colors ${
                  canDelete
                    ? "bg-red-500/[0.1] text-red-600 hover:bg-red-500/[0.18]"
                    : "bg-transparent text-slate-300 cursor-not-allowed hover:bg-transparent hover:text-slate-300"
                }`}
              >
                Delete forever
              </AlertDialogAction>
              <AlertDialogCancel className="w-full h-[50px] m-0 rounded-none bg-transparent border-0 border-t border-black/[0.06] text-slate-600 font-medium text-[15px] shadow-none hover:bg-black/[0.03] hover:text-slate-900">
                Keep my account
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    
      </div>
    </>
  );
};

export const Route = createFileRoute("/profile")({
  component: ProfileDesign,
});

export default ProfileDesign;